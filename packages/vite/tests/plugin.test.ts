import { execFile } from 'node:child_process'
import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { type ViteDevServer, build, createServer } from 'vite'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'

import { discoverCssRoot } from '../src/discovery'
import tailwindMerge, { type TailwindMergeOptions } from '../src/index'
import * as fallbackRuntime from '../src/runtime'

const RUNTIME_SPECIFIER = '@tailwind-merge/vite/runtime'

const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
const fixturesDirectory = path.join(testsDirectory, 'fixtures')
const packageDirectory = path.resolve(testsDirectory, '..')
const workspaceRoot = path.resolve(testsDirectory, '../../..')

// The servers spawned by these tests resolve tailwind-merge to the library source, since dist/ may not be built — mirroring scripts/vitest.config.mts. The runtime subpath deliberately has no alias: an alias consumes the specifier before any plugin's resolveId runs, which would bypass the plugin's redirect (a sharp edge worth knowing about — a user aliasing the subpath disables the plugin). Instead, the fixtures get a real node_modules symlink to this package, resolving exactly like an installed project.
const libraryAliases = [
    {
        find: 'tailwind-merge/unstable-do-not-import',
        replacement: path.join(workspaceRoot, 'src/unstable-do-not-import.ts'),
    },
    { find: 'tailwind-merge', replacement: path.join(workspaceRoot, 'src/index.ts') },
]

beforeAll(async () => {
    for (const fixture of ['app', 'no-tailwind', 'consumer-types', 'monorepo/apps/web']) {
        const scopeDirectory = path.join(fixturesDirectory, fixture, 'node_modules', '@tailwind-merge')
        await mkdir(scopeDirectory, { recursive: true })
        // Absolute target so fixture copies keep resolving; ignored by git like any node_modules.
        await symlink(packageDirectory, path.join(scopeDirectory, 'vite')).catch(() => {})
    }
})

let activeServer: ViteDevServer | undefined
const temporaryDirectories: string[] = []

afterEach(async () => {
    await activeServer?.close()
    activeServer = undefined
    await Promise.all(
        temporaryDirectories
            .splice(0)
            .map((directory) => rm(directory, { recursive: true, force: true })),
    )
})

async function startServer(root: string, options?: TailwindMergeOptions) {
    activeServer = await createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindMerge(options)],
        resolve: { alias: libraryAliases },
        // Middleware mode needs no HTTP server; the fixed HMR port keeps parallel test runs from racing over the default one.
        server: { middlewareMode: true, hmr: { port: 24799 } },
    })
    return activeServer
}

/** Copies a fixture into a temp directory inside tests/ (not the OS temp dir) so `@import 'tailwindcss'` still resolves through this package's node_modules, mirroring the configurator's CLI test setup. */
async function copyFixture(name: string): Promise<string> {
    const directory = path.join(testsDirectory, `.tmp-${name}-${Date.now()}`)
    temporaryDirectories.push(directory)
    await cp(path.join(fixturesDirectory, name), directory, { recursive: true })
    return directory
}

test('serves a generated twMerge through the runtime subpath', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    // --text-huge makes text-huge a font size; the generated config resolves the conflict with text-sm.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
    // The default config misreads text-huge as a text color (issue #684) and keeps both — the difference the plugin exists for, and proof the redirect served the generated module.
    expect(fallbackRuntime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    // Non-theme behavior stays intact.
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
})

test('the explicit css option pins the entrypoint', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'), { css: 'app.css' })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
})

test('the virtual module mirrors the runtime surface', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(Object.keys(runtime).sort()).toEqual(Object.keys(fallbackRuntime).sort())
})

test('extendTailwindMerge extends the generated config, not the default one', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    const extended = runtime.extendTailwindMerge((config: unknown) => config)
    expect(extended('text-huge text-sm')).toBe('text-sm')
})

test('without a Tailwind root the subpath falls back to default behavior', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'no-tailwind'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(runtime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
})

