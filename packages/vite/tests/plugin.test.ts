import { execFile } from 'node:child_process'
import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import tailwindcss from '@tailwindcss/vite'
import { type PluginOption, type ViteDevServer, build, createLogger, createServer } from 'vite'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'

import { discoverCssRoot } from '../src/discovery'
import tailwindMerge, { type TailwindMergeOptions } from '../src/index'
import { autoDetectBases, resolvePruneOptions } from '../src/prune-options'
import * as fallbackRuntime from '../src/runtime'

const RUNTIME_SPECIFIER = '@tailwind-merge/vite/runtime'

const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
const fixturesDirectory = path.join(testsDirectory, 'fixtures')
const packageDirectory = path.resolve(testsDirectory, '..')
const workspaceRoot = path.resolve(testsDirectory, '../../..')

// The servers spawned by these tests resolve tailwind-merge to the library source, since dist/ may not be built — mirroring this package's vitest.config.mts. The runtime subpath deliberately has no alias: an alias consumes the specifier before any plugin's resolveId runs, which would bypass the plugin's redirect (a sharp edge worth knowing about — a user aliasing the subpath disables the plugin). Instead, the fixtures get a real node_modules symlink to this package, resolving exactly like an installed project.
const libraryAliases = [
    {
        find: 'tailwind-merge/unstable-do-not-import',
        replacement: path.join(workspaceRoot, 'packages/tailwind-merge/src/unstable-do-not-import.ts'),
    },
    {
        find: 'tailwind-merge',
        replacement: path.join(workspaceRoot, 'packages/tailwind-merge/src/index.ts'),
    },
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

async function startServer(
    root: string,
    options?: TailwindMergeOptions,
    leadingPlugins: PluginOption[] = [],
) {
    activeServer = await createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [...leadingPlugins, tailwindMerge(options)],
        resolve: { alias: libraryAliases },
        // Middleware mode needs no HTTP server; the fixed HMR port keeps parallel test runs from racing over the default one.
        server: { middlewareMode: true, hmr: { port: 24799 } },
    })
    return activeServer
}

/** Builds a fixture with the plugin, returning the emitted JavaScript and the plugin's log lines (the build itself stays silent). */
async function buildFixture(
    root: string,
    options?: TailwindMergeOptions,
    buildOptions: Record<string, unknown> = {},
    leadingPlugins: PluginOption[] = [],
) {
    const lines: string[] = []
    const logger = createLogger('silent')
    for (const level of ['info', 'warn', 'error'] as const) {
        logger[level] = (message: string) => {
            // Only the plugin's own lines; Vite's build progress goes through the same logger.
            if (message.startsWith('[@tailwind-merge/vite]')) {
                lines.push(message)
            }
        }
    }
    const result = await build({
        root,
        configFile: false,
        customLogger: logger,
        plugins: [...leadingPlugins, tailwindMerge(options)],
        resolve: { alias: libraryAliases },
        build: { write: false, minify: false, ...buildOptions },
    })
    const output = (Array.isArray(result) ? result[0] : result) as {
        output: { type: string; code?: string }[]
    }
    const code = output.output
        .filter((chunk) => chunk.type === 'chunk')
        .map((chunk) => chunk.code)
        .join('\n')
    return { code, lines }
}

/**
 * Copies a fixture into a temp directory inside tests/ (not the OS temp dir) so `@import 'tailwindcss'` still resolves through this package's node_modules, mirroring the configurator's CLI test setup.
 *
 * The copy is nested one level below the temp directory, with the `@tailwind-merge/vite` symlink placed at the temp directory's level instead of inside the copy: the temp directory is gitignored, and Tailwind's scanner switches its ignore rules off for sources inside ignored paths (so `@source` can point into node_modules), which would otherwise make it follow the symlink into this whole package. Kept outside the Vite root, the symlink still resolves for the fixture's imports and stays out of every scan.
 */
async function copyFixture(name: string): Promise<string> {
    const temporaryDirectory = path.join(testsDirectory, `.tmp-${name}-${Date.now()}`)
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

test('the client pipeline resolves the subpath to the virtual module', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'))
    const transformed = await server.transformRequest('/main.ts')

    // Vite encodes the \0 virtual prefix as __x00__ when rewriting client imports — the presence proves the client environment served the generated module, not the on-disk fallback.
    expect(transformed?.code).toContain('__x00__@tailwind-merge/vite/runtime')
})

