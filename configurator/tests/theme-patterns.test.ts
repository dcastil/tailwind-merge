import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { assertTailwindConformance, generateFixture } from './fixture-utils'

// The semantic-token pattern popular in component libraries: `@theme inline` mapping semantic color names to CSS variables defined elsewhere, radius derived from a base variable, and custom animations. Notable edge: names like `border`, `input`, and `ring` collide with utility roots, and single-word names have no numeric families.
describe('semantic-token theme', async () => {
    const { code, twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@custom-variant dark (&:is(.dark *));
@theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
    --animate-accordion-down: accordion-down 0.2s ease-out;
    --animate-accordion-up: accordion-up 0.2s ease-out;
}
`)

    test('emitted module matches its file snapshot', async () => {
        await expect(code).toMatchFileSnapshot('./__snapshots__/semantic-tokens.snap.ts')
    })

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('semantic colors merge within their utility groups', () => {
        expect(twMerge('bg-background bg-muted')).toBe('bg-muted')
        expect(twMerge('text-muted-foreground text-primary')).toBe('text-primary')
        expect(twMerge('border-border border-input')).toBe('border-input')
        expect(twMerge('ring-ring ring-primary')).toBe('ring-primary')
        expect(twMerge('bg-chart-1 bg-chart-2')).toBe('bg-chart-2')
    })

    test('color names colliding with utility roots stay colors', () => {
        expect(twMerge('border-input border-2')).toBe('border-input border-2')
        expect(twMerge('ring-ring ring-2')).toBe('ring-ring ring-2')
    })

    test('derived radius values and custom animations merge', () => {
        expect(twMerge('rounded-sm rounded-xl')).toBe('rounded-xl')
        expect(twMerge('animate-accordion-down animate-spin')).toBe('animate-spin')
        expect(twMerge('animate-accordion-down animate-accordion-up')).toBe(
            'animate-accordion-up',
        )
    })

    test('needs no augmentations — everything flows through standard namespaces', () => {
        expect(plan.report.augmentedClassGroups).toEqual({})
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Value names that deliberately collide with built-in static utilities and with each other across namespaces. The conformance sweep is the main check here: whatever Tailwind's resolution decides for these collisions, the generated config must agree with it.
describe('theme with adversarial value names', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@theme {
    --color-auto: #001;
    --color-xl: #002;
    --color-solid: #003;
    --color-bottom: #004;
    --spacing-auto: 1px;
    --text-color-huge: #005;
    --text-huge: 3rem;
    --z-index-auto: 30;
    --leading-none: 1.15;
    --shadow-inner: 0 0 1px #000;
}
`)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('nothing ends up unassigned', () => {
        expect(plan.report.unassignedClasses).toEqual([])
    })

    test('resolves the name collisions', () => {
        // `drop-shadow-xl` keeps resolving as a size despite `--color-xl`, so the color claim is removed there ('restore'). `bg-bottom` now declares both a color and a position in one rule, so it belongs to no group and passes through unmerged ('neutralize', keptGroupId null).
        expect(plan.report.resolvedCollisions).toEqual(
            expect.arrayContaining([
                {
                    className: 'drop-shadow-xl',
                    keptGroupId: 'drop-shadow',
                    removedFromGroupIds: ['drop-shadow-color'],
                },
                expect.objectContaining({ className: 'bg-bottom', keptGroupId: null }),
                expect.objectContaining({ className: 'border-solid', keptGroupId: null }),
            ]),
        )
    })

    test('a name defined as both font size and text color follows Tailwind, which resolves color first', () => {
        expect(twMerge('text-huge text-red-500')).toBe('text-red-500')
        expect(twMerge('text-huge text-lg')).toBe('text-huge text-lg')
    })

    test('classes resolving as multiple utilities at once pass through unmerged', () => {
        // With `--color-bottom` defined, `bg-bottom` declares background-color AND background-position in one rule. Merging it away in either direction would silently lose one of the effects, so it behaves like a non-Tailwind class.
        expect(twMerge('bg-bottom bg-bottom-left')).toBe('bg-bottom bg-bottom-left')
        expect(twMerge('bg-bottom bg-red-500')).toBe('bg-bottom bg-red-500')
        expect(twMerge('border-solid border-dashed')).toBe('border-solid border-dashed')
    })

    test('shadowed names keep working for the utilities that resolve them the old way', () => {
        expect(twMerge('drop-shadow-xl drop-shadow-xs')).toBe('drop-shadow-xs')
        expect(twMerge('drop-shadow-xl drop-shadow-red-500')).toBe(
            'drop-shadow-xl drop-shadow-red-500',
        )
    })
})

