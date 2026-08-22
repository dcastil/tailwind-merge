import path from 'node:path'

import { expect, test } from 'vitest'

import { discoverCssRoot } from '../src/discovery'
import { type TailwindMergeOptions } from '../src/index'
import { autoDetectBases, resolvePruneOptions } from '../src/prune-options'

import { RUNTIME_SPECIFIER, fixturesDirectory, setupPluginTests } from './helpers'

const { startServer } = setupPluginTests()

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