test('coexists with @tailwindcss/vite in dev', async () => {
    const server = await startServer(path.join(fixturesDirectory, 'app'), undefined, [
        tailwindcss(),
    ])

    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')

    // Tailwind's own pipeline keeps working next to the plugin: the compiled stylesheet carries the utilities scanned from the fixture source and the custom theme variable.
    const css = await server.transformRequest('/app.css')
    expect(css?.code).toContain('text-sm')
    expect(css?.code).toContain('--text-huge')
})

test('coexists with @tailwindcss/vite in build', async () => {
    const result = await build({
        root: path.join(fixturesDirectory, 'app'),
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindcss(), tailwindMerge()],
        resolve: { alias: libraryAliases },
        build: { write: false, minify: false },
    })

    const output = (Array.isArray(result) ? result[0] : result) as {
        output: { type: string; code?: string; source?: string | Uint8Array; fileName: string }[]
    }
    const js = output.output
        .filter((chunk) => chunk.type === 'chunk')
        .map((chunk) => chunk.code)
        .join('\n')
    expect(js).toContain('huge')
    expect(js).not.toContain('getDefaultConfig')

    const cssAsset = output.output.find(
        (entry) => entry.type === 'asset' && entry.fileName.endsWith('.css'),
    )
    expect(String(cssAsset?.source)).toContain('text-sm')
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

test('vite build prunes the generated module to the classes found in the sources and says so', async () => {
    // With @tailwindcss/vite in the plugin list, automatic source detection starts at the Vite root — the common setup, and the one that keeps this package's own sources (full of class-name literals) out of the scan.
    const { code, lines } = await buildFixture(path.join(fixturesDirectory, 'app'), undefined, {}, [
        tailwindcss(),
    ])

    // The used font-size value survives; a group no source uses (`sr-only`) is gone; the build says what happened.
    expect(code).toContain('huge')
    expect(hasLiteral(code, 'sr-only')).toBe(false)
    expect(lines).toEqual([
        expect.stringMatching(
            /Pruned the tailwind-merge config to \d+ of \d+ class groups from the \d+ classes found in your sources/,
        ),
    ])
})

test('prune: false keeps the full config in builds, prune.log silences the report', async () => {
    const full = await buildFixture(path.join(fixturesDirectory, 'app'), { prune: false }, {}, [
        tailwindcss(),
    ])
    expect(hasLiteral(full.code, 'sr-only')).toBe(true)
    expect(full.lines).toEqual([])

    const quiet = await buildFixture(
        path.join(fixturesDirectory, 'app'),
        { prune: { log: false } },
        {},
        [tailwindcss()],
    )
    expect(hasLiteral(quiet.code, 'sr-only')).toBe(false)
    expect(quiet.lines).toEqual([])
})

test('library builds keep the full config unless pruning is forced', async () => {
    const lib = { entry: 'main.ts', formats: ['es'], fileName: 'lib' }
    const library = await buildFixture(path.join(fixturesDirectory, 'app'), undefined, { lib }, [
        tailwindcss(),
    ])
    expect(hasLiteral(library.code, 'sr-only')).toBe(true)
    expect(library.lines).toEqual([expect.stringContaining('Library build')])

    const forced = await buildFixture(path.join(fixturesDirectory, 'app'), { prune: true }, { lib }, [
        tailwindcss(),
    ])
    expect(hasLiteral(forced.code, 'sr-only')).toBe(false)
})

test('safelisted classes and sources outside the Vite root are part of the pruned config', async () => {
    const root = await copyFixture('app')
    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss';\n@source inline('underline');\n\n@theme {\n    --text-huge: 2.5rem;\n}\n",
    )
    const { code } = await buildFixture(root, undefined, {}, [tailwindcss()])
    // No file uses `underline`; the safelist keeps it — and proves pruning happened because its siblings are gone.
    expect(hasLiteral(code, 'underline')).toBe(true)
    expect(hasLiteral(code, 'overline')).toBe(false)

    // The monorepo fixture registers a package outside the Vite root via @source; its classes count as used.
    const monorepo = await buildFixture(
        path.join(fixturesDirectory, 'monorepo', 'apps', 'web'),
        undefined,
        {},
        [tailwindcss()],
    )
    expect(hasLiteral(monorepo.code, 'widest')).toBe(true)
    expect(hasLiteral(monorepo.code, 'sr-only')).toBe(false)
})

