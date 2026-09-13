import { mkdir, rename, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from 'vitest'

import { discoverCssRoot } from '../src/discovery.ts'

import { fixturesDirectory, setupFixtureCopies } from './helpers.ts'

const { copyFixture } = setupFixtureCopies()

test('discovery picks the import-graph top among marker files', async () => {
    await expect(
        discoverCssRoot(path.join(fixturesDirectory, 'multi-root-resolved')),
    ).resolves.toBe(path.join(fixturesDirectory, 'multi-root-resolved', 'main.css'))
})

test('discovery reports ambiguous roots instead of guessing, prefixed with the asking plugin', async () => {
    const ambiguous = path.join(fixturesDirectory, 'ambiguous')
    await expect(discoverCssRoot(ambiguous)).rejects.toThrow(/^Found multiple Tailwind CSS roots/)
    await expect(
        discoverCssRoot(ambiguous, { packageName: '@tailwind-merge/example' }),
    ).rejects.toThrow(
        /^\[@tailwind-merge\/example\] Found multiple Tailwind CSS roots[^]*\n {2}- a\.css\n {2}- b\.css\nSet the plugin's `css` option/,
    )
})

test('symlinked discovery follows shared import cycles and still reports independent roots', async () => {
    const root = await copyFixture('app')
    const linkedRoot = path.join(path.dirname(root), 'linked-app')
    await symlink(root, linkedRoot, 'dir')
    await writeFile(
        path.join(root, 'app.css'),
        "@import 'tailwindcss';\n@import './bridge.css';\n@import './tokens.css';\n",
    )
    await writeFile(path.join(root, 'bridge.css'), "@import './shared.css';\n")
    await writeFile(
        path.join(root, 'shared.css'),
        "@import './bridge.css';\n@import './tokens.css';\n",
    )
    await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 3rem; }\n')

    await expect(discoverCssRoot(linkedRoot)).resolves.toBe(path.join(linkedRoot, 'app.css'))
    await writeFile(path.join(root, 'independent.css'), '@theme { --text-other: 4rem; }\n')
    const error = await discoverCssRoot(linkedRoot).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('  - app.css')
    expect((error as Error).message).toContain('  - independent.css')
    expect((error as Error).message).not.toContain('tokens.css')
    expect((error as Error).message).not.toContain(root)
})

test('commented and quoted imports cannot hide independent roots', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'independent.css'), '@theme { --text-other: 2rem; }\n')
    for (const comment of [
        "/* @import './independent.css'; */",
        `.example::before { content: '@import "./independent.css";'; }`,
    ]) {
        await writeFile(path.join(root, 'app.css'), `@import 'tailwindcss';\n${comment}\n`)
        await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
        await writeFile(
            path.join(root, 'app.css'),
            "@import 'tailwindcss';\n@import './bridge.css';\n",
        )
        await writeFile(path.join(root, 'bridge.css'), comment)
        await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
    }
})

test('discovery follows active directives separated by comments', async () => {
    const root = await copyFixture('app')
    await writeFile(
        path.join(root, 'app.css'),
        "@import/* comment */'tailwindcss';\n@import/* comment */url(/* comment */'./tokens.css');\n",
    )
    await writeFile(path.join(root, 'tokens.css'), '@theme/* comment */{ --text-huge: 2.5rem; }\n')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
})

test('discovery follows symlinked directories and files inside the root', async () => {
    const root = await copyFixture('app')
    const shared = path.join(path.dirname(root), 'shared')
    await mkdir(path.join(shared, 'styles'), { recursive: true })
    await rename(path.join(root, 'app.css'), path.join(shared, 'styles', 'app.css'))
    await symlink(path.join(shared, 'styles'), path.join(root, 'styles'), 'dir')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'styles', 'app.css'))

    await writeFile(path.join(shared, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')
    await symlink(path.join(shared, 'tokens.css'), path.join(root, 'tokens.css'), 'file')
    await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
})

test('discovery terminates on intermediate import cycles and keeps independent roots ambiguous', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss';\n@import './first.css';\n")
    await writeFile(path.join(root, 'first.css'), "@import './second.css';\n")
    await writeFile(
        path.join(root, 'second.css'),
        "@import './first.css';\n@import url('./tokens.css');\n",
    )
    await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))

    await writeFile(
        path.join(root, 'independent.css'),
        "@import 'tailwindcss';\n@import './first.css';\n",
    )
    await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
})

test('dot-directories, dependencies, and build outputs are skipped; no root reads as null', async () => {
    const root = await copyFixture('app')
    await rename(path.join(root, 'app.css'), path.join(root, 'plain.css'))
    await writeFile(path.join(root, 'plain.css'), '.example { color: red; }\n')
    for (const directory of ['.next', 'node_modules/pkg', 'dist', 'public']) {
        await mkdir(path.join(root, directory), { recursive: true })
        await writeFile(path.join(root, directory, 'hidden.css'), "@import 'tailwindcss';\n")
    }
    await expect(discoverCssRoot(root)).resolves.toBeNull()
})
