import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'
import { createTailwindMerge } from 'tailwind-merge'

import { generate } from '../src'
import { materializeConfig } from '../src/materialize'
import { prunePlan } from '../src/prune'

import {
    assertPruningEquivalence,
    css,
    generateFixture,
    sampleUsedClasses,
} from './fixture-utils'

const base = fileURLToPath(new URL('.', import.meta.url))

describe('pruning a vanilla config', () => {
    const fullPromise = generate({ css: "@import 'tailwindcss';", base })

    test('keeps only the groups and members that used classes reach', async () => {
        const full = await fullPromise
        const usedClasses = [
            'p-4',
            'hover:p-8',
            'md:px-2',
            'text-red-500/50',
            'bg-[url(/a.png)]',
            '-mt-2',
            'rounded-md!',
            'flex',
            'items-center',
            // Arbitrary properties classify into dynamic groups that never live in the plan — counted as classified, nothing to prune for them.
            '[mask-type:luminance]',
            'not-a-class',
            'const',
            // Duplicates count once.
            'p-4',
        ]
        const pruned = prunePlan(full.plan, usedClasses)

        expect(pruned.report.pruning).toEqual({
            usedClassCount: 12,
            classifiedClassCount: 10,
            classGroupsBefore: full.plan.classGroups.size,
            classGroupsAfter: 8,
            removedClassGroups: expect.any(Array),
            unprunedClassGroups: [],
        })
        expect([...pruned.classGroups.keys()].sort()).toEqual(
            ['align-items', 'bg-image', 'display', 'mt', 'p', 'px', 'rounded', 'text-color'].sort(),
        )
        // Conflict edges survive between kept groups only.
        expect(pruned.conflictingClassGroups.get('p')).toEqual(['px'])
        expect(pruned.conflictingClassGroups.has('m')).toBe(false)

        // Within kept groups, only reached members survive: the text-color scale shrinks to the used red family, and the radius group to the used size.
        expect(JSON.stringify(pruned.classGroups.get('text-color'))).not.toContain('blue')
        expect(JSON.stringify(pruned.classGroups.get('rounded'))).not.toContain('"full"')
        // The plan is not mutated.
        expect(full.plan.classGroups.size).toBe(pruned.report.pruning!.classGroupsBefore)
        expect(JSON.stringify(full.plan.classGroups.get('text-color'))).toContain('blue')
    })

    test('merges used classes like the full config and passes unused ones through', async () => {
        const full = await fullPromise
        const usedClasses = ['p-4', 'px-2', 'text-red-500/50', 'rounded-md', 'hover:p-8']
        const prunedTwMerge = createTailwindMerge(() =>
            materializeConfig(prunePlan(full.plan, usedClasses)),
        )
        const fullTwMerge = createTailwindMerge(() => full.config)

        for (const classList of [
            'p-4 px-2',
            'px-2 p-4',
            'p-4 hover:p-8',
            'hover:p-8 hover:p-4 p-4',
            'text-red-500/50 text-red-500/80',
            'rounded-md rounded-md!',
        ]) {
            expect(prunedTwMerge(classList)).toBe(fullTwMerge(classList))
        }

        // A class outside the used set produces no CSS in a project that doesn't use it — the pruned config treats it like a non-Tailwind class instead of letting it evict a real one: the blue family is gone from the text-color scale.
        expect(fullTwMerge('text-red-500/50 text-blue-500')).toBe('text-blue-500')
        expect(prunedTwMerge('text-red-500/50 text-blue-500')).toBe('text-red-500/50 text-blue-500')
        // Unless a kept validator still covers it: the compact radius scale is the `isTshirtSize` pattern, which `rounded-md` keeps alive, so `rounded-lg` still classifies — compact semantics, unchanged by pruning. Exact encoding enumerates, so there the unused size passes through.
        expect(prunedTwMerge('rounded-md rounded-lg')).toBe('rounded-lg')
        const exact = await generate({ css: "@import 'tailwindcss';", base, encoding: 'exact' })
        const exactPrunedTwMerge = createTailwindMerge(() =>
            materializeConfig(prunePlan(exact.plan, usedClasses)),
        )
        expect(exactPrunedTwMerge('rounded-md rounded-lg')).toBe('rounded-md rounded-lg')
        expect(exactPrunedTwMerge('rounded-md rounded-md!')).toBe(fullTwMerge('rounded-md rounded-md!'))
    })

    test('behaves identically to the full config across a sampled usage of the class list', async () => {
        const full = await fullPromise
        const { designSystem } = await generateFixture("@import 'tailwindcss';")
        const usedClasses = sampleUsedClasses(designSystem, 9)
        const pruned = prunePlan(full.plan, usedClasses)

        assertPruningEquivalence(full.config, materializeConfig(pruned), usedClasses)
        expect(pruned.report.pruning!.unprunedClassGroups).toEqual([])
        expect(pruned.classGroups.size).toBeLessThan(full.plan.classGroups.size)
    })

    test('generate applies pruning as the last step and emits deterministically', async () => {
        const options = {
            css: "@import 'tailwindcss';",
            base,
            format: 'js' as const,
            prune: { usedClasses: ['p-4', 'flex', 'text-red-500', 'hover:underline'] },
        }
        const first = await generate(options)
        const second = await generate(options)

        expect(first.code).toBe(second.code)
        expect(first.plan.report.pruning?.classGroupsAfter).toBe(4)
        expect(first.config.classGroups).toHaveProperty('display')
        expect(first.config.classGroups).not.toHaveProperty('font-size')
        await expect(first.code).toMatchFileSnapshot('./__snapshots__/pruned-vanilla.snap.js')
    })
})

