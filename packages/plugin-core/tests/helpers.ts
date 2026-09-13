import { cp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach } from 'vitest'

export const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
export const fixturesDirectory = path.join(testsDirectory, 'fixtures')

/** Options every generation in this suite shares: the values a plugin would pass, with the plugin's identity replaced by this package's. */
export const generationDefaults = {
    packageName: '@tailwind-merge/plugin-core',
    importSource: 'tailwind-merge',
}

/**
 * Registers the per-test cleanup of fixture copies and returns `copyFixture`, which copies a fixture into a temp directory inside tests/ (not the OS temp dir) so `@import 'tailwindcss'` still resolves through this package's node_modules. The copy sits one level below the temp directory, mirroring the plugin suites, whose scans must not see anything next to the fixture.
 */
export function setupFixtureCopies() {
    const temporaryDirectories: string[] = []

    afterEach(async () => {
        await Promise.all(
            temporaryDirectories
                .splice(0)
                .map((directory) => rm(directory, { recursive: true, force: true })),
        )
    })

    async function copyFixture(name: string): Promise<string> {
        const temporaryDirectory = path.join(
            testsDirectory,
            `.tmp-${name.replace(/\//g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        )
        temporaryDirectories.push(temporaryDirectory)
        const directory = path.join(temporaryDirectory, name)
        await cp(path.join(fixturesDirectory, name), directory, { recursive: true })
        return directory
    }

    return { copyFixture }
}

/** Whether generated code contains `value` as a string literal in either quote style. */
export function hasLiteral(code: string, value: string): boolean {
    return new RegExp(`["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(code)
}
