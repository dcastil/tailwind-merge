import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import tailwindcss from '@tailwindcss/vite'
import { expect, test } from 'vitest'

import { buildFixture, fixturesDirectory, setupPluginTests, workspaceRoot } from './helpers'

setupPluginTests()

test('vite build inlines the generated module', async () => {
    const { code } = await buildFixture(path.join(fixturesDirectory, 'app'), {
        options: { prune: false },
    })

    expect(code).toContain('createTailwindMerge')
    // The generated font-size scale enumerates the custom theme value — proof the build served the generated module, not the fallback.
    expect(code).toContain('huge')
    // The default config never enters the bundle (getDefaultConfig would only appear via the fallback module).
    expect(code).not.toContain('getDefaultConfig')
})

test('coexists with @tailwindcss/vite in build', async () => {
    const { code, output } = await buildFixture(path.join(fixturesDirectory, 'app'), {
        plugins: [tailwindcss()],
    })

    expect(code).toContain('huge')
    expect(code).not.toContain('getDefaultConfig')
    const cssAsset = output.find(
        (entry) => entry.type === 'asset' && entry.fileName.endsWith('.css'),
    )
    expect(String(cssAsset?.source)).toContain('text-sm')
})

test('a consumer project type-checks the runtime subpath without configuration', async () => {
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
