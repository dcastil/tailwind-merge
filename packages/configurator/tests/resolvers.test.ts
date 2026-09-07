import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { afterEach, beforeEach, expect, test } from 'vitest'

import { createModuleResolver } from '../src/resolvers'

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
