import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { createTailwindMerge, twMerge as defaultTwMerge } from '../../src'
import { generate } from '../src'
import { declaredProperties, loadDesignSystems } from '../src/design-system'

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
        const classNames = designSystem.getClassList().map(([className]) => className)

        expect(classNames.length).toBeGreaterThan(20_000)

        // Neighboring entries in the class list mostly share a utility root, so pairing them yields a high density of actual conflicts. Every consecutive pair is swept — no sampling. Where generated and default config disagree, Tailwind itself referees: two classes conflict when their compiled declarations overlap. The generated config must always match the oracle; places where the default config doesn't are known misclassifications that exact theme knowledge fixes, and they are snapshotted below as the intended-divergence report.
        const failures: { input: string; generated: string; default: string; oracle: string }[] = []
        const improvementsOverDefault: string[] = []

        for (let index = 0; index + 1 < classNames.length; index += 1) {
            const first = classNames[index]!
            const second = classNames[index + 1]!
            const input = `${first} ${second}`
            const generatedResult = generatedTwMerge(input)
            const defaultResult = defaultTwMerge(input)

            if (generatedResult === defaultResult) {
                continue
            }

            const firstProperties = declaredProperties(designSystem, first)
            const secondProperties = declaredProperties(designSystem, second)
            const conflictExpected =
                firstProperties !== null &&
                secondProperties !== null &&
                [...firstProperties].some((property) => secondProperties.has(property))
            const oracleResult = conflictExpected ? second : input

            if (generatedResult === oracleResult) {
                improvementsOverDefault.push(`${input} → ${oracleResult} (default: ${defaultResult})`)
            } else {
                failures.push({
                    input,
                    generated: generatedResult,
                    default: defaultResult,
                    oracle: oracleResult,
                })
            }
        }

        expect(failures).toEqual([])
        expect(improvementsOverDefault).toMatchSnapshot()
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
})
