import { cp, mkdir, rm, symlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
    type Alias,
    type Logger,
    type PluginOption,
    type Rollup,
    type ViteDevServer,
    build,
    createLogger,
    createServer,
} from 'vite'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'

import tailwindMerge, {
    type PluginUpdate,
    type TailwindMergeOptions,
    type TailwindMergePluginApi,
} from '../src/index'

export const RUNTIME_SPECIFIER = '@tailwind-merge/vite/runtime'

export const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
export const fixturesDirectory = path.join(testsDirectory, 'fixtures')
export const packageDirectory = path.resolve(testsDirectory, '..')
export const workspaceRoot = path.resolve(testsDirectory, '../../..')

// The servers and builds these tests spawn resolve tailwind-merge to the library source, since dist/ may not be built — mirroring this package's vitest.config.mts. The runtime subpath deliberately has no alias: an alias consumes the specifier before any plugin's resolveId runs, which would bypass the plugin's redirect (a user aliasing the subpath disables the plugin — correct Vite semantics, but not what is under test here). Instead, the fixtures get a real node_modules symlink to this package, resolving exactly like an installed project.
export const libraryAliases = [
    {
        find: 'tailwind-merge/unstable-do-not-import',
        replacement: path.join(workspaceRoot, 'packages/tailwind-merge/src/unstable-do-not-import.ts'),
    },
    {
        find: 'tailwind-merge',
        replacement: path.join(workspaceRoot, 'packages/tailwind-merge/src/index.ts'),
    },
]

/** Links this package into the fixtures' node_modules (absolute target so fixture copies keep resolving; ignored by git like any node_modules). Idempotent, so parallel test files can all run it. */
export async function linkFixtures(): Promise<void> {
    for (const fixture of ['app', 'no-tailwind', 'consumer-types', 'monorepo/apps/web']) {
        const scopeDirectory = path.join(fixturesDirectory, fixture, 'node_modules', '@tailwind-merge')
        await mkdir(scopeDirectory, { recursive: true })
        await symlink(packageDirectory, path.join(scopeDirectory, 'vite')).catch(() => {})
    }
}

export interface ServerOptions {
    /** Options for the plugin under test. */
    options?: TailwindMergeOptions
    /** Plugins to run before the plugin under test, e.g. `tailwindcss()` for coexistence and pruning scenarios. */
    plugins?: PluginOption[]
    /** Collects the plugin's own log lines (`[@tailwind-merge/vite] …`) when given; the server stays silent otherwise. */
    logs?: string[]
    /** Project aliases combined with the test library aliases. */
    aliases?: Alias[]
}

export interface BuildOptions extends ServerOptions {
    /** Vite `build` options merged over the defaults (`write: false`, no minification). */
    build?: Record<string, unknown>
}

/**
 * Registers the hooks every plugin test file needs — fixture links before the file's tests, server and temp-directory cleanup after each test — and returns the harness functions bound to that cleanup. Called once at the top of a test file.
 */
