import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { loadModule } from '@tailwindcss/node'
import { clearRequireCache } from '@tailwindcss/node/require-cache'
import { afterEach, beforeEach, expect, test } from 'vitest'

import { createModuleResolver, prepareModuleLoad, trackModuleDependencies } from '../src/resolvers'

import { fixtureBase } from './fixture-utils'

let directory: string
beforeEach(async () => {
    directory = await mkdtemp(path.join(fixtureBase, '.tmp-resolvers-'))
})
afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
})

test('reports missing module targets and resolves creation without keeping the failed lookup', async () => {
    const dependencies = new Set<string>()
    const resolve = createModuleResolver(undefined, (file) => dependencies.add(file))
    const file = path.join(directory, 'theme.ts')
    await expect(resolve('./theme', directory)).rejects.toThrow("Can't resolve './theme'")
    expect(dependencies.has(file)).toBe(true)
    expect(dependencies.has(directory)).toBe(true)

    dependencies.clear()
    await writeFile(file, 'export default {}\n')
    await expect(resolve('./theme', directory)).resolves.toBe(file)
    expect([...dependencies]).toEqual([file])
})

test.each([false, true])('preserves import-before-require package resolution (import exists: %s)', async (importExists) => {
    const packageDirectory = path.join(directory, 'node_modules', 'theme-package')
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(path.join(packageDirectory, 'package.json'), JSON.stringify({
        exports: { import: './theme.mjs', require: './theme.cjs' },
    }))
    await writeFile(path.join(packageDirectory, 'theme.cjs'), 'module.exports = {}\n')
    if (importExists) {
        await writeFile(path.join(packageDirectory, 'theme.mjs'), 'export default {}\n')
    }

    const dependencies: string[] = []
    const resolve = createModuleResolver(undefined, (file) => dependencies.push(file))
    const expected = path.join(packageDirectory, importExists ? 'theme.mjs' : 'theme.cjs')
    await expect(resolve('theme-package', directory)).resolves.toBe(expected)
    // Missing alternatives must not escape when require resolution succeeds.
    expect(dependencies).toEqual([expected])
})

test('retains the failed local module graph through syntax errors, cycles, and missing imports', async () => {
    const entrypoint = path.join(directory, 'theme.cjs')
    const child = path.join(directory, 'child.cjs')
    await writeFile(entrypoint, "module.exports = require('./child.cjs');\n")
    // The broken child itself can contain dependencies needed for the next repair. A parser that rejects incomplete JavaScript would miss them.
    await writeFile(child, "require('./theme.cjs');\nmodule.exports = { tokens: require('./tokens')\n")
    const dependencies = new Set<string>()
    await trackModuleDependencies(entrypoint, (file) => dependencies.add(file))
    expect(dependencies).toContain(entrypoint)
    expect(dependencies).toContain(child)
    expect(dependencies).toContain(path.join(directory, 'tokens.js'))
    expect(dependencies).toContain(path.join(directory, 'tokens.ts'))
    expect(dependencies).toContain(path.join(directory, 'tokens'))

    const tokens = path.join(directory, 'tokens.js')
    await writeFile(tokens, 'module.exports = {}\n')
    dependencies.clear()
    await trackModuleDependencies(entrypoint, (file) => dependencies.add(file))
    expect([...dependencies].sort()).toEqual([entrypoint, child, tokens].sort())
})

test('tracks literal ESM dependencies, TypeScript extension preference, and directory package entries without executing them', async () => {
    const entrypoint = path.join(directory, 'theme.ts')
    await writeFile(entrypoint, [
        "import { colors } from './colors';",
        "import './side-effect.mjs';",
        "export { sizes } from './sizes';",
        "const plugin = import('./plugin.mjs');",
        "import external from 'uninstalled-package';",
        "throw new Error('must never execute');",
    ].join('\n'))
    await writeFile(path.join(directory, 'colors.ts'), "export const colors = {};\n")
    await writeFile(path.join(directory, 'colors.js'), "throw new Error('wrong extension');\n")
    await mkdir(path.join(directory, 'sizes'))
    await writeFile(path.join(directory, 'sizes/package.json'), '{"main":"./sizes.cjs"}')
    await writeFile(path.join(directory, 'sizes/sizes.cjs'), 'module.exports = {};\n')
    const dependencies = new Set<string>()
    await trackModuleDependencies(entrypoint, (file) => dependencies.add(file))
    expect(dependencies).toContain(path.join(directory, 'colors.ts'))
    expect(dependencies).not.toContain(path.join(directory, 'colors.js'))
    expect(dependencies).toContain(path.join(directory, 'sizes/sizes.cjs'))
    expect(dependencies).toContain(path.join(directory, 'side-effect.mjs'))
    expect(dependencies).toContain(path.join(directory, 'plugin.mjs'))
    expect([...dependencies].some((file) => file.includes('uninstalled-package'))).toBe(false)
})

