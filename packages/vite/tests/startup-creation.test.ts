import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { RUNTIME_SPECIFIER, setupPluginTests, updateAfter, waitForWatcher } from './helpers'

// Files the CSS graph needs that do not exist when the dev server starts — the entrypoint itself, an imported stylesheet, a `@config`/`@plugin` module — and get created later: the plugin serves the fallback module meanwhile and must notice the creation, regenerate, and replace the fallback. Split from failure-paths.test.ts, which keeps the broken-then-repaired and build-time failures: every test here spends most of its time waiting on a real watcher, and one file holding all of them was the suite's longest by far.
const { startServer, copyFixture } = setupPluginTests()

const GOOD_CSS = "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n"

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
