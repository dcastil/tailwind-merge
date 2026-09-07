import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { expect, test } from 'vitest'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    fixturesDirectory,
    hasLiteral,
    updateAfter,
    setupPluginTests,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

// With @tailwindcss/vite in the plugin list, automatic source detection starts at the Vite root — the common setup, and the one that keeps this package's own sources (full of class-name literals) out of the scan.
const withTailwind = { plugins: [tailwindcss()] }

test('vite build prunes the generated module to the classes found in the sources and says so', async () => {
    const { code, lines } = await buildFixture(path.join(fixturesDirectory, 'app'), withTailwind)

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
    const full = await buildFixture(path.join(fixturesDirectory, 'app'), {
        ...withTailwind,
        options: { prune: false },
    })
    expect(hasLiteral(full.code, 'sr-only')).toBe(true)
    expect(full.lines).toEqual([])

    const quiet = await buildFixture(path.join(fixturesDirectory, 'app'), {
        ...withTailwind,
        options: { prune: { log: false } },
    })
    expect(hasLiteral(quiet.code, 'sr-only')).toBe(false)
    expect(quiet.lines).toEqual([])
})

test('library builds keep the full config unless pruning is forced', async () => {
    const lib = { entry: 'main.ts', formats: ['es'], fileName: 'lib' }
    const library = await buildFixture(path.join(fixturesDirectory, 'app'), {
        ...withTailwind,
        build: { lib },
    })
    expect(hasLiteral(library.code, 'sr-only')).toBe(true)
    expect(library.lines).toEqual([expect.stringContaining('Library build')])

    const forced = await buildFixture(path.join(fixturesDirectory, 'app'), {
        ...withTailwind,
        options: { prune: true },
        build: { lib },
    })
    expect(hasLiteral(forced.code, 'sr-only')).toBe(false)
})

test('safelisted classes and sources outside the Vite root are part of the pruned config', async () => {
    const root = await copyFixture('app')
    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss';\n@source inline('underline');\n\n@theme {\n    --text-huge: 2.5rem;\n}\n",
    )
    const { code } = await buildFixture(root, withTailwind)
    // No file uses `underline`; the safelist keeps it — and proves pruning happened because its siblings are gone.
    expect(hasLiteral(code, 'underline')).toBe(true)
    expect(hasLiteral(code, 'overline')).toBe(false)

    // The monorepo fixture registers a package outside the Vite root via @source; its classes count as used.
    const monorepo = await buildFixture(
        path.join(fixturesDirectory, 'monorepo', 'apps', 'web'),
        withTailwind,
    )
    expect(hasLiteral(monorepo.code, 'widest')).toBe(true)
    expect(hasLiteral(monorepo.code, 'sr-only')).toBe(false)
})

test('a scan that fails falls back to the full config with a warning', async () => {
    const root = await copyFixture('app')
    // `source(…)` must name an existing directory; Tailwind's compile rejects it otherwise, which is the kind of failure the plugin must survive. Without @tailwindcss/vite in the list, so Tailwind's own plugin does not fail the build first.
    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss' source('./does-not-exist');\n\n@theme {\n    --text-huge: 2.5rem;\n}\n",
    )
    const { code, lines } = await buildFixture(root)

    expect(lines).toEqual([expect.stringContaining('Could not scan your sources')])
    expect(hasLiteral(code, 'sr-only')).toBe(true)
    expect(code).toContain('huge')
})

test('dev serves the full config by default and the pruned one with prune.dev', async () => {
    const { server: full } = await startServer(path.join(fixturesDirectory, 'app'))
    const fullRuntime = await full.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(Object.keys(fullRuntime.getConfig().classGroups)).toEqual(
        expect.arrayContaining(['sr', 'font-size']),
    )
    await full.close()

    const { server: pruned } = await startServer(path.join(fixturesDirectory, 'app'), {
        ...withTailwind,
        options: { prune: { dev: true } },
    })
    const prunedRuntime = await pruned.ssrLoadModule(RUNTIME_SPECIFIER)
    const classGroups = Object.keys(prunedRuntime.getConfig().classGroups)
    expect(classGroups).toContain('font-size')
    expect(classGroups).not.toContain('sr')
    // The classes the fixture uses merge exactly like under the full config.
    expect(prunedRuntime.twMerge('text-huge text-sm')).toBe('text-sm')
})

test('with prune.dev, a class-usage change regenerates and reloads, an unrelated edit does not', async () => {
    const root = await copyFixture('app')
    const { server, plugin } = await startServer(root, {
        ...withTailwind,
        options: { prune: { dev: true } },
    })
    const mainPath = path.join(root, 'main.ts')
    await waitForWatcher(server, mainPath)

    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // No source uses padding classes yet, so they pass through.
    expect(before.twMerge('p-2 p-4')).toBe('p-2 p-4')

    const usageChange = await updateAfter(
        plugin,
        () =>
            writeFile(
                mainPath,
                "import './app.css'\nimport { twMerge } from '@tailwind-merge/vite/runtime'\n\ndocument.body.className = twMerge('text-huge text-sm p-4')\n",
            ),
        (result) => result.reloaded,
    )
    // Native watchers can deliver a late app.css notification from fixture setup around the first edit. Assert the processing outcome and served behavior; scheduler tests cover exact event priority independently of filesystem timing.
    expect(usageChange).toMatchObject({ regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('p-2 p-4')).toBe('p-4')

    // Same tokens in another order: the re-scan finds no change in used classes, so nothing regenerates.
    const reorderEdit = await updateAfter(plugin, () =>
        writeFile(
            mainPath,
            "import './app.css'\nimport { twMerge } from '@tailwind-merge/vite/runtime'\n\ndocument.body.className = twMerge('p-4 text-sm text-huge')\n",
        ),
    )
    expect(reorderEdit).toEqual({ trigger: 'sources', regenerated: false, reloaded: false })
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(after)

    // New words anywhere in a source are new candidate tokens to Tailwind's scanner (comments included), so the config regenerates — but it comes out identical, and the hash gate keeps the served module.
    const commentEdit = await updateAfter(plugin, () =>
        writeFile(
            mainPath,
            "import './app.css'\nimport { twMerge } from '@tailwind-merge/vite/runtime'\n\n// a comment\ndocument.body.className = twMerge('p-4 text-sm text-huge')\n",
        ),
    )
    expect(commentEdit).toEqual({ trigger: 'sources', regenerated: true, reloaded: false })
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(after)
})

test('a source edit cannot replace a pending CSS update while pruning in dev', async () => {
    const root = await copyFixture('app')
    const { server, plugin } = await startServer(root, {
        ...withTailwind,
        options: { prune: { dev: true } },
    })
    const cssPath = path.join(root, 'app.css')
    const mainPath = path.join(root, 'main.ts')
    await waitForWatcher(server, cssPath)
    await waitForWatcher(server, mainPath)
    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.getConfig().classGroups['text-decoration']).toBeUndefined()
    const css = await readFile(cssPath, 'utf8')
    const main = await readFile(mainPath, 'utf8')

    const update = await updateAfter(plugin, async () => {
        await writeFile(cssPath, `${css}\n@source inline('underline');\n`)
        // Same source candidates, immediately after the CSS edit: reusing the old scanner would miss the new safelist.
        await writeFile(mainPath, main.replace('text-huge text-sm', 'text-sm text-huge'))
    })

    expect(update).toMatchObject({ regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.getConfig().classGroups['text-decoration']).toEqual(['underline'])
})
