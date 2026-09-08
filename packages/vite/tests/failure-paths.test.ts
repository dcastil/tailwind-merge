import { mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Rollup, build } from 'vite'
import { describe, expect, test } from 'vitest'

import tailwindMerge from '../src/index'
import { dependenciesChanged, generateRuntimeModule } from '../src/generation'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    hasLiteral,
    libraryAliases,
    nextWatchBuild,
    setupPluginTests,
    updateAfter,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

const GOOD_CSS = "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n"
// A plugin Tailwind cannot resolve fails the design-system load — the shape of a broken CSS root the plugin must survive.
const BROKEN_CSS = "@import 'tailwindcss';\n@plugin './missing-plugin.js';\n"

test.each([true, false])('a build fails on a missing CSS entrypoint (runtime imported: %s)', async (importsRuntime) => {
    const root = await copyFixture('app')
    if (!importsRuntime) {
        await writeFile(path.join(root, 'main.ts'), 'document.body.textContent = "No runtime import"\n')
    }

    await expect(buildFixture(root, { options: { css: 'missing.css' } }).then(() => undefined)).rejects.toThrow('missing.css')
})

test('a build fails when its CSS configuration cannot be loaded', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), BROKEN_CSS)

    // No Tailwind Vite plugin: this must fail because merge-config generation rejected the CSS, not because Tailwind's own build failed first.
    await expect(buildFixture(root).then(() => undefined)).rejects.toThrow('missing-plugin.js')
})

test('a watch rebuild fails on generation errors and recovers after the CSS is fixed', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const watcher = await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindMerge({ prune: false })],
        resolve: { alias: libraryAliases },
        // A failed generation can finish before Chokidar's native-event throttle expires, swallowing an immediate repair on Linux. Polling keeps these deliberately back-to-back edits observable without sleeps or longer test timeouts.
        build: { write: false, watch: { chokidar: { usePolling: true } } },
    }) as Rollup.RollupWatcher

    try {
        await nextWatchBuild(watcher)
        await expect(nextWatchBuild(watcher, () => writeFile(cssPath, BROKEN_CSS))).rejects.toThrow('missing-plugin.js')
        await expect(nextWatchBuild(watcher, () => writeFile(cssPath, GOOD_CSS))).resolves.toBeUndefined()
    } finally {
        await watcher.close()
    }
})

test('a watch rebuild loads changed JavaScript theme dependencies', async () => {
    const root = await copyFixture('app')
    const themePath = path.join(root, 'theme.cjs')
    await writeFile(themePath, "module.exports = { huge: '2.5rem' }\n")
    await writeFile(path.join(root, 'tailwind.config.cjs'), "module.exports = { theme: { extend: { fontSize: require('./theme.cjs') } } }\n")
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss';\n@config './tailwind.config.cjs';\n")
    const watcher = await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindMerge({ prune: false })],
        resolve: { alias: libraryAliases },
        build: { minify: false, watch: {}, rollupOptions: { output: { entryFileNames: 'app.js' } } },
    }) as Rollup.RollupWatcher

    try {
        await nextWatchBuild(watcher)
        const before = await readFile(path.join(root, 'dist/app.js'), 'utf8')
        expect(hasLiteral(before, 'huge')).toBe(true)
        expect(hasLiteral(before, 'big')).toBe(false)
        await nextWatchBuild(watcher, () => writeFile(themePath, "module.exports = { big: '2rem' }\n"))
        const after = await readFile(path.join(root, 'dist/app.js'), 'utf8')
        expect(hasLiteral(after, 'big')).toBe(true)
        expect(hasLiteral(after, 'huge')).toBe(false)
    } finally {
        await watcher.close()
    }
})

test.each([false, true])('a CSS root that fails at startup serves default behavior and recovers after repair (outside root: %s)', async (outsideRoot) => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, outsideRoot ? '../theme.css' : 'app.css')
    await writeFile(cssPath, BROKEN_CSS)
    const logs: string[] = []
    const { server, plugin } = await startServer(root, { logs, options: outsideRoot ? { css: cssPath } : undefined })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    const clientFallback = await server.transformRequest(RUNTIME_SPECIFIER)

    // The fallback module: tailwind-merge's default behavior under the same export surface.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
    expect(Object.keys(runtime.getConfig().classGroups)).toContain('sr')
    expect(clientFallback?.code).toContain('getDefaultConfig')
    expect([...new Set(logs)]).toEqual([
        expect.stringContaining('Generating the tailwind-merge config failed: '),
    ])

    await waitForWatcher(server, cssPath)
    const update = await updateAfter(plugin, () => writeFile(cssPath, GOOD_CSS), (result) => result.reloaded)
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(recovered).not.toBe(runtime)
    expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
    const clientRecovered = await server.transformRequest(RUNTIME_SPECIFIER)
    expect(clientRecovered).not.toBe(clientFallback)
    expect(clientRecovered?.code).not.toContain('getDefaultConfig')
})

