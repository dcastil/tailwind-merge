import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { createGenerationSession } from '../src/generation-session'

import { hasLiteral, setupPluginTests } from './helpers'

const { copyFixture } = setupPluginTests()

describe.each(['dev', 'build'] as const)('%s generation session', (mode) => {
    test.each([false, true])('retains discoveries through consecutive failures and replaces them on success (prune: %s)', async (prune) => {
        const root = await copyFixture('app')
        const cssPath = path.join(root, 'app.css')
        const oldPath = path.join(root, 'old.pcss')
        const nextPath = path.join(root, 'next.pcss')
        const leafPath = path.join(root, 'leaf.pcss')
        const css = (file: string) => `@import 'tailwindcss' source(none); @import './${file}'; @source inline('text-huge text-big text-sm');`
        await writeFile(cssPath, css('old.pcss'))
        await writeFile(oldPath, '@theme { --text-huge: 3rem; }')
        const watched = new Set<string>()
        const session = createGenerationSession({
            cssRoot: Promise.resolve(cssPath),
            root,
            integration: { onDependency: (file) => { watched.add(file) } },
            prune: prune ? { autoDetectBases: [root] } : undefined,
            onGenerated: () => {},
            onError(error) { if (mode === 'build') { throw error } },
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
                const expectedFailure = { error: expect.objectContaining({
                    message: expect.stringContaining(path.basename(missingPath)),
                }) }
                expect(outcome).toEqual(mode === 'build' ? expectedFailure : { value: first })
                expect(session.current).toBe(first)
                expect(session.dependencies.has(oldPath)).toBe(true)
                expect(session.dependencies.has(missingPath)).toBe(true)
                expect(watched.has(missingPath)).toBe(true)
                await writeFile(missingPath, missingPath === nextPath
                    ? "@import './leaf.pcss';"
                    : '@theme { --text-big: 4rem; }')
            }

            const recovered = await (mode === 'build' ? session.refresh() : session.regenerate())
            expect(hasLiteral(recovered!.code, 'big')).toBe(true)
            expect(hasLiteral(recovered!.code, 'huge')).toBe(false)
            expect(session.dependencies.has(oldPath)).toBe(false)
            expect(session.dependencies.has(nextPath)).toBe(true)
            expect(session.dependencies.has(leafPath)).toBe(true)
            await expect(session.refresh()).resolves.toBe(recovered)
        } finally {
            await session.dispose()
        }
    })
})
