import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { expect, test } from 'vitest'

import * as fallbackRuntime from '../src/runtime'

import {
    RUNTIME_SPECIFIER,
    fixturesDirectory,
    updateAfter,
    setupPluginTests,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

test('serves a generated twMerge through the runtime subpath', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    // --text-huge makes text-huge a font size; the generated config resolves the conflict with text-sm.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
    // The default config misreads text-huge as a text color (issue #684) and keeps both — the difference the plugin exists for, and proof the redirect served the generated module.
    expect(fallbackRuntime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    // Non-theme behavior stays intact.
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
})

test('the explicit css option pins the entrypoint', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'), {
        options: { css: 'app.css' },
    })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
})

test('the virtual module mirrors the runtime surface', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(Object.keys(runtime).sort()).toEqual(Object.keys(fallbackRuntime).sort())
})

test('extendTailwindMerge extends the generated config, not the default one', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'))
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    const extended = runtime.extendTailwindMerge((config: unknown) => config)
    expect(extended('text-huge text-sm')).toBe('text-sm')
})

test('without a Tailwind root the subpath falls back to default behavior, with a warning', async () => {
    const logs: string[] = []
    const { server } = await startServer(path.join(fixturesDirectory, 'no-tailwind'), { logs })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    expect(runtime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
    expect(logs).toEqual([expect.stringContaining('No Tailwind CSS root found')])
})

test('a theme change regenerates, invalidates, and changes merge behavior', async () => {
    const root = await copyFixture('app')
    const { server, plugin } = await startServer(root)
    const cssPath = path.join(root, 'app.css')
    await waitForWatcher(server, cssPath)

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    const update = await updateAfter(plugin, () =>
        writeFile(
            cssPath,
            "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n    --text-big: 2rem;\n}\n",
        ),
    )
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })

    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after).not.toBe(before)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
})

test.each([
    ['@config', false], ['@config', true], ['@plugin', false], ['@plugin', true],
] as const)('%s reloads transitive JavaScript theme dependencies without a Tailwind transform (prune: %s)', async (directive, prune) => {
    const root = await copyFixture('app')
    const themePath = path.join(root, 'theme.cjs')
    await writeFile(themePath, "module.exports = { huge: '2.5rem' }\n")
    const theme = "{ theme: { extend: { fontSize: require('./theme.cjs') } } }"
    await writeFile(path.join(root, 'tailwind.config.cjs'), `module.exports = ${directive === '@config' ? theme : `{ handler() {}, config: ${theme} }`}\n`)
    await writeFile(path.join(root, 'app.css'), `@import 'tailwindcss';\n${directive} './tailwind.config.cjs';\n@source inline('text-huge text-big text-sm');\n`)
    const { server, plugin } = await startServer(root, { options: { prune: { dev: prune } } })
    await waitForWatcher(server, themePath)

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-huge text-sm')).toBe('text-sm')
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    const update = await updateAfter(
        plugin,
        () => writeFile(themePath, "module.exports = { big: '2rem' }\n"),
        (result) => result.reloaded,
    )
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
    expect(after.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
})

test('a theme-irrelevant edit regenerates without invalidating (the stability gate)', async () => {
    const root = await copyFixture('app')
    const { server, plugin } = await startServer(root)
    const cssPath = path.join(root, 'app.css')
    await waitForWatcher(server, cssPath)

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    const update = await updateAfter(plugin, () =>
        writeFile(
            cssPath,
            "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n\n/* a comment that changes the file but not the theme */\n",
        ),
    )
    // The regenerated output hashed identically, so nothing was invalidated and a browser would not have reloaded.
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: false })
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(before)
})

test('theme updates continue after restarting a server with the same plugin instance', async () => {
    const root = await copyFixture('app')
    const { server, plugin } = await startServer(root)
    await server.ssrLoadModule(RUNTIME_SPECIFIER)
    await server.restart()

    const cssPath = path.join(root, 'app.css')
    await waitForWatcher(server, cssPath)
    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    const update = await updateAfter(plugin, () =>
        writeFile(cssPath, "@import 'tailwindcss';\n@theme { --text-big: 2rem; }\n"),
    )
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
})

test('the client pipeline resolves the subpath to the virtual module', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'))
    const transformed = await server.transformRequest('/main.ts')

    // Vite encodes the \0 virtual prefix as __x00__ when rewriting client imports — the presence proves the client environment served the generated module, not the on-disk fallback.
    expect(transformed?.code).toContain('__x00__@tailwind-merge/vite/runtime')
})

test('coexists with @tailwindcss/vite in dev', async () => {
    const { server } = await startServer(path.join(fixturesDirectory, 'app'), {
        plugins: [tailwindcss()],
    })

    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')

    // Tailwind's own pipeline keeps working next to the plugin: the compiled stylesheet carries the utilities scanned from the fixture source and the custom theme variable.
    const css = await server.transformRequest('/app.css')
    expect(css?.code).toContain('text-sm')
    expect(css?.code).toContain('--text-huge')
})

test('theme files outside the Vite root regenerate on change (monorepo)', async () => {
    const monorepo = await copyFixture('monorepo')
    const { server, plugin } = await startServer(path.join(monorepo, 'apps', 'web'))
    const tokensPath = path.join(monorepo, 'theme', 'tokens.css')
    // Vite's watcher only covers the root by default; the plugin registers out-of-root dependencies explicitly.
    await waitForWatcher(server, tokensPath)

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // The theme value comes from a file outside the Vite root and already configures the merge.
    expect(before.twMerge('text-huge text-sm')).toBe('text-sm')
    expect(before.twMerge('text-big text-sm')).toBe('text-big text-sm')

    const update = await updateAfter(plugin, () =>
        writeFile(tokensPath, '@theme {\n    --text-huge: 2.5rem;\n    --text-big: 2rem;\n}\n'),
    )
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })

    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
})