test('a theme change regenerates, invalidates, and changes merge behavior', async () => {
    const root = await copyFixture('app')
    const server = await startServer(root)
    // The watcher may not have finished its initial scan when createServer resolves; give it a moment so the edit below is seen.
    await new Promise((resolve) => setTimeout(resolve, 500))

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n    --text-big: 2rem;\n}\n",
    )

    await vi.waitFor(
        async () => {
            const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
            expect(runtime.twMerge('text-big text-sm')).toBe('text-sm')
        },
        { timeout: 10_000, interval: 300 },
    )
}, 20_000)

test('a theme-irrelevant edit regenerates without invalidating (the stability gate)', async () => {
    const root = await copyFixture('app')
    const server = await startServer(root)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n\n/* a comment that changes the file but not the theme */\n",
    )
    // Long enough for watcher latency, the debounce, and the regeneration itself on this tiny fixture.
    await new Promise((resolve) => setTimeout(resolve, 3_000))

    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // Same module instance: the regenerated output hashed identically, so nothing was invalidated and a browser would not have reloaded.
    expect(after).toBe(before)
}, 20_000)

test('vite build inlines the generated module', async () => {
    const result = await build({
        root: path.join(fixturesDirectory, 'app'),
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindMerge()],
        resolve: { alias: libraryAliases },
        build: { write: false, minify: false },
    })

    const output = (Array.isArray(result) ? result[0] : result) as {
        output: { type: string; code?: string }[]
    }
    const code = output.output
        .filter((chunk) => chunk.type === 'chunk')
        .map((chunk) => chunk.code)
        .join('\n')

    expect(code).toContain('createTailwindMerge')
    // The generated font-size scale enumerates the custom theme value — proof the build served the generated module, not the fallback.
    expect(code).toContain('huge')
    // The default config never enters the bundle (getDefaultConfig would only appear via the fallback module).
    expect(code).not.toContain('getDefaultConfig')
})

test('theme files outside the Vite root regenerate on change (monorepo)', async () => {
    const monorepo = await copyFixture('monorepo')
    const server = await startServer(path.join(monorepo, 'apps', 'web'))
    await new Promise((resolve) => setTimeout(resolve, 500))

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // The theme value comes from a file outside the Vite root and already configures the merge.
    expect(before.twMerge('text-huge text-sm')).toBe('text-sm')
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    // Vite's watcher only covers the root by default; the plugin registers out-of-root dependencies explicitly. This edit must still trigger regeneration.
    await writeFile(
        path.join(monorepo, 'theme', 'tokens.css'),
        '@theme {\n    --text-huge: 2.5rem;\n    --text-big: 2rem;\n}\n',
    )

    await vi.waitFor(
        async () => {
            const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
            expect(runtime.twMerge('text-big text-sm')).toBe('text-sm')
        },
        { timeout: 10_000, interval: 300 },
    )
}, 20_000)

test('a consumer project type-checks the runtime subpath without configuration', async () => {
    const fixture = path.join(fixturesDirectory, 'consumer-types')
    const tscBin = path.join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc')

    // On failure the assertion diff carries tsc's error listing.
    const output = await promisify(execFile)(process.execPath, [tscBin, '-p', fixture]).then(
        () => '',
        (error: { stdout?: string; stderr?: string }) =>
            `${error.stdout ?? ''}${error.stderr ?? ''}`,
    )
    expect(output).toBe('')
}, 30_000)

test('discovery picks the import-graph top among marker files', async () => {
    await expect(
        discoverCssRoot(path.join(fixturesDirectory, 'multi-root-resolved')),
    ).resolves.toBe(path.join(fixturesDirectory, 'multi-root-resolved', 'main.css'))
})

test('discovery reports ambiguous roots instead of guessing', async () => {
    await expect(discoverCssRoot(path.join(fixturesDirectory, 'ambiguous'))).rejects.toThrow(
        'multiple Tailwind CSS roots',
    )
})
