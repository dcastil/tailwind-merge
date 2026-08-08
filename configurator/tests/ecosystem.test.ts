import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { assertTailwindConformance, generateFixture } from './fixture-utils'

// Custom @utility support is empirical, in tiers derived from compiled declarations (see PROPOSAL.md): static utilities matching exactly one built-in group's signature join that group as aliases, every other root becomes a self-conflict group, and a self-conflict utility whose unconditional element-level declarations fully cover another group's gets an override edge so it removes that group's classes when it comes later.
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

    test('alias utilities join the built-in group and merge in both directions', () => {
        expect(plan.report.aliasedUtilityClasses).toEqual({ 'scrollbar-hide': 'scrollbar-w' })
        expect(twMerge('scrollbar-hide scrollbar-thin')).toBe('scrollbar-thin')
        expect(twMerge('scrollbar-thin scrollbar-hide')).toBe('scrollbar-hide')
    })

    test('a utility fully covering other groups removes their classes when it comes later, but not the other way around', () => {
        // btn sets padding and border-radius, so an earlier p-4 or rounded-lg has no visible effect left.
        expect(twMerge('p-4 btn')).toBe('btn')
        expect(twMerge('rounded-lg btn')).toBe('btn')
        expect(twMerge('px-2 rounded-t-sm btn')).toBe('btn')
        // The reverse only overrides part of btn — removing btn would lose the rest of its effect.
        expect(twMerge('btn p-4')).toBe('btn p-4')
        expect(twMerge('btn rounded-lg')).toBe('btn rounded-lg')
    })

    test('utilities covering nothing stay independent', () => {
        expect(twMerge('btn zz-2')).toBe('btn zz-2')
        expect(twMerge('scrollbar-hide btn')).toBe('scrollbar-hide btn')
    })

    test('reports the groups and overrides and leaves nothing unassigned', () => {
        expect(plan.report.customUtilityGroups.sort()).toEqual(['utility.btn', 'utility.zz'])
        expect(plan.report.customUtilityConflicts['utility.btn']).toContain('p')
        expect(plan.report.customUtilityConflicts['utility.btn']).toContain('rounded')
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Utility shapes distilled from real-world files: pseudo-element overlays (shadcn's border-ghost), conditional declarations (shadcn's extend-touch-target), and a composable family sharing scaffolding while carrying state in custom properties (supabase's hit-area). Override inference must see through all three: only unconditional element-level declarations justify removing another class.
describe('theme with pseudo-element, conditional, and state-carrying custom utilities', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@utility overlay-frame {
    position: relative;
    &::after {
        content: '';
        position: absolute;
        inset: 0;
        border-width: 1px;
        border-color: red;
    }
}
@utility touch-pad {
    @media (pointer: coarse) {
        padding: 1rem;
    }
}
@custom-variant dark (&:is(.dark *));
@utility frame-line {
    border-color: red;
    &:is(.dark *) {
        border-color: white;
    }
}
@utility expand {
    position: relative;
    &::before {
        content: '';
        position: absolute;
        inset: var(--expand-t, 0px) var(--expand-r, 0px) var(--expand-b, 0px) var(--expand-l, 0px);
    }
}
@utility expand-* {
    position: relative;
    --expand-t: --spacing(--value(number) * -1);
    --expand-r: --spacing(--value(number) * -1);
    --expand-b: --spacing(--value(number) * -1);
    --expand-l: --spacing(--value(number) * -1);
    &::before {
        content: '';
        position: absolute;
        inset: var(--expand-t, 0px) var(--expand-r, 0px) var(--expand-b, 0px) var(--expand-l, 0px);
    }
}
@utility expand-t-* {
    position: relative;
    --expand-t: --spacing(--value(number) * -1);
    &::before {
        content: '';
        position: absolute;
        inset: var(--expand-t, 0px) var(--expand-r, 0px) var(--expand-b, 0px) var(--expand-l, 0px);
    }
}
`)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('a pseudo-element border never merges with element-level borders', () => {
        expect(twMerge('border-red-500 overlay-frame')).toBe('border-red-500 overlay-frame')
        expect(twMerge('overlay-frame border-red-500')).toBe('overlay-frame border-red-500')
    })

    test('a conditional re-declaration of its own property does not stop a utility from aliasing', () => {
        expect(plan.report.aliasedUtilityClasses).toEqual({ 'frame-line': 'border-color' })
        expect(twMerge('frame-line border-red-500')).toBe('border-red-500')
        expect(twMerge('border-red-500 frame-line')).toBe('frame-line')
    })

    test('an element-level position declaration still overrides position classes', () => {
        expect(twMerge('relative overlay-frame')).toBe('overlay-frame')
        expect(twMerge('static expand-2')).toBe('expand-2')
    })

    test('conditional declarations never justify removal', () => {
        expect(twMerge('p-2 touch-pad')).toBe('p-2 touch-pad')
        expect(twMerge('touch-pad p-2')).toBe('touch-pad p-2')
    })

    test('values subsume the bare scaffold and broader values subsume narrower ones, not the other way around', () => {
        expect(twMerge('expand expand-4')).toBe('expand-4')
        expect(twMerge('expand expand-t-2')).toBe('expand-t-2')
        expect(twMerge('expand-t-2 expand-4')).toBe('expand-4')
        // The reverse directions would lose state the later class doesn't set.
        expect(twMerge('expand-4 expand')).toBe('expand-4 expand')
        expect(twMerge('expand-4 expand-t-2')).toBe('expand-4 expand-t-2')
    })

    test('values within one root merge, values of sibling roots do not', () => {
        expect(twMerge('expand-t-2 expand-t-4')).toBe('expand-t-4')
        expect(twMerge('expand-2 expand-4')).toBe('expand-4')
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
