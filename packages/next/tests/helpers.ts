import { type ChildProcess, spawn } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach } from 'vitest'

import { type TailwindMergeOptions } from '../src/options.ts'

export const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
export const fixturesDirectory = path.join(testsDirectory, 'fixtures')
export const packageDirectory = path.resolve(testsDirectory, '..')
export const workspaceRoot = path.resolve(testsDirectory, '../../..')

/** Next.js is driven through its CLI in a child process, the way users run it: the plugin's loader executes inside the bundlers' own loader processes, which no in-process API would exercise. */
const nextBin = path.join(packageDirectory, 'node_modules', 'next', 'dist', 'bin', 'next')

export interface RunOptions {
    /** Options for the plugin under test, handed to the fixture's next.config through the environment. */
    options?: TailwindMergeOptions
    /** Run Next.js with webpack instead of the default Turbopack. */
    webpack?: boolean
}

export interface DevServer {
    port: number
    /** Everything the process has written to stdout and stderr so far, for assertions on the plugin's log lines. */
    output(): string
    /** Fetches a page's rendered HTML. */
    fetch(pathname: string): Promise<string>
    /** Fetches the browser JavaScript a page loads, concatenated, to check what the client compilation served. */
    fetchClientChunks(pathname: string): Promise<string>
    stop(): Promise<void>
}

/**
 * Registers the hooks every plugin test file needs — dev-server and temp-directory cleanup after each test — and returns the harness functions bound to that cleanup. Called once at the top of a test file.
 */
export function setupNextTests() {
    const temporaryDirectories: string[] = []
    const servers: DevServer[] = []

    afterEach(async () => {
        await Promise.all(servers.splice(0).map((server) => server.stop()))
        await Promise.all(
            temporaryDirectories
                .splice(0)
                .map((directory) =>
                    rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }),
                ),
        )
    })

    /**
     * Copies a fixture into a temp directory inside tests/ (not the OS temp dir): Next.js, React, and Tailwind resolve through this package's node_modules from there, and Turbopack, which refuses to resolve files outside the project root it infers from the nearest lockfile, sees the workspace root and everything below it.
     *
     * The copy is nested one level below the temp directory, with the `@tailwind-merge/next` symlink placed at the temp directory's level instead of inside the copy: the temp directory is gitignored, and Tailwind's scanner switches its ignore rules off for sources inside ignored paths, which would otherwise make it follow the symlink into this whole package. Kept outside the project directory, the symlink still resolves for the fixture's imports and stays out of every scan.
     */
    async function copyFixture(name: string): Promise<string> {
        const temporaryDirectory = path.join(
            testsDirectory,
            `.tmp-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        )
        temporaryDirectories.push(temporaryDirectory)
        const directory = path.join(temporaryDirectory, name)
        await cp(path.join(fixturesDirectory, name), directory, { recursive: true })
        const scopeDirectory = path.join(temporaryDirectory, 'node_modules', '@tailwind-merge')
        await mkdir(scopeDirectory, { recursive: true })
        await symlink(packageDirectory, path.join(scopeDirectory, 'next'))
        return directory
    }

    /** Starts `next dev` on a free port for the fixture copy at `root` and resolves once the index route has rendered. */
    async function startDev(
        root: string,
        { options = {}, webpack = false }: RunOptions = {},
    ): Promise<DevServer> {
        const port = await freePort()
        const url = `http://localhost:${port}`
        const process_ = spawnNext(
            root,
            ['dev', '--port', String(port), ...(webpack ? ['--webpack'] : [])],
            options,
        )
        const server: DevServer = {
            port,
            output: process_.output,
            async fetch(pathname) {
                return (await fetch(url + pathname)).text()
            },
            async fetchClientChunks(pathname) {
                const html = await server.fetch(pathname)
                const chunkPaths = new Set(
                    [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)].map(
                        (match) => match[1] as string,
                    ),
                )
                const chunks = await Promise.all(
                    [...chunkPaths].map((chunkPath) => server.fetch(chunkPath)),
                )
                return chunks.join('\n')
            },
            stop: process_.stop,
        }
        servers.push(server)

        const deadline = Date.now() + 90_000
        while (Date.now() < deadline) {
            if (process_.exitCode() !== undefined) {
                throw new Error(
                    `next dev exited with code ${process_.exitCode()} before serving:\n${process_.output()}`,
                )
            }
            try {
                const response = await fetch(url + '/')
                if (response.status === 200) {
                    return server
                }
            } catch {
                // Not listening yet.
            }
            await sleep(250)
        }
        throw new Error(`next dev did not serve ${url} in time:\n${process_.output()}`)
    }

    return { copyFixture, startDev }
}