describe('pruning a prefixed theme with custom utilities and sub-namespace classes', () => {
    const fixturePromise = generateFixture(css`
        @import 'tailwindcss' prefix(tw);
        @theme {
            --color-brand-500: #33f;
            --text-huge: 2.5rem;
            --text-color-primary: #123;
        }
        @utility scrollbar-hide {
            scrollbar-width: none;
        }
        @utility btn {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
        }
    `)

    test('used custom and augmented classes stay classified, unused custom groups disappear', async () => {
        const { plan, config } = await fixturePromise
        const usedClasses = ['tw:btn', 'tw:p-4', 'tw:text-primary', 'tw:bg-brand-500', 'tw:text-huge']
        const pruned = prunePlan(plan, usedClasses)
        const prunedTwMerge = createTailwindMerge(() => materializeConfig(pruned))
        const fullTwMerge = createTailwindMerge(() => config)

        expect(pruned.classGroups.has('utility.btn')).toBe(true)
        expect(pruned.classGroups.has('utility.scrollbar-hide')).toBe(false)
        // The override edge inferred for the custom utility survives because both ends are used.
        expect(prunedTwMerge('tw:p-4 tw:btn')).toBe('tw:btn')
        expect(prunedTwMerge('tw:text-primary tw:text-huge')).toBe(fullTwMerge('tw:text-primary tw:text-huge'))
        expect(prunedTwMerge('tw:text-huge tw:text-primary')).toBe(fullTwMerge('tw:text-huge tw:text-primary'))
        // Unprefixed classes are external for a prefixed config, in both versions.
        expect(prunedTwMerge('p-4 tw:p-4')).toBe('p-4 tw:p-4')
        expect(pruned.report.pruning!.unprunedClassGroups).toEqual([])
    })

    test('behaves identically to the full config across a sampled usage of the class list', async () => {
        const { plan, config, designSystem } = await fixturePromise
        // Class-list names are unprefixed; real candidates carry the prefix.
        const usedClasses = sampleUsedClasses(designSystem, 11).map((className) => `tw:${className}`)
        const pruned = prunePlan(plan, usedClasses)

        assertPruningEquivalence(config, materializeConfig(pruned), usedClasses)
        expect(pruned.report.pruning!.unprunedClassGroups).toEqual([])
    })
})
