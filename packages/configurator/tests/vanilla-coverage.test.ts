import { describe, expect, test } from 'vitest'
import { createClassGroupUtils } from 'tailwind-merge/unstable-do-not-import'

import { declaredDeclarations } from '../src/design-system'

import { generateFixture } from './fixture-utils'
import { acceptableResults, mergeVerdict } from './oracle'

/**
 * Divergences from Tailwind's compiled CSS that tailwind-merge has decided on purpose, keyed by class-group pair (`first → second`, `*` matching any first group). The oracle is right about the cascade here but the library is right about intent: these utilities are written as compositions or toggles, not as overrides, so the later class must not evict the earlier one. They are left out of the ratchet snapshots — and a test below checks that each entry still diverges, so an entry goes stale the day the library changes its mind and has to be removed.
 */
const INTENTIONAL_DIVERGENCES: { pair: string; reason: string }[] = [
    // `grid-column: span 2` after `grid-column-start: 1` does re-declare the start line, but Tailwind documents `col-start-* col-span-*` as the way to place an item (the longhand rule sorts after the shorthand rule in its stylesheet, so the start line wins in CSS regardless of class order). tailwind-merge had the edge in v1.8.0 and removed it in v1.8.1 after issue #176 (PR #177, "Fix incorrect class group conflicts in grid-related classes").
    { pair: 'col-start → col-start-end', reason: 'composition, tailwind-merge#176' },
    { pair: 'col-end → col-start-end', reason: 'composition, tailwind-merge#176' },
    { pair: 'row-start → row-start-end', reason: 'composition, tailwind-merge#176' },
    { pair: 'row-end → row-start-end', reason: 'composition, tailwind-merge#176' },
    // `sr-only` resets position, size, padding, margin, overflow, clip and white-space, so it does control an earlier `p-4` — but it is a toggle that `not-sr-only` (typically under a breakpoint variant: `sr-only md:not-sr-only`) reverts, and the classes it hides must survive for that moment. The library's `sr` group therefore conflicts with nothing.
    { pair: '* → sr', reason: 'toggle, reverted by not-sr-only' },
]

