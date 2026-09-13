import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, test } from 'vitest'

import {
    buildFixture,
    expectSuccessfulBuild,
    fixturesDirectory,
    hasLiteral,
    readBuildFile,
    readClientChunks,
    setupNextTests,
    workspaceRoot,
} from './helpers.ts'

const { copyFixture } = setupNextTests()

describe.each([
    ['Turbopack', false],
    ['webpack', true],
])('next build with %s', (_bundler, webpack) => {
    test('prerenders with the generated config and ships a pruned module to the browser', async () => {
        const root = await copyFixture('app')
        const { code, output } = await buildFixture(root, { webpack })
        expect(output).not.toMatch(
            /tailwind-merge config failed|Could not scan|No Tailwind CSS root/,
        )
        expectSuccessfulBuild({ code, output })

        const html = await readBuildFile(root, 'server/app/index.html')
        for (const id of ['server', 'client']) {
            // --text-huge makes text-huge a font size; the generated config resolves the conflict with text-sm, while the default config would keep both (it misreads text-huge as a color). The server component and the client component's server rendering both show it.
            expect(html).toMatch(new RegExp(`id="${id}"[^>]*data-merged="text-sm"`))
            // No source uses padding classes, so pruning dropped the group and the assembled names pass through.
            expect(html).toMatch(new RegExp(`id="${id}"[^>]*data-padding="p-2 p-4"`))
        }
        const chunks = await readClientChunks(root)
        expect(hasLiteral(chunks, 'huge')).toBe(true)
        expect(hasLiteral(chunks, 'forced-color-adjust')).toBe(false)
        expect(output).toMatch(
            /Pruned the tailwind-merge config to \d+ of \d+ class groups from the \d+ classes found in your sources/,
        )
    })

    test('prune: false keeps the full config', async () => {
        const root = await copyFixture('app')
        const { code, output } = await buildFixture(root, { webpack, options: { prune: false } })
        expectSuccessfulBuild({ code, output })

        const html = await readBuildFile(root, 'server/app/index.html')
        expect(html).toMatch(/id="server"[^>]*data-merged="text-sm"/)
        expect(html).toMatch(/id="server"[^>]*data-padding="p-4"/)
        expect(hasLiteral(await readClientChunks(root), 'forced-color-adjust')).toBe(true)
        expect(output).not.toContain('Pruned the tailwind-merge config')
    })

    test('a missing explicit entrypoint fails the build', async () => {
        const root = await copyFixture('app')
        const { code, output } = await buildFixture(root, {
            webpack,
            options: { css: 'styles/missing.css' },
        })
        expect(code).not.toBe(0)
        expect(output).toContain('missing.css')
    })

    test('the Pages Router server bundle uses the generated config', async () => {
        const root = await copyFixture('pages')
        const { code, output } = await buildFixture(root, { webpack })
        expectSuccessfulBuild({ code, output })

        // Without transpilePackages the server bundle would externalize the package and require() the fallback at request time; the merged result proves the loader's module rendered the page.
        const html = await readBuildFile(root, 'server/pages/index.html')
        expect(html).toMatch(/id="page"[^>]*data-merged="text-sm"/)
        // Automatic source detection found the page's own classes, so the tracking group survived pruning.
        expect(html).toMatch(/data-tracking="tracking-widest"/)
        expect(output).toMatch(/Pruned the tailwind-merge config/)
    })
})

test('a consumer project type-checks the plugin entry and the runtime subpath without configuration', async () => {
    const fixture = path.join(fixturesDirectory, 'consumer-types')
    const tscBin = path.join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc')

    // On failure the assertion diff carries tsc's error listing.
    const output = await promisify(execFile)(process.execPath, [tscBin, '-p', fixture]).then(
        () => '',
        (error: { stdout?: string; stderr?: string }) =>
            `${error.stdout ?? ''}${error.stderr ?? ''}`,
    )
    expect(output).toBe('')
})
