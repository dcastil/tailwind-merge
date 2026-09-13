import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { createGenerationSession } from '../src/generation-session.ts'

import { generationDefaults, hasLiteral, setupFixtureCopies } from './helpers.ts'

const { copyFixture } = setupFixtureCopies()

describe.each(['dev', 'build'] as const)('%s generation session', (mode) => {
    test.each([false, true])(
        'retains discoveries through consecutive failures and replaces them on success (prune: %s)',
        async (prune) => {
            const root = await copyFixture('app')
            const cssPath = path.join(root, 'app.css')
            const oldPath = path.join(root, 'old.pcss')
            const nextPath = path.join(root, 'next.pcss')
            const leafPath = path.join(root, 'leaf.pcss')
            const css = (file: string) =>
                `@import 'tailwindcss' source(none); @import './${file}'; @source inline('text-huge text-big text-sm');`
            await writeFile(cssPath, css('old.pcss'))
            await writeFile(oldPath, '@theme { --text-huge: 3rem; }')
            const watched = new Set<string>()
            const session = createGenerationSession({
                ...generationDefaults,
                cssRoot: Promise.resolve(cssPath),
                root,
                integration: {
                    onDependency: (file) => {
                        watched.add(file)
                    },
                },
                prune: prune ? { autoDetectBases: [root] } : undefined,
                onGenerated: () => {},
                onError(error) {
                    if (mode === 'build') {
                        throw error
                    }
                },
            })
            try {
                const first = await session.generation
                expect(hasLiteral(first!.code, 'huge')).toBe(true)
                expect(session.dependencies.has(oldPath)).toBe(true)
                await writeFile(cssPath, css('next.pcss'))

                for (const missingPath of [nextPath, leafPath]) {
                    const attempt = mode === 'build' ? session.refresh() : session.regenerate()
                    const outcome = await attempt.then(
                        (value) => ({ value }),
                        (error: unknown) => ({ error }),
                    )
                    const expectedFailure = {
                        error: expect.objectContaining({
                            message: expect.stringContaining(path.basename(missingPath)),
                        }),
                    }
                    expect(outcome).toEqual(mode === 'build' ? expectedFailure : { value: first })
                    expect(session.current).toBe(first)
                    expect(session.dependencies.has(oldPath)).toBe(true)
                    expect(session.dependencies.has(missingPath)).toBe(true)
                    expect(watched.has(missingPath)).toBe(true)
                    await writeFile(
                        missingPath,
                        missingPath === nextPath
                            ? "@import './leaf.pcss';"
                            : '@theme { --text-big: 4rem; }',
                    )
                }

                const recovered = await (mode === 'build'
                    ? session.refresh()
                    : session.regenerate())
                expect(hasLiteral(recovered!.code, 'big')).toBe(true)
                expect(hasLiteral(recovered!.code, 'huge')).toBe(false)
                expect(session.dependencies.has(oldPath)).toBe(false)
                expect(session.dependencies.has(nextPath)).toBe(true)
                expect(session.dependencies.has(leafPath)).toBe(true)
                await expect(session.refresh()).resolves.toBe(recovered)
            } finally {
                await session.dispose()
            }
        },
    )
})

test('a refresh retries a failed source scan once its cause is gone', async () => {
    // The first scan fails on a missing `source(…)` directory and the module holds the full config; the next refresh must try pruning again even though the CSS graph is unchanged.
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    await writeFile(cssPath, "@import 'tailwindcss' source('./does-not-exist');\n")
    const session = createGenerationSession({
        ...generationDefaults,
        cssRoot: Promise.resolve(cssPath),
        root,
        prune: { autoDetectBases: [root] },
        onGenerated: () => {},
        onError(error) {
            throw error
        },
    })
    try {
        const first = await session.generation
        expect(first!.pruningError).toBeInstanceOf(Error)
        expect(first!.pruning).toBeUndefined()
        expect(hasLiteral(first!.code, 'sr-only')).toBe(true)

        await mkdir(path.join(root, 'does-not-exist'))
        await writeFile(path.join(root, 'does-not-exist', 'index.html'), '<p class="text-sm">')
        const retried = await session.refresh()
        expect(retried!.pruningError).toBeUndefined()
        expect(retried!.pruning).toBeDefined()
        expect(hasLiteral(retried!.code, 'sr-only')).toBe(false)
        await expect(session.refresh()).resolves.toBe(retried)
    } finally {
        await session.dispose()
    }
})

test('a refresh re-prunes the retained classification when the used classes change', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const sourcePath = path.join(root, 'index.html')
    await writeFile(cssPath, "@import 'tailwindcss';\n@theme { --text-huge: 2.5rem; }\n")
    await writeFile(sourcePath, '<p class="text-huge text-sm">')
    let generations = 0
    const session = createGenerationSession({
        ...generationDefaults,
        cssRoot: Promise.resolve(cssPath),
        root,
        prune: { autoDetectBases: [root] },
        onGenerated: () => {
            generations++
        },
        onError(error) {
            throw error
        },
    })
    try {
        const first = await session.generation
        expect(first!.pruning).toBeDefined()
        expect(hasLiteral(first!.code, 'huge')).toBe(true)
        expect('p' in first!.result.config.classGroups).toBe(false)

        await writeFile(sourcePath, '<p class="text-huge text-sm p-4">')
        const repruned = await session.refresh()
        // The used classes changed: the module is re-assembled from the retained classification (a second `onGenerated`), not regenerated (the configurator result identity is what a regeneration would replace).
        expect(repruned).not.toBe(first)
        expect(generations).toBe(2)
        expect('p' in repruned!.result.config.classGroups).toBe(true)
        expect(repruned!.dependencyMtimes).toBe(first!.dependencyMtimes)
        // A source edit that changes no class names leaves the module alone.
        await writeFile(sourcePath, '<p class="p-4 text-sm text-huge">')
        await expect(session.refresh()).resolves.toBe(repruned)
        expect(generations).toBe(2)
    } finally {
        await session.dispose()
    }
})
