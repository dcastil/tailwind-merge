import { rm, utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from 'vitest'

import { dependenciesChanged, generateRuntimeModule } from '../src/generation'

import { RUNTIME_SPECIFIER, setupPluginTests, updateAfter, waitForWatcher } from './helpers'

const { startServer, copyFixture } = setupPluginTests()

const GOOD_CSS = "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n"
// A plugin Tailwind cannot resolve fails the design-system load — the shape of a broken CSS root the plugin must survive.
const BROKEN_CSS = "@import 'tailwindcss';\n@plugin './missing-plugin.js';\n"

test('a CSS root that fails at startup serves default behavior and logs the error', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), BROKEN_CSS)
    const logs: string[] = []
    const { server } = await startServer(root, { logs })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    // The fallback module: tailwind-merge's default behavior under the same export surface.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
    expect(Object.keys(runtime.getConfig().classGroups)).toContain('sr')
    expect(logs).toEqual([
        expect.stringContaining('Generating the tailwind-merge config failed: '),
    ])
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
    expect(logs).toEqual([expect.stringContaining('keeping the previous one')])
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
