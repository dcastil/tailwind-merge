import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { createTailwindMerge } from '../../src'
import { generate } from '../src'

const base = fileURLToPath(new URL('.', import.meta.url))

async function generateTwMerge(css: string) {
    const { code, config, plan } = await generate({ css, base })
    return { code, twMerge: createTailwindMerge(() => config), plan }
}

// Modeled on a typical design-system setup: the color palette reset and replaced with a custom one, utility-specific compat sub-namespaces (--background-color-*, --text-color-*), a custom font size with a compound line-height key, and namespaces tailwind-merge has no theme key for (--z-index-*, --border-width-*). Reproduces the scenarios from issues #684 (custom --text-* misread as color), #657 (--z-index), and #631 (--border-width).
const designSystemCss = `
@import 'tailwindcss';
@theme {
    --color-*: initial;
    --color-brand-100: #eef;
    --color-brand-500: #33f;
    --background-color-surface: #fff;
    --text-color-primary: #111;
    --text-color-secondary: #666;
    --text-huge: 2.5rem;
    --text-huge--line-height: 1.1;
    --spacing-big: 30rem;
    --radius-control: 8px;
    --z-index-header: 10;
    --z-index-modal: 100;
    --border-width-hairline: 0.5px;
}
`

describe('design-system theme with compat sub-namespaces and resets', async () => {
    const { code, twMerge, plan } = await generateTwMerge(designSystemCss)

    test('emitted module matches its file snapshot', async () => {
        // File snapshots keep the emitted module reviewable as real TypeScript, and being inside tests/ they are type-checked by the package's `test:types` script.
        await expect(code).toMatchFileSnapshot('./__snapshots__/sub-namespaces.snap.ts')
    })

    test('merges custom classes from standard namespaces', () => {
        expect(twMerge('bg-brand-100 bg-brand-500')).toBe('bg-brand-500')
        expect(twMerge('p-big p-2')).toBe('p-2')
        expect(twMerge('rounded-control rounded-lg')).toBe('rounded-lg')
    })

    test('custom font size conflicts with font sizes, not with colors (#684)', () => {
        expect(twMerge('text-huge text-sm')).toBe('text-sm')
        expect(twMerge('text-sm text-huge')).toBe('text-huge')
        expect(twMerge('text-huge text-primary')).toBe('text-huge text-primary')
    })

    test('sub-namespace color classes join the right color groups', () => {
        expect(twMerge('bg-surface bg-brand-500')).toBe('bg-brand-500')
        expect(twMerge('bg-brand-500 bg-surface')).toBe('bg-surface')
        expect(twMerge('text-primary text-secondary')).toBe('text-secondary')
    })

    test('z-index values without a theme key merge (#657)', () => {
        expect(twMerge('z-header z-modal')).toBe('z-modal')
        expect(twMerge('z-header z-10')).toBe('z-10')
        expect(twMerge('z-10 z-header')).toBe('z-header')
    })

    test('border-width values without a theme key merge (#631)', () => {
        expect(twMerge('border-hairline border-2')).toBe('border-2')
        expect(twMerge('border-hairline border-brand-500')).toBe(
            'border-hairline border-brand-500',
        )
    })

    test('reset color palette values stop merging', () => {
        expect(twMerge('bg-red-500 bg-brand-500')).toBe('bg-red-500 bg-brand-500')
    })

    test('reports the augmentations', () => {
        expect(plan.report.augmentedClassGroups).toMatchObject({
            'bg-color': ['bg-surface'],
            'text-color': ['text-primary', 'text-secondary'],
            z: ['z-header', 'z-modal'],
            'border-w': ['border-hairline'],
        })
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

describe('theme with disabled spacing multiplier', async () => {
    const { code, twMerge, plan } = await generateTwMerge(`
@import 'tailwindcss';
@theme {
    --spacing: initial;
    --spacing-*: initial;
    --spacing-sm: 8px;
    --spacing-lg: 24px;
}
`)

    test('emitted module matches its file snapshot', async () => {
        await expect(code).toMatchFileSnapshot('./__snapshots__/spacing-named.snap.ts')
    })

    test('named spacing values merge, numeric ones no longer exist', () => {
        expect(twMerge('p-sm p-lg')).toBe('p-lg')
        expect(twMerge('m-lg m-sm')).toBe('m-sm')
        expect(twMerge('p-2 p-4')).toBe('p-2 p-4')
        expect(twMerge('p-sm p-2')).toBe('p-sm p-2')
    })

    test('drops the number validator from the spacing scale', () => {
        expect(plan.report.scaleStrategies['spacing']).toBe('enumerated')
    })
})

// Heavy resets document what pruning does and doesn't do: scales empty out, but class groups survive because they still accept arbitrary values — so reset theme values stop merging while the arbitrary syntax keeps working.
describe('minimal theme with heavy resets', async () => {
    const { code, twMerge, plan } = await generateTwMerge(`
@import 'tailwindcss';
@theme {
    --color-*: initial;
    --color-ink: #111;
    --color-paper: #fff;
    --shadow-*: initial;
    --animate-*: initial;
    --blur-*: initial;
}
`)

    test('emitted module matches its file snapshot', async () => {
        await expect(code).toMatchFileSnapshot('./__snapshots__/minimal-resets.snap.ts')
    })

    test('reset scale values stop merging while arbitrary values keep working', () => {
        expect(twMerge('bg-ink bg-paper')).toBe('bg-paper')
        expect(twMerge('shadow-sm shadow-lg')).toBe('shadow-sm shadow-lg')
        expect(twMerge('shadow-[0_1px_2px_black] shadow-[0_2px_4px_black]')).toBe(
            'shadow-[0_2px_4px_black]',
        )
        expect(twMerge('animate-spin animate-bounce')).toBe('animate-spin animate-bounce')
    })

    test('reports the emptied scales', () => {
        expect(plan.report.scaleStrategies['shadow']).toBe('empty')
        expect(plan.report.scaleStrategies['animate']).toBe('empty')
        expect(plan.report.scaleStrategies['blur']).toBe('empty')
    })
})