test('dev serves the full config by default and the pruned one with prune.dev', async () => {
    const full = await startServer(path.join(fixturesDirectory, 'app'))
    const fullRuntime = await full.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(Object.keys(fullRuntime.getConfig().classGroups)).toEqual(
        expect.arrayContaining(['sr', 'font-size']),
    )
    await full.close()

    const pruned = await startServer(path.join(fixturesDirectory, 'app'), { prune: { dev: true } }, [
        tailwindcss(),
    ])
    const prunedRuntime = await pruned.ssrLoadModule(RUNTIME_SPECIFIER)
    const classGroups = Object.keys(prunedRuntime.getConfig().classGroups)
    expect(classGroups).toContain('font-size')
    expect(classGroups).not.toContain('sr')
    // The classes the fixture uses merge exactly like under the full config.
    expect(prunedRuntime.twMerge('text-huge text-sm')).toBe('text-sm')
})

test('with prune.dev, a class-usage change regenerates and reloads, an unrelated edit does not', async () => {
    const root = await copyFixture('app')
    const server = await startServer(root, { prune: { dev: true } }, [tailwindcss()])
    await new Promise((resolve) => setTimeout(resolve, 500))

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // No source uses padding classes yet, so they pass through.
    expect(before.twMerge('p-2 p-4')).toBe('p-2 p-4')

    await writeFile(
        path.join(root, 'main.ts'),
        "import './app.css'\nimport { twMerge } from '@tailwind-merge/vite/runtime'\n\ndocument.body.className = twMerge('text-huge text-sm p-4')\n",
    )
    let after: Record<string, unknown> | undefined
    await vi.waitFor(
        async () => {
            const loaded = await server.ssrLoadModule(RUNTIME_SPECIFIER)
            expect(loaded.twMerge('p-2 p-4')).toBe('p-4')
            after = loaded
        },
        { timeout: 10_000, interval: 300 },
    )

    // Same classes, different text: the re-scan finds no change in used classes, so nothing regenerates.
    await writeFile(
        path.join(root, 'main.ts'),
        "import './app.css'\nimport { twMerge } from '@tailwind-merge/vite/runtime'\n\n// a comment\ndocument.body.className = twMerge('text-huge text-sm p-4')\n",
    )
    await new Promise((resolve) => setTimeout(resolve, 3_000))
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(after)
}, 30_000)

test('encoding: exact reaches the generated config', async () => {
    const compact = await startServer(path.join(fixturesDirectory, 'app'))
    const compactRuntime = await compact.ssrLoadModule(RUNTIME_SPECIFIER)
    // 7xl is not a radius value, but matches compact's t-shirt-size pattern.
    expect(compactRuntime.twMerge('rounded-md rounded-7xl')).toBe('rounded-7xl')
    await compact.close()

    const exact = await startServer(path.join(fixturesDirectory, 'app'), { encoding: 'exact' })
    const exactRuntime = await exact.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(exactRuntime.twMerge('rounded-md rounded-7xl')).toBe('rounded-md rounded-7xl')
})

test('the prune option resolves against the command and library mode', () => {
    const resolved = (option: TailwindMergeOptions['prune'], lib: unknown, command = 'build') =>
        resolvePruneOptions(option, { build: { lib }, command } as never)

    expect(resolved(undefined, false)).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
    expect(resolved(undefined, { entry: 'x' })).toEqual({ build: false, dev: false, log: true, libraryDefault: true })
    expect(resolved(undefined, { entry: 'x' }, 'serve').libraryDefault).toBe(false)
    expect(resolved(true, { entry: 'x' })).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
    expect(resolved(false, false)).toEqual({ build: false, dev: false, log: false, libraryDefault: false })
    expect(resolved({ dev: true, log: false }, false)).toEqual({ build: true, dev: true, log: false, libraryDefault: false })
    expect(resolved({ build: true }, { entry: 'x' })).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
})

test('automatic source detection starts where the Tailwind integration in use starts', () => {
    const withVitePlugin = { root: '/repo/apps/web', plugins: [{ name: '@tailwindcss/vite:scan' }] } as never
    expect(autoDetectBases(withVitePlugin)).toEqual(['/repo/apps/web'])

    // Without @tailwindcss/vite (PostCSS setups default to the working directory), the root and the working directory are both scanned, nested ones collapsing into the outer.
    const cwd = process.cwd()
    expect(autoDetectBases({ root: cwd, plugins: [] } as never)).toEqual([cwd])
    expect(autoDetectBases({ root: path.join(cwd, 'apps', 'web'), plugins: [] } as never)).toEqual([cwd])
    expect(autoDetectBases({ root: '/somewhere/else', plugins: [] } as never).sort()).toEqual(
        ['/somewhere/else', cwd].sort(),
    )
})

/** Whether the built output contains `value` as a string literal, whichever quote style the bundler printed. */
function hasLiteral(code: string, value: string): boolean {
    return new RegExp(`["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(code)
}
