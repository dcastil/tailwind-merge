import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { assertTailwindConformance, generateFixture } from './fixture-utils'

// Custom @utility definitions get bounded support: each root becomes a self-conflict group (static roots as single classes, functional roots matching any value), with no inferred conflicts against built-in groups — see PROPOSAL.md for the scope decision.
describe('theme with custom @utility definitions', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@utility btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
}
@utility scrollbar-hide {
    scrollbar-width: none;
}
@utility zz-* {
    tab-size: --value(integer);
}
`)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('custom utilities merge against themselves', () => {
        expect(twMerge('btn btn')).toBe('btn')
        expect(twMerge('zz-2 zz-4')).toBe('zz-4')
        expect(twMerge('zz-[13] zz-2')).toBe('zz-2')
    })

    test('custom utilities never conflict across groups', () => {
        expect(twMerge('btn zz-2')).toBe('btn zz-2')
        expect(twMerge('btn p-4')).toBe('btn p-4')
        expect(twMerge('scrollbar-hide btn')).toBe('scrollbar-hide btn')
    })

    test('reports the self-conflict groups and leaves nothing unassigned', () => {
        expect(plan.report.customUtilityGroups.sort()).toEqual([
            'utility.btn',
            'utility.scrollbar-hide',
            'utility.zz',
        ])
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Plugin-registered utilities land in the same registry as @utility definitions, so the same bounded self-conflict support covers them.
describe('theme with a JS plugin via @plugin', async () => {
    const fixtureDirectory = fileURLToPath(new URL('fixtures/plugin/', import.meta.url))
    const { twMerge, plan, designSystem } = await generateFixture(
        `
@import 'tailwindcss';
@plugin './plugin.mjs';
`,
        fixtureDirectory,
    )

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('plugin utilities merge against themselves', () => {
        expect(twMerge('glow glow')).toBe('glow')
        expect(twMerge('tint-subtle tint-strong')).toBe('tint-strong')
        expect(twMerge('glow tint-subtle')).toBe('glow tint-subtle')
    })

    test('reports the plugin utility groups', () => {
        expect(plan.report.customUtilityGroups.sort()).toEqual(['utility.glow', 'utility.tint'])
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Legacy JS configs loaded via @config flow through Tailwind's compat layer into namespaced theme variables, so the standard flow plus augmentation handles them like CSS-authored themes.
describe('theme from a legacy JS config via @config', async () => {
    const fixtureDirectory = fileURLToPath(new URL('fixtures/js-config/', import.meta.url))
    const { twMerge, plan, designSystem } = await generateFixture(
        `
@import 'tailwindcss';
@config './tailwind.config.cjs';
`,
        fixtureDirectory,
    )

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('JS-config theme values merge like CSS-authored ones', () => {
        expect(twMerge('bg-brand-500 bg-brand-900')).toBe('bg-brand-900')
        expect(twMerge('bg-brand-500 bg-red-500')).toBe('bg-red-500')
        expect(twMerge('z-header z-modal')).toBe('z-modal')
        expect(twMerge('border-hairline border-2')).toBe('border-2')
        expect(twMerge('border-hairline border-brand-500')).toBe(
            'border-hairline border-brand-500',
        )
    })

    test('leaves nothing unassigned', () => {
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Prefix mode: the design system stores theme variables prefixed and candidates carry a variant-like prefix. The conformance sweep doesn't apply — the class list is unprefixed while real candidates are prefixed, so the default-config baseline is meaningless here — making this the one fixture family verified by curated expectations only.
describe('theme with an import prefix', async () => {
    const { twMerge, plan } = await generateFixture(`
@import 'tailwindcss' prefix(tw);
@theme {
    --color-brand-500: #33f;
    --text-huge: 2.5rem;
}
`)

    test('prefixed classes merge', () => {
        expect(twMerge('tw:p-2 tw:p-4')).toBe('tw:p-4')
        expect(twMerge('tw:bg-brand-500 tw:bg-red-500')).toBe('tw:bg-red-500')
        expect(twMerge('tw:text-huge tw:text-sm')).toBe('tw:text-sm')
        expect(twMerge('tw:hover:p-2 tw:hover:p-4')).toBe('tw:hover:p-4')
    })

    test('unprefixed classes pass through untouched', () => {
        expect(twMerge('p-2 p-4')).toBe('p-2 p-4')
    })

    test('reports the prefix', () => {
        expect(plan.prefix).toBe('tw')
    })
})
