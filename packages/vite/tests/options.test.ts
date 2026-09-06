import path from 'node:path'
import { writeFile } from 'node:fs/promises'

import { expect, test } from 'vitest'

import { discoverCssRoot } from '../src/discovery'
import { type TailwindMergeOptions } from '../src/index'
import { autoDetectBases, resolvePruneOptions } from '../src/prune-options'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    fixturesDirectory,
    hasLiteral,
    setupPluginTests,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

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

test.each([false, true])(
    'discovery follows imports through an intermediate stylesheet (outside root: %s)',
    async (outsideRoot) => {
        const root = await copyFixture('app')
        const bridge = outsideRoot ? '../styles.css' : './styles.css'
        await writeFile(
            path.join(root, 'app.css'),
            `@import 'tailwindcss';\n@import '${bridge}';\n`,
        )
        await writeFile(
            path.resolve(root, bridge),
            `@import '${outsideRoot ? './app/' : './'}tokens.css';\n`,
        )
        await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')

        await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
        const { server } = await startServer(root)
        const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
        const { code } = await buildFixture(root, { options: { prune: false } })
        expect(hasLiteral(code, 'huge')).toBe(true)
    },
)

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

test('encoding: exact reaches the generated config', async () => {
    const { server: compact } = await startServer(path.join(fixturesDirectory, 'app'))
    const compactRuntime = await compact.ssrLoadModule(RUNTIME_SPECIFIER)
    // 7xl is not a radius value, but matches compact's t-shirt-size pattern.
    expect(compactRuntime.twMerge('rounded-md rounded-7xl')).toBe('rounded-7xl')
    await compact.close()

    const { server: exact } = await startServer(path.join(fixturesDirectory, 'app'), {
        options: { encoding: 'exact' },
    })
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