// The generated vanilla config classifies existing classes exactly like tailwind-merge's default config (generate.test.ts proves that), so checking it against Tailwind itself checks the default config too — something the library's own suite cannot do, because only this package has Tailwind's compiler at hand. The checks here are deliberately absolute rather than differential: the conformance sweep only asks Tailwind where generated and default config disagree, and 97 % of its consecutive pairs share a class group, so gaps both configs inherit and cross-group conflict semantics never reach it. Every test snapshots its known divergences, grouped and with one example each, as a ratchet: a new line is a regression (or a newly found gap) to look at, a removed line is a fix. Divergences the library maintains on purpose live in `INTENTIONAL_DIVERGENCES` instead.
describe('the generated vanilla config against Tailwind itself', async () => {
    const { config, twMerge, designSystem } = await generateFixture("@import 'tailwindcss';")
    const { getClassGroupId } = createClassGroupUtils(config)
    const classNames = designSystem.getClassList().map(([className]) => className)

    // Two exemplars per group (the first two suggested classes that compile), so value-dependent shapes like `border-x` vs `border-x-2` get a second chance.
    const exemplars = new Map<string, string[]>()
    for (const className of classNames) {
        const classGroupId = getClassGroupId(className)
        if (classGroupId === undefined) {
            continue
        }
        const names = exemplars.get(classGroupId) ?? []
        if (names.length < 2 && declaredDeclarations(designSystem, className) !== null) {
            exemplars.set(classGroupId, [...names, className])
        }
    }

    test('every class Tailwind suggests is classified — known gaps listed by utility root', async () => {
        const unclassified = classNames.filter(
            (className) =>
                getClassGroupId(className) === undefined &&
                declaredDeclarations(designSystem, className) !== null,
        )
        const byRoot = new Map<string, string[]>()
        for (const className of unclassified) {
            const root = className.replace(/^-/, '').split('-')[0]!
            byRoot.set(root, [...(byRoot.get(root) ?? []), className])
        }
        const lines = [...byRoot]
            .sort(([first], [second]) => first.localeCompare(second))
            .map(([root, names]) => `${root}: ${names.join(' ')}`)
        await expect(lines.join('\n') + '\n').toMatchFileSnapshot(
            './__snapshots__/vanilla-coverage/unclassified-classes.txt',
        )
    })

    test('every consecutive pair, adjudicated by Tailwind — known divergences listed by class-group pair', async () => {
        const divergences = new Map<string, string>()
        for (let index = 0; index + 1 < classNames.length; index += 1) {
            const divergence = describeDivergence(classNames[index]!, classNames[index + 1]!)
            if (divergence && !isIntentional(divergence.key)) {
                divergences.set(divergence.key, divergence.line)
            }
        }
        await expect(formatDivergences(divergences)).toMatchFileSnapshot(
            './__snapshots__/vanilla-coverage/consecutive-pairs.txt',
        )
    })

    test('every interfering pair of class-group exemplars, in both orders — known divergences listed by class-group pair', async () => {
        // 373 groups make ~530k ordered exemplar pairs, a sub-second job because only interfering pairs reach the merge functions.
        expect(exemplars.size).toBeGreaterThan(300)

        const divergences = new Map<string, string>()
        for (const [firstGroupId, firstNames] of exemplars) {
            for (const [secondGroupId, secondNames] of exemplars) {
                if (firstGroupId === secondGroupId) {
                    continue
                }
                for (const first of firstNames) {
                    for (const second of secondNames) {
                        const divergence = describeDivergence(first, second)
                        if (divergence && !isIntentional(divergence.key)) {
                            divergences.set(divergence.key, divergence.line)
                        }
                    }
                }
            }
        }
        await expect(formatDivergences(divergences)).toMatchFileSnapshot(
            './__snapshots__/vanilla-coverage/class-group-pairs.txt',
        )
    })

    test('every intentional divergence still diverges — a stale entry means the library changed and the entry must go', () => {
        const stale = INTENTIONAL_DIVERGENCES.filter(({ pair }) => {
            const [firstPattern, secondGroupId] = pair.split(' → ') as [string, string]
            for (const [firstGroupId, firstNames] of exemplars) {
                if (
                    firstGroupId === secondGroupId ||
                    (firstPattern !== '*' && firstGroupId !== firstPattern)
                ) {
                    continue
                }
                for (const first of firstNames) {
                    for (const second of exemplars.get(secondGroupId) ?? []) {
                        if (describeDivergence(first, second)) {
                            return false
                        }
                    }
                }
            }
            return true
        })
        expect(stale).toEqual([])
    })

    /** Where the generated config's merge of `first second` disagrees with Tailwind's verdict — keyed by class-group pair so the snapshots list one example per pair, and null when the pair agrees or one class compiles to nothing. */
    function describeDivergence(first: string, second: string): { key: string; line: string } | null {
        const firstDeclarations = declaredDeclarations(designSystem, first)
        const secondDeclarations = declaredDeclarations(designSystem, second)
        if (firstDeclarations === null || secondDeclarations === null) {
            return null
        }
        const verdict = mergeVerdict(firstDeclarations, secondDeclarations)
        if (verdict === 'either') {
            return null
        }
        const result = twMerge(`${first} ${second}`)
        if (acceptableResults(verdict, first, second).includes(result)) {
            return null
        }
        const key = `${getClassGroupId(first) ?? '(unclassified)'} → ${getClassGroupId(second) ?? '(unclassified)'}`
        const outcome = verdict === 'merge' ? 'kept both, Tailwind: merge' : 'merged, Tailwind: keep both'
        return { key, line: `${key}  |  ${first} ${second}  |  ${outcome}` }
    }
})

function isIntentional(key: string): boolean {
    const [, secondGroupId] = key.split(' → ')
    return INTENTIONAL_DIVERGENCES.some(
        ({ pair }) => pair === key || pair === `* → ${secondGroupId}`,
    )
}

function formatDivergences(divergences: Map<string, string>): string {
    return (
        [...divergences.values()].sort((first, second) => first.localeCompare(second)).join('\n') +
        '\n'
    )
}