test.each([false, true])('repairing an imported stylesheet recovers startup generation (pruning: %s)', async (prune) => {
    for (const outsideRoot of [false, true]) {
        const root = await copyFixture('app')
        const tokensPath = path.resolve(root, outsideRoot ? '../tokens.css' : 'tokens.css')
        await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss' source(none);\n@import './bridge.css';\n@source inline('text-huge text-sm');\n")
        await writeFile(path.join(root, 'bridge.css'), `@import '${outsideRoot ? '../' : './'}tokens.css';\n`)
        await writeFile(tokensPath, '@theme { --text-huge: 2.5rem;')
        const { server, plugin } = await startServer(root, { options: { css: 'app.css', prune: { dev: prune } } })
        const fallback = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        const clientFallback = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(fallback.twMerge('text-huge text-sm')).toBe('text-huge text-sm')

        await waitForWatcher(server, tokensPath)
        const update = await updateAfter(plugin, () => writeFile(tokensPath, '@theme { --text-huge: 2.5rem; }\n'))
        expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
        const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
        const clientRecovered = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(clientRecovered).not.toBe(clientFallback)
        expect(clientRecovered?.code).not.toContain('getDefaultConfig')
        await server.close()
    }
})

test.each(['generated.css', '../styles/generated.css'])('creating the missing entrypoint %s replaces the startup fallback', async (css) => {
    const root = await copyFixture('app')
    const entrypoint = path.resolve(root, css)
    const { server, plugin } = await startServer(root, { options: { css } })
    const fallback = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(fallback.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    await waitForWatcher(server, path.join(root, 'main.ts'))

    const update = await updateAfter(plugin, async () => {
        await mkdir(path.dirname(entrypoint), { recursive: true })
        await writeFile(entrypoint, GOOD_CSS)
    }, (result) => result.reloaded)
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
})

describe.each([false, true])('startup creation recovery (pruning: %s)', (prune) => {
    test.each([
        ['./tokens.css', 'tokens.css'],
        ['./tokens', 'tokens.css'],
        ['../tokens.pcss', '../tokens.pcss'],
    ])('creating the imported stylesheet %s replaces the startup fallback', async (importPath, filePath) => {
        const root = await copyFixture('app')
        const tokensPath = path.resolve(root, filePath)
        await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss' source(none);\n@import './bridge.css';\n@source inline('text-huge text-sm');\n")
        await writeFile(path.join(root, 'bridge.css'), `@import '${importPath}';\n`)
        const { server, plugin } = await startServer(root, { options: { css: 'app.css', prune: { dev: prune } } })
        const fallback = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        const clientFallback = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(fallback.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
        await waitForWatcher(server, path.join(root, 'bridge.css'))

        const update = await updateAfter(plugin, () => writeFile(tokensPath, '@theme { --text-huge: 3rem; }\n'), (result) => result.reloaded)
        expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
        const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(recovered).not.toBe(fallback)
        expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
        const clientRecovered = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(clientRecovered).not.toBe(clientFallback)
        expect(clientRecovered?.code).not.toContain('getDefaultConfig')
        await server.close()
    })

    test.each([
        ['@config', './missing.config.cjs', 'missing.config.cjs'],
        ['@plugin', './missing.plugin.cjs', 'missing.plugin.cjs'],
        ['@config', '@/theme', 'theme.js'],
        ['@plugin', '../plugin.cjs', '../plugin.cjs'],
    ])('creating %s %s replaces the startup fallback', async (directive, specifier, file) => {
        const root = await copyFixture('app')
        const entrypoint = path.join(root, 'app.css')
        await writeFile(entrypoint, `@import 'tailwindcss' source(none);\n${directive} '${specifier}';\n@source inline('text-huge text-sm');\n`)
        const { server, plugin } = await startServer(root, {
            aliases: [{ find: '@', replacement: root }],
            options: { css: 'app.css', prune: { dev: prune } },
        })
        const fallback = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        const clientFallback = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(fallback.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
        await waitForWatcher(server, entrypoint)

        const config = "{ theme: { extend: { fontSize: { huge: '3rem' } } } }"
        const module = directive === '@config' ? config : `{ handler() {}, config: ${config} }`
        const update = await updateAfter(plugin, () => writeFile(path.resolve(root, file), `module.exports = ${module}\n`), (result) => result.reloaded)
        expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
        const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
        const clientRecovered = await server.transformRequest(RUNTIME_SPECIFIER)
        expect(clientRecovered).not.toBe(clientFallback)
        expect(clientRecovered?.code).not.toContain('getDefaultConfig')
        await server.close()
    })
})

test('a breaking edit keeps the last good module in service, and the next good edit recovers', async () => {
    const root = await copyFixture('app')
    const logs: string[] = []
    const { server, plugin } = await startServer(root, { logs })
    const cssPath = path.join(root, 'app.css')
    await waitForWatcher(server, cssPath)
    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-huge text-sm')).toBe('text-sm')

    const breakingEdit = await updateAfter(plugin, () => writeFile(cssPath, BROKEN_CSS))
    expect(breakingEdit).toEqual({ trigger: 'config', regenerated: false, reloaded: false })
    expect([...new Set(logs)]).toEqual([expect.stringContaining('keeping the previous one')])
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(before)

    const fixingEdit = await updateAfter(plugin, () =>
        writeFile(
            cssPath,
            GOOD_CSS.replace('--text-huge: 2.5rem;', '--text-huge: 2.5rem;\n    --text-big: 2rem;'),
        ),
    )
    expect(fixingEdit).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
})

test('an edit landing during generation counts as a change for the next watch rebuild', async () => {
    // Modification times are taken as files are reported, so a save that races the (slow) generation is not recorded as the baseline the rebuild compares against.
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const tokensPath = path.join(root, 'tokens.css')
    await writeFile(cssPath, "@import 'tailwindcss' source(none);\n@import './tokens.css';\n")
    await writeFile(tokensPath, '@theme { --text-huge: 2.5rem; }\n')
    let edited = false
    const generated = await generateRuntimeModule({
        cssPath,
        root,
        integration: {
            async onDependency(file) {
                if (file === tokensPath && !edited) {
                    edited = true
                    const later = new Date(Date.now() + 5_000)
                    await writeFile(tokensPath, '@theme { --text-big: 2rem; }\n')
                    await utimes(tokensPath, later, later)
                }
            },
        },
    })
    expect(edited).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)
})

test('an edit to a transitive @config import landing during the import counts as a change', async () => {
    // Tailwind reports a config's own imports only after importing it; the configurator walks them first so their times are taken before the import reads them.
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const configPath = path.join(root, 'tailwind.config.mjs')
    const themePath = path.join(root, 'theme.mjs')
    await writeFile(cssPath, "@import 'tailwindcss' source(none);\n@config './tailwind.config.mjs';\n")
    // A module whose evaluation takes a moment (a top-level await stands in for a big plugin), importing a theme file.
    await writeFile(
        configPath,
        "import { fontSize } from './theme.mjs'\nawait new Promise((resolve) => setTimeout(resolve, 600))\nexport default { theme: { extend: { fontSize } } }\n",
    )
    await writeFile(themePath, "export const fontSize = { huge: '2.5rem' }\n")
    let edited = false
    const generated = await generateRuntimeModule({
        cssPath,
        root,
        integration: {
            onDependency(file) {
                if (file === configPath && !edited) {
                    edited = true
                    setTimeout(async () => {
                        const later = new Date(Date.now() + 5_000)
                        await writeFile(themePath, "export const fontSize = { giant: '9rem' }\n")
                        await utimes(themePath, later, later)
                    }, 200)
                }
            },
        },
    })
    expect(edited).toBe(true)
    expect(generated.dependencies.has(themePath)).toBe(true)
    expect(hasLiteral(generated.code, 'huge')).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)
})

test('dependenciesChanged notices edited and deleted files of the CSS graph', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const generated = await generateRuntimeModule({ cssPath, root })
    expect(generated.dependencies.has(cssPath)).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(false)

    // Same content, newer modification time: `vite build --watch` rebuilds regenerate on that signal alone.
    const later = new Date(Date.now() + 5_000)
    await utimes(cssPath, later, later)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)

    const fresh = await generateRuntimeModule({ cssPath, root })
    await rm(cssPath)
    await expect(dependenciesChanged(fresh)).resolves.toBe(true)
})
