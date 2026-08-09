import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'
import { createTailwindMerge, twMerge as defaultTwMerge } from 'tailwind-merge'

import { generate } from '../src'
import { loadDesignSystems } from '../src/design-system'
import { emitModule } from '../src/emit'

import { assertTailwindConformance } from './fixture-utils'

const base = fileURLToPath(new URL('.', import.meta.url))
const vanillaCss = "@import 'tailwindcss';"

const { code, config, plan } = await generate({ css: vanillaCss, base })
const generatedTwMerge = createTailwindMerge(() => config)

describe('generate from vanilla Tailwind CSS', () => {
    test('merges existing classes like the default twMerge', () => {
        const classLists = [
            'p-2 p-3',
            'px-2 p-3',
            'p-3 px-2',
            'p-13 p-2',
            'p-px p-1',
            'm-auto -m-2',
            'inset-x-1 left-2',
            'left-2 inset-x-1',
            'w-4 h-4 size-8',
            'text-sm text-lg',
            'text-lg text-red-500',
            'text-red-500 text-lg',
            'text-base leading-7 text-lg',
            'text-xl text-[2rem]',
            'text-center text-left',
            'font-bold font-sans',
            'font-sans font-serif',
            'font-bold font-medium',
            'tracking-tight tracking-wide',
            'bg-red-500 bg-blue-600',
            'bg-red-500/50 bg-blue-600/80',
            'bg-linear-to-r bg-red-500',
            'from-red-500 via-blue-500 from-green-200',
            'rounded-lg rounded-t-md',
            'rounded-t-md rounded-lg',
            'border-2 border-red-500',
            'border-red-500 border-blue-500',
            'shadow shadow-lg',
            'shadow-lg shadow-red-500',
            'ring ring-2',
            'stroke-red-500 stroke-2',
            'grid-cols-2 grid-cols-4',
            'aspect-video aspect-square',
            'hover:p-2 hover:p-4',
            'hover:focus:p-2 focus:hover:p-4',
            '!p-2 !p-3',
            'p-[2px] p-3',
            'bg-[url(/img.png)] bg-red-500',
            'bg-transparent bg-current bg-inherit',
            'text-transparent text-red-500',
        ]

        for (const classList of classLists) {
            expect({ classList, result: generatedTwMerge(classList) }).toEqual({
                classList,
                result: defaultTwMerge(classList),
            })
        }
    })

    test('matches Tailwind conflict semantics across the design-system class list', async () => {
        const { project: designSystem } = await loadDesignSystems({ css: vanillaCss, base })
        const conformance = assertTailwindConformance(designSystem, generatedTwMerge, plan)

        // The intended-divergence report: pairs where the generated config matches Tailwind while the default config doesn't — known misclassifications that exact theme knowledge fixes.
        expect(conformance.improvementsOverDefault).toMatchSnapshot()
    })

    test('intentionally diverges from default twMerge on nonexistent class names', () => {
        // The default config's permissive color scale swallows any `bg-*` value, so a typo conflicts away a real class. The generated config knows the theme exactly and leaves unknown classes alone, like any non-Tailwind class.
        expect(defaultTwMerge('bg-doesnotexist bg-red-500')).toBe('bg-red-500')
        expect(generatedTwMerge('bg-doesnotexist bg-red-500')).toBe('bg-doesnotexist bg-red-500')
    })

    test('chooses the expected scale encodings', () => {
        expect(plan.report.scaleStrategies['color']).toBe('families')
        expect(plan.report.scaleStrategies['text']).toBe('mixed:isTshirtSize')
        expect(plan.report.scaleStrategies['spacing']).toBe('multiplier')
        expect(plan.report.scaleStrategies['font-weight']).toBe('enumerated')
    })

    test('needs no augmentations on the vanilla theme', () => {
        expect(plan.report.augmentedClassGroups).toEqual({})
        expect(plan.report.unassignedClasses).toEqual([])
    })

    test('emitted module matches its file snapshot', async () => {
        // A file snapshot instead of an inline one: the committed artifact is reviewable as real TypeScript and, living inside tests/, is type-checked against the library's public types by the package's `test:types` script.
        await expect(code).toMatchFileSnapshot('./__snapshots__/vanilla.snap.ts')
    })

    test("format: 'js' emits the same module minus the TypeScript syntax", async () => {
        const { code: jsCode } = await generate({ css: vanillaCss, base, format: 'js' })

        expect(jsCode).not.toContain('type Config')
        expect(jsCode).not.toContain('satisfies')
        // The exact delta to the TypeScript emission: the type import and the `satisfies` check — nothing that affects runtime behavior. This equality is deliberate; if the emitter grows another TS-only construct, this test forces the js format to account for it.
        expect(jsCode).toBe(
            code
                .replace(', type Config', '')
                .replace(' satisfies Config<string, never>', ''),
        )
    })

    test('importSource substitutes the module the emitted code imports from', () => {
        const emitted = emitModule(plan, { importSource: '@tailwind-merge/vite/tailwind-merge' })

        expect(emitted).toContain("from '@tailwind-merge/vite/tailwind-merge'")
        expect(emitted).not.toContain("from 'tailwind-merge'")
    })
})