/** Runs `next build` for the fixture copy at `root`; the exit code and output are returned rather than thrown so tests can assert on failed builds. */
export async function buildFixture(
    root: string,
    { options = {}, webpack = false }: RunOptions = {},
): Promise<{ code: number | null; output: string }> {
    const process_ = spawnNext(root, ['build', ...(webpack ? ['--webpack'] : [])], options)
    const code = await process_.exit
    return { code, output: process_.output() }
}

/** Fails with the build's output when it did not succeed, so the assertion carries Next.js's own error listing. */
export function expectSuccessfulBuild({
    code,
    output,
}: {
    code: number | null
    output: string
}): void {
    if (code !== 0) {
        throw new Error(`next build exited with code ${code}:\n${output}`)
    }
}

/** Reads a file of a fixture copy's build output, given relative to `.next/`. */
export function readBuildFile(root: string, file: string): Promise<string> {
    return readFile(path.join(root, '.next', file), 'utf8')
}

/** All browser JavaScript a build emitted, concatenated: both bundlers write it below `.next/static`, webpack nested by route. */
export async function readClientChunks(root: string): Promise<string> {
    const directory = path.join(root, '.next', 'static')
    const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => path.join(entry.parentPath, entry.name))
    return (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n')
}

/** Whether the built output contains `value` as a string literal, whichever quote style the bundler printed. */
export function hasLiteral(code: string, value: string): boolean {
    return new RegExp(`["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(code)
}

export function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * Spawns the Next.js CLI in its own process group so `stop` can end the CLI, the dev server it forks, and the loader pool processes Turbopack spawns in one signal. The fixture's environment carries the plugin options for the fixture config.
 */
function spawnNext(root: string, args: string[], options: TailwindMergeOptions) {
    const environment: NodeJS.ProcessEnv = {
        ...process.env,
        // Vitest's NODE_ENV=test would make Next.js warn about a non-standard value; give each command the value it would set itself.
        NODE_ENV: args[0] === 'dev' ? 'development' : 'production',
        TWM_OPTIONS: JSON.stringify(options),
        NEXT_TELEMETRY_DISABLED: '1',
    }
    const child: ChildProcess = spawn(process.execPath, [nextBin, ...args], {
        cwd: root,
        env: environment,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks: string[] = []
    child.stdout?.on('data', (chunk: Buffer) => chunks.push(String(chunk)))
    child.stderr?.on('data', (chunk: Buffer) => chunks.push(String(chunk)))
    let exitCode: number | null | undefined
    const exit = new Promise<number | null>((resolve) => {
        child.on('exit', (code) => {
            exitCode = code
            resolve(code)
        })
    })

    return {
        exit,
        exitCode: () => exitCode,
        output: () => chunks.join(''),
        async stop() {
            if (exitCode !== undefined) {
                return
            }
            signal(child.pid!, 'SIGTERM')
            await Promise.race([
                exit,
                sleep(10_000).then(() => {
                    signal(child.pid!, 'SIGKILL')
                    return exit
                }),
            ])
        },
    }
}

/** Signals the whole process group; a group that already ended is not an error. */
function signal(pid: number, signalName: NodeJS.Signals) {
    try {
        process.kill(-pid, signalName)
    } catch {
        // Already gone.
    }
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer()
        probe.once('error', reject)
        probe.listen(0, '127.0.0.1', () => {
            const address = probe.address()
            probe.close(() => {
                if (address && typeof address === 'object') {
                    resolve(address.port)
                } else {
                    reject(new Error('Could not allocate a free port'))
                }
            })
        })
    })
}