export function setupPluginTests() {
    let activeServer: ViteDevServer | undefined
    const temporaryDirectories: string[] = []
    // Vite's dependency-optimizer cache lives next to the closest package.json by default — this package's own node_modules for every fixture — and parallel test files racing over that one directory fail with ENOTEMPTY while the optimizer swaps it. One cache directory per test file (worker) instead, inside tests/ so the global setup sweeps leftovers.
    const cacheDirectory = path.join(testsDirectory, `.tmp-vite-cache-${process.pid}`)

    beforeAll(linkFixtures)
    afterEach(async () => {
        await activeServer?.close()
        activeServer = undefined
        await Promise.all(
            temporaryDirectories
                .splice(0)
                .map((directory) => rm(directory, { recursive: true, force: true })),
        )
    })
    afterAll(() => rm(cacheDirectory, { recursive: true, force: true }))

    /** Starts a dev server with the plugin under test on `root`. Middleware mode needs no HTTP server, and `ws: false` drops the WebSocket server too, so test files run in parallel without fighting over an HMR port; the plugin tolerates the missing socket (its reload sends are best-effort). */
    async function startServer(
        root: string,
        { options, plugins = [], logs, aliases = [] }: ServerOptions = {},
    ) {
        const plugin = tailwindMerge(options)
        activeServer = await createServer({
            root,
            configFile: false,
            cacheDir: cacheDirectory,
            ...(logs ? { customLogger: captureLogger(logs) } : { logLevel: 'silent' }),
            plugins: [...plugins, plugin],
            resolve: { alias: [...aliases, ...libraryAliases] },
            server: { middlewareMode: true, ws: false },
        })
        return { server: activeServer, plugin }
    }

    /**
     * Copies a fixture into a temp directory inside tests/ (not the OS temp dir) so `@import 'tailwindcss'` still resolves through this package's node_modules, mirroring the configurator's CLI test setup.
     *
     * The copy is nested one level below the temp directory, with the `@tailwind-merge/vite` symlink placed at the temp directory's level instead of inside the copy: the temp directory is gitignored, and Tailwind's scanner switches its ignore rules off for sources inside ignored paths (so `@source` can point into node_modules), which would otherwise make it follow the symlink into this whole package. Kept outside the Vite root, the symlink still resolves for the fixture's imports and stays out of every scan.
     */
    async function copyFixture(name: string): Promise<string> {
        const temporaryDirectory = path.join(testsDirectory, `.tmp-${name.replace(/\//g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
        temporaryDirectories.push(temporaryDirectory)
        const directory = path.join(temporaryDirectory, name)
        await cp(path.join(fixturesDirectory, name), directory, {
            recursive: true,
            filter: (source) => !source.includes(`${path.sep}node_modules`),
        })
        const scopeDirectory = path.join(temporaryDirectory, 'node_modules', '@tailwind-merge')
        await mkdir(scopeDirectory, { recursive: true })
        await symlink(packageDirectory, path.join(scopeDirectory, 'vite'))
        return directory
    }

    return { startServer, copyFixture }
}

/** Builds a fixture with the plugin under test, returning the emitted JavaScript, the raw output entries (for CSS assets), and the plugin's log lines (the build itself stays silent). */
export async function buildFixture(
    root: string,
    { options, plugins = [], logs = [], aliases = [], build: buildOptions = {} }: BuildOptions = {},
) {
    const result = await build({
        root,
        configFile: false,
        customLogger: captureLogger(logs),
        plugins: [...plugins, tailwindMerge(options)],
        resolve: { alias: [...aliases, ...libraryAliases] },
        build: { write: false, minify: false, ...buildOptions },
    })
    const output = (Array.isArray(result) ? result[0] : result) as {
        output: { type: string; code?: string; source?: string | Uint8Array; fileName: string }[]
    }
    const code = output.output
        .filter((chunk) => chunk.type === 'chunk')
        .map((chunk) => chunk.code)
        .join('\n')
    return { code, output: output.output, lines: logs }
}

/** A silent Vite logger that collects only the plugin's own lines — Vite's build progress goes through the same logger. */
function captureLogger(lines: string[]): Logger {
    const logger = createLogger('silent')
    for (const level of ['info', 'warn', 'error'] as const) {
        logger[level] = (message: string) => {
            if (message.startsWith('[@tailwind-merge/vite]')) {
                lines.push(message)
            }
        }
    }
    return logger
}

/** Resolves once the dev server's file watcher has picked up `file` — `createServer` returns before the watcher's initial scan has finished, so an edit made right away could go unnoticed. */
export async function waitForWatcher(server: ViteDevServer, file: string): Promise<void> {
    await vi.waitFor(
        () => {
            const watched = server.watcher.getWatched()[path.dirname(file)] ?? []
            expect(watched).toContain(path.basename(file))
        },
        { timeout: 5_000, interval: 20 },
    )
}

/**
 * Performs an edit and resolves with what the plugin did in reaction: the updates it reports through its api, combined into one (`regenerated`/`reloaded` true when any update in the batch had them). Combining matters because file watchers can deliver one save as several events spaced further apart than the plugin's debounce, so one edit may come out as a reload followed by a no-op re-scan; the batch ends after a quiet window longer than the debounce.
 */
export function updateAfter(
    plugin: { api: TailwindMergePluginApi },
    edit: () => Promise<void>,
): Promise<PluginUpdate> {
    return new Promise((resolve) => {
        let combined: PluginUpdate | undefined
        let quietTimer: ReturnType<typeof setTimeout> | undefined
        const unsubscribe = plugin.api.onUpdate((update) => {
            combined = combined
                ? {
                      trigger: combined.trigger,
                      regenerated: combined.regenerated || update.regenerated,
                      reloaded: combined.reloaded || update.reloaded,
                  }
                : update
            clearTimeout(quietTimer)
            quietTimer = setTimeout(() => {
                unsubscribe()
                resolve(combined!)
            }, 250)
        })
        void edit()
    })
}

/** Whether the built output contains `value` as a string literal, whichever quote style the bundler printed. */
export function hasLiteral(code: string, value: string): boolean {
    return new RegExp(`["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(code)
}

/** Waits for a real watch cycle's END event, subscribing before an optional edit so its outcome cannot be missed. Bundle and error events arrive before the cycle finishes; closing their results releases resources without stopping the watcher. */
export function nextWatchBuild(watcher: Rollup.RollupWatcher, edit?: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
        let buildError: unknown
        const onEvent = async (event: Rollup.RollupWatcherEvent) => {
            try {
                if (event.code === 'ERROR') {
                    buildError = event.error
                    await event.result?.close()
                } else if (event.code === 'BUNDLE_END') {
                    await event.result.close()
                } else if (event.code === 'END') {
                    watcher.off('event', onEvent)
                    if (buildError) {
                        reject(buildError)
                    } else {
                        resolve()
                    }
                }
            } catch (error) {
                watcher.off('event', onEvent)
                reject(error)
            }
        }
        watcher.on('event', onEvent)
        void edit?.().catch((error: unknown) => {
            watcher.off('event', onEvent)
            reject(error)
        })
    })
}
