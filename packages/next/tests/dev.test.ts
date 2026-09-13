import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test, vi } from 'vitest'

import { hasLiteral, setupNextTests } from './helpers.ts'

const { copyFixture, startDev } = setupNextTests()

const EXTENDED_CSS =
    "@import 'tailwindcss' source('.');\n\n@theme {\n    --text-huge: 2.5rem;\n    --text-big: 2rem;\n}\n"
// A plugin Tailwind cannot resolve fails the design-system load — the shape of a broken CSS root the plugin must survive.
const BROKEN_CSS = "@import 'tailwindcss' source('.');\n@plugin './missing-plugin.js';\n"

const waitOptions = { timeout: 45_000, interval: 500 }

describe.each([
    ['Turbopack', false],
    ['webpack', true],
])('next dev with %s', (_bundler, webpack) => {
    test('serves the generated config to server and browser, mirrors the runtime surface, and follows theme edits', async () => {
        const root = await copyFixture('app')
        const server = await startDev(root, { webpack })

        const html = await server.fetch('/')
        for (const id of ['server', 'client']) {
            expect(html).toMatch(new RegExp(`id="${id}"[^>]*data-merged="text-sm"`))
            // Dev serves the full config: padding merges although no source uses it.
            expect(html).toMatch(new RegExp(`id="${id}"[^>]*data-padding="p-4"`))
        }
        expect(html).toMatch(/id="server"[^>]*data-big="text-big text-sm"/)
        // The served module exports exactly what the on-disk fallback (and its types) export.
        const runtimeExports = Object.keys(await import('../src/runtime.ts'))
            .sort()
            .join(',')
        expect(html).toContain(`data-exports="${runtimeExports}"`)
        // A theme value proves the browser bundle carries the generated module. Pruning is not checked on dev bundles: without production tree shaking they carry the whole tailwind-merge library, whose default config spells every class group, so an "unused group is absent" probe cannot work there — the server-rendered passthrough of unused classes covers it in the prune.dev test.
        expect(hasLiteral(await server.fetchClientChunks('/'), 'huge')).toBe(true)

        await writeFile(path.join(root, 'app', 'globals.css'), EXTENDED_CSS)
        await vi.waitFor(async () => {
            expect(await server.fetch('/')).toMatch(/id="client"[^>]*data-big="text-sm"/)
        }, waitOptions)
        expect(server.output()).not.toMatch(
            /tailwind-merge config failed|Could not scan|No Tailwind CSS root/,
        )
    })

    test('a broken theme keeps the last good config and recovers after the repair', async () => {
        const root = await copyFixture('app')
        const cssPath = path.join(root, 'app', 'globals.css')
        const server = await startDev(root, { webpack })
        expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-merged="text-sm"/)

        await writeFile(cssPath, BROKEN_CSS)
        await vi.waitFor(() => {
            expect(server.output()).toContain(
                'Generating the tailwind-merge config failed — keeping the previous one',
            )
        }, waitOptions)

        await writeFile(cssPath, EXTENDED_CSS)
        await vi.waitFor(async () => {
            expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-big="text-sm"/)
        }, waitOptions)
    })

    test('prune.dev follows class usage', async () => {
        const root = await copyFixture('app')
        const server = await startDev(root, { webpack, options: { prune: { dev: true } } })
        expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-padding="p-2 p-4"/)
        expect(server.output()).toMatch(
            /Pruned the tailwind-merge config to \d+ of \d+ class groups/,
        )

        // A padding class appears in a scanned source: the re-scan finds it, the retained classification is re-pruned, and the served module merges padding from then on.
        const pagePath = path.join(root, 'app', 'page.jsx')
        await writeFile(
            pagePath,
            (await readFile(pagePath, 'utf8')).replace('<main>', '<main className="p-4">'),
        )
        await vi.waitFor(async () => {
            expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-padding="p-4"/)
        }, waitOptions)
    })
})

test('a theme that is broken from the start serves the default config until it is repaired', async () => {
    // The broken entrypoint is selected explicitly and not imported by the app, so Tailwind's own CSS compilation keeps working and the page renders — with the default config, since generation has never succeeded.
    const root = await copyFixture('app')
    const themePath = path.join(root, 'app', 'theme.css')
    await writeFile(themePath, BROKEN_CSS)
    const server = await startDev(root, { options: { css: 'app/theme.css' } })
    expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-merged="text-huge text-sm"/)
    expect(server.output()).toMatch(/Generating the tailwind-merge config failed: (?!— keeping)/)

    await writeFile(themePath, EXTENDED_CSS)
    await vi.waitFor(async () => {
        expect(await server.fetch('/')).toMatch(/id="server"[^>]*data-big="text-sm"/)
    }, waitOptions)
})

test('without a Tailwind root the fallback is served with a warning', async () => {
    const root = await copyFixture('no-tailwind')
    const server = await startDev(root)
    const html = await server.fetch('/')
    expect(html).toMatch(/data-merged="text-huge text-sm"/)
    expect(html).toMatch(/data-padding="p-4"/)
    expect(server.output()).toContain('No Tailwind CSS root found')
})
