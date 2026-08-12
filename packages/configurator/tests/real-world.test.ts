import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { assertTailwindConformance, generateFixture } from './fixture-utils'

// Pinned CSS entrypoints of six public Tailwind v4 projects (see fixtures/real-world/README.md for sources, licenses, and preprocessing). Each runs the full pipeline: generation, the conformance sweep over every consecutive class-list pair, and a snapshot of the emitted module — which doubles as documentation of what generated output looks like for real projects. One curated expectation per project pins the finding that made it worth including.
const PROJECTS = [
    {
        name: 'shadcn',
        entry: 'shadcn/globals.css',
        // border-grid is @apply border-border/50 dark:border-border — an alias of the border-color group, so it merges with border colors in both directions.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('border-green-950 border-grid')).toBe('border-grid')
            expect(twMerge('border-grid border-green-950')).toBe('border-green-950')
        },
    },
    {
        name: 'supabase',
        entry: 'supabase/config/tailwind.config.css',
        // --background-color-200 is a numeric-named sub-namespace color token: mask-b-from-200 is a color stop composing with position stops. The hit-area family carries per-side state in --hit-area-* variables behind identical ::before scaffolding, so siblings compose while broader values subsume narrower ones.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('mask-b-from-100% mask-b-from-200')).toBe(
                'mask-b-from-100% mask-b-from-200',
            )
            expect(twMerge('mask-b-from-red-500 mask-b-from-200')).toBe('mask-b-from-200')
            expect(twMerge('hit-area-l-96 hit-area-r-0')).toBe('hit-area-l-96 hit-area-r-0')
            expect(twMerge('hit-area-l-2 hit-area-4')).toBe('hit-area-4')
        },
    },
    {
        name: 'openai-fm',
        entry: 'openai-fm/globals.css',
        // Custom shadow values from a mixed `@theme static` / `@theme inline` setup join the shadow scale.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('shadow-textarea shadow-lg')).toBe('shadow-lg')
        },
    },
    {
        name: 'flowbite',
        entry: 'flowbite/src/app.css',
        // A --z-index-* namespace the default config has no theme key for; the augmentation pass picks the values up.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('shadow-inner shadow-lg')).toBe('shadow-lg')
        },
    },
    {
        name: 'kite',
        entry: 'kite/app.css',
        // Custom z-index values (z-modal, z-tooltip, …) merge with each other and the numeric scale, issue #657's pattern in the wild.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('z-modal z-tooltip')).toBe('z-tooltip')
            expect(twMerge('z-50 z-modal')).toBe('z-modal')
        },
    },
    {
        name: 'remix-store',
        entry: 'remix-store/tailwind.css',
        // Custom animation and easing values join their scales; multi-namespace resets shrink the config.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('animate-pulse animate-marquee')).toBe('animate-marquee')
            expect(twMerge('ease-out ease-snap')).toBe('ease-snap')
        },
    },
    {
        name: 'replit',
        entry: 'replit/theme.css',
        // The design system that motivated this project: utility-specific color sub-namespaces (--text-color-*, --border-color-*, --outline-color-*) and dedicated spacing namespaces (--padding-*, --gap-*, --inset-*) invisible to the default config. border-thin is a width, not a color, so it composes with border colors instead of wrongly conflicting; p-md/gap-md merge within their utilities; custom easings and outline offsets merge as scale values.
        curated: (twMerge: (classList: string) => string) => {
            expect(twMerge('text-secondary-text text-placeholder-text')).toBe(
                'text-placeholder-text',
            )
            expect(twMerge('text-secondary-text text-sm')).toBe('text-secondary-text text-sm')
            expect(twMerge('border-thin border-surface-border-subtle')).toBe(
                'border-thin border-surface-border-subtle',
            )
            expect(twMerge('border-thin border-thick')).toBe('border-thick')
            expect(twMerge('p-md p-4')).toBe('p-4')
            expect(twMerge('gap-md gap-2')).toBe('gap-2')
            expect(twMerge('inset-xs inset-2xl')).toBe('inset-2xl')
            expect(twMerge('ease-snappy ease-chill')).toBe('ease-chill')
            expect(twMerge('outline-offset-thin outline-offset-2')).toBe('outline-offset-2')
            // The deprecated start-*/end-* spellings compile from --inset-* too, but Tailwind never suggests them — alias probing covers them.
            expect(twMerge('start-xs start-2xl')).toBe('start-2xl')
            expect(twMerge('end-sm inset-e-xl')).toBe('inset-e-xl')
            // Axis shorthands compile to logical properties in v4 and evict the logical sides — the default-config fix this fixture's design system prompted (PR #705), inherited since the rebase onto main.
            expect(twMerge('ps-md px-xl')).toBe('px-xl')
            expect(twMerge('start-sm inset-x-lg')).toBe('inset-x-lg')
        },
    },
]

describe.each(PROJECTS)('$name', ({ name, entry, curated }) => {
    const entryUrl = new URL(`fixtures/real-world/${entry}`, import.meta.url)
    const fixturePromise = readFile(entryUrl, 'utf8').then((css) =>
        generateFixture(css, fileURLToPath(new URL('.', entryUrl))),
    )

    test('conforms to Tailwind conflict semantics across the class list', async () => {
        const { twMerge, plan, designSystem } = await fixturePromise
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('leaves nothing unassigned', async () => {
        const { plan } = await fixturePromise
        expect(plan.report.unassignedClasses).toEqual([])
    })

    // eslint-disable-next-line vitest/expect-expect -- the assertions live in each project's `curated` callback above
    test('project-specific merges work', async () => {
        const { twMerge } = await fixturePromise
        curated(twMerge)
    })

    test('emitted module matches its file snapshot', async () => {
        const { code } = await fixturePromise
        await expect(code).toMatchFileSnapshot(`./__snapshots__/real-world/${name}.snap.ts`)
    })
})