test('watches the nearest existing directory for a missing local path without watching resolver metadata directories', async () => {
    const dependencies = new Set<string>()
    const resolve = createModuleResolver(undefined, (file) => dependencies.add(file))
    await expect(resolve('./generated/theme.cjs', directory)).rejects.toThrow('generated/theme.cjs')
    expect(dependencies).toContain(directory)
    expect(dependencies).not.toContain(path.dirname(directory))

    await mkdir(path.join(directory, 'generated'))
    await writeFile(path.join(directory, 'generated/theme.cjs'), 'module.exports = {}\n')
    dependencies.clear()
    await expect(resolve('./generated/theme.cjs', directory)).resolves.toBe(path.join(directory, 'generated/theme.cjs'))
    expect([...dependencies]).toEqual([path.join(directory, 'generated/theme.cjs')])
})

test.each([
    ['a bare re-export', "module.exports = require('./tokens.cjs')", (value: unknown) => value],
    ['a spread re-export', "module.exports = { ...require('./tokens.cjs') }", (value: unknown) => value],
    ['a re-exporting property', "module.exports = { tokens: require('./tokens.cjs') }", (value: unknown) => ({ tokens: value })],
    ['a nested require', "module.exports = { theme: { tokens: require('./tokens.cjs') } }", (value: unknown) => ({ theme: { tokens: value } })],
])('reloads a CommonJS dependency behind %s on every load, also after a failed one', async (_, source, expected) => {
    const entrypoint = path.join(directory, 'theme.cjs')
    const tokens = path.join(directory, 'tokens.cjs')
    await writeFile(entrypoint, `${source}\n`)
    // The way an integration reloads a config: clear the tracked graph, prepare, then let Tailwind import with a cache-busting query.
    const load = async () => {
        // Tailwind's cache-busting query is the current millisecond; two loads within one would share an ESM cache entry.
        await new Promise((resolve) => setTimeout(resolve, 2))
        clearRequireCache([entrypoint, tokens])
        await prepareModuleLoad(entrypoint)
        return (await loadModule('./theme.cjs', directory, () => {})).module
    }

    for (const size of ['1rem', '2rem', '3rem']) {
        await writeFile(tokens, `module.exports = { size: '${size}' }\n`)
        // Without preparation Node hands the entrypoint an empty object for its re-exported dependency from the second load on.
        expect(await load()).toEqual(expected({ size }))
    }

    // A broken dependency must surface instead of loading as an empty object, and its repair must load.
    await writeFile(tokens, 'module.exports = {\n')
    await expect(load()).rejects.toThrow()
    await writeFile(tokens, "module.exports = { size: '4rem' }\n")
    expect(await load()).toEqual(expected({ size: '4rem' }))
})

test.each([
    ['an ESM file in a CommonJS package', 'theme.js', undefined, 'globalThis.__twmLoads = (globalThis.__twmLoads ?? 0) + 1\nexport default {}\n'],
    ['a file in an ESM package', 'theme.js', 'module', 'globalThis.__twmLoads = (globalThis.__twmLoads ?? 0) + 1\nexport default {}\n'],
    ['an .mjs file', 'theme.mjs', undefined, 'globalThis.__twmLoads = (globalThis.__twmLoads ?? 0) + 1\nexport default {}\n'],
])('does not evaluate %s ahead of the import', async (_, name, type, source) => {
    const globals = globalThis as { __twmLoads?: number }
    delete globals.__twmLoads
    await writeFile(path.join(directory, 'package.json'), JSON.stringify(type ? { type } : {}))
    const entrypoint = path.join(directory, name)
    await writeFile(entrypoint, source)

    await prepareModuleLoad(entrypoint)
    expect(globals.__twmLoads).toBeUndefined()
    await loadModule(`./${name}`, directory, () => {})
    expect(globals.__twmLoads).toBe(1)
    delete globals.__twmLoads
})

test('loads a CommonJS .js config once, for both the preparation and the import', async () => {
    const globals = globalThis as { __twmLoads?: number }
    delete globals.__twmLoads
    await writeFile(path.join(directory, 'package.json'), '{}')
    const entrypoint = path.join(directory, 'theme.js')
    await writeFile(entrypoint, "globalThis.__twmLoads = (globalThis.__twmLoads ?? 0) + 1\nmodule.exports = { size: '1rem' }\n")

    await prepareModuleLoad(entrypoint)
    expect((await loadModule('./theme.js', directory, () => {})).module).toEqual({ size: '1rem' })
    expect(globals.__twmLoads).toBe(1)
    delete globals.__twmLoads
})