// Broad extension of many standard namespaces at once, without any resets — the bread-and-butter case of a team adding values everywhere.
describe('theme extending many namespaces', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@theme {
    --container-8xl: 88rem;
    --tracking-tightest: -0.06em;
    --aspect-golden: 1.618;
    --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
    --blur-4xl: 96px;
    --radius-pill: 999px;
    --font-display: 'Satoshi', sans-serif;
    --font-weight-950: 950;
    --text-shadow-glow: 0 0 8px #fff;
    --drop-shadow-heavy: 0 4px 6px rgb(0 0 0 / 40%);
    --inset-shadow-deep: inset 0 4px 8px rgb(0 0 0 / 30%);
    --perspective-cinema: 2400px;
}
`)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('extended values merge within their groups', () => {
        expect(twMerge('max-w-8xl max-w-sm')).toBe('max-w-sm')
        expect(twMerge('tracking-tightest tracking-wide')).toBe('tracking-wide')
        expect(twMerge('aspect-golden aspect-video')).toBe('aspect-video')
        expect(twMerge('ease-snappy ease-in')).toBe('ease-in')
        expect(twMerge('blur-4xl blur-sm')).toBe('blur-sm')
        expect(twMerge('rounded-pill rounded-lg')).toBe('rounded-lg')
        expect(twMerge('text-shadow-glow text-shadow-sm')).toBe('text-shadow-sm')
        expect(twMerge('drop-shadow-heavy drop-shadow-xl')).toBe('drop-shadow-xl')
        expect(twMerge('inset-shadow-deep inset-shadow-sm')).toBe('inset-shadow-sm')
        expect(twMerge('perspective-cinema perspective-near')).toBe('perspective-near')
    })

    test('font family and font weight stay distinct groups despite sharing a root', () => {
        expect(twMerge('font-display font-sans')).toBe('font-sans')
        expect(twMerge('font-950 font-bold')).toBe('font-bold')
        expect(twMerge('font-display font-950')).toBe('font-display font-950')
    })

    test('only the container fan-out to logical-property sizing needs augmentation', () => {
        // `--container-*` also powers the inline-size utilities, which the standard namespace flow doesn't cover — the vanilla-diff pass picks those classes up.
        expect(plan.report.augmentedClassGroups).toEqual({
            'inline-size': ['inline-8xl'],
            'max-inline-size': ['max-inline-8xl'],
            'min-inline-size': ['min-inline-8xl'],
        })
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Name shapes and constructs collected from real-world v4 files: reset-then-re-added color keywords, numeric-alpha suffixes forming families, underscore and camelCase names, dotted values, a bare namespace-root variable, keyframes inside @theme, a second @theme block with an option, junk keys in wrong namespaces, and :root variables that mimic theme keys but must not become tokens.
describe('theme with wild value names and mixed blocks', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(`
@import 'tailwindcss';
@theme {
    --color-*: initial;
    --color-inherit: inherit;
    --color-current: currentColor;
    --color-transparent: transparent;
    --color-black-10: rgb(0 0 0 / 10%);
    --color-black-30: rgb(0 0 0 / 30%);
    --color-_hidden-100: #001;
    --color-code_block-1: #002;
    --shadow: 0 1px 2px rgb(0 0 0 / 5%);
    --spacing-4.5: 1.125rem;
    --animate-fadeIn: fadeIn 0.3s ease-out;
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    --container-padding: 2rem;
    --transition-speed: 0.2s;
}
@theme static {
    --radius-huge: 2rem;
}
:root {
    --shadow-x: 4px;
    --color-fake-500: #003;
}
`)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('re-added color keywords and unusual names merge', () => {
        expect(twMerge('bg-transparent bg-black-10')).toBe('bg-black-10')
        expect(twMerge('bg-black-10 bg-black-30')).toBe('bg-black-30')
        expect(twMerge('bg-_hidden-100 bg-code_block-1')).toBe('bg-code_block-1')
        expect(twMerge('p-4.5 p-2')).toBe('p-2')
        expect(twMerge('animate-fadeIn animate-spin')).toBe('animate-spin')
    })

    test('a second @theme block with an option merges in', () => {
        expect(twMerge('rounded-huge rounded-sm')).toBe('rounded-sm')
    })

    test('plain :root variables never become theme tokens', () => {
        expect(twMerge('bg-fake-500 bg-black-10')).toBe('bg-fake-500 bg-black-10')
        expect(twMerge('shadow-x shadow-lg')).toBe('shadow-x shadow-lg')
    })

    test('nothing ends up unassigned', () => {
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Multi-file setups resolve @import chains through Tailwind's own loader; the theme lives in a separate tokens file.
describe('theme split across imported files', async () => {
    const fixtureDirectory = fileURLToPath(new URL('fixtures/multi-file/', import.meta.url))
    const css = await readFile(new URL('fixtures/multi-file/app.css', import.meta.url), 'utf8')
    const { twMerge, plan, designSystem } = await generateFixture(css, fixtureDirectory)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('theme values from the imported file merge', () => {
        expect(twMerge('bg-brand-500 bg-brand-100')).toBe('bg-brand-100')
        expect(twMerge('p-gutter p-4')).toBe('p-4')
    })
})
