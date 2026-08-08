import { fileURLToPath } from 'node:url'

import { expect } from 'vitest'

import { createTailwindMerge, twMerge as defaultTwMerge } from '../../src'
import { ConfigPlan, generate } from '../src'
import { DesignSystemAccess, declaredDeclarations, loadDesignSystems } from '../src/design-system'

export const fixtureBase = fileURLToPath(new URL('.', import.meta.url))

/**
 * Generates a config from fixture CSS and bundles everything fixture tests need: the merge function built from the materialized config, the plan report, the emitted code, and the loaded design system for conformance sweeps.
 */
export async function generateFixture(css: string, base: string = fixtureBase) {
    const { code, config, plan } = await generate({ css, base })
    const { project } = await loadDesignSystems({ css, base })

    return {
        code,
        plan,
        twMerge: createTailwindMerge(() => config),
        designSystem: project,
    }
}

export interface ConformanceResult {
    /** Number of consecutive class-list pairs checked. */
    checkedPairs: number
    /** Pairs where generated and default config disagreed and Tailwind's compiled declarations refereed. */
    adjudicated: number
    /** Adjudicated pairs where the generated config matches Tailwind while the default config doesn't — the intended divergences. */
    improvementsOverDefault: string[]
}

/**
 * The central correctness invariant, applicable to any theme: for every consecutive pair of the design system's class list, the generated merge result must equal the default twMerge result — and where the two configs disagree, Tailwind itself referees: two classes conflict when their compiled declarations (custom properties included, `@property` registrations stripped) overlap, and classes that compile to nothing cannot conflict at all.
 *
 * That last rule makes the invariant theme-independent: reset theme values stop compiling and therefore stop conflicting, custom values compile and must merge, and misclassifications on either side surface as oracle failures. Neighboring entries in the sorted class list mostly share a utility root, so consecutive pairs yield a high density of real conflicts — including between theme-created classes and their built-in siblings. Fails the test on any pair where the generated config contradicts the oracle.
 */
export function assertTailwindConformance(
    designSystem: DesignSystemAccess,
    generatedTwMerge: (classList: string) => string,
    plan: ConfigPlan,
): ConformanceResult {
    const classNames = designSystem.getClassList().map(([className]) => className)
    // Sanity guard against a broken or empty design system; themes with heavy resets legitimately drop far below the vanilla ~23k.
    expect(classNames.length).toBeGreaterThan(5_000)

    // Neutralized collision classes resolve as multiple utilities at once and deliberately pass through unmerged — no single-group oracle verdict exists for them.
    const neutralizedClassNames = new Set(
        plan.report.resolvedCollisions
            .filter((collision) => collision.keptGroupId === null)
            .map((collision) => collision.className),
    )

    const failures: { input: string; generated: string; default: string; oracle: string }[] = []
    const improvementsOverDefault: string[] = []
    let checkedPairs = 0
    let adjudicated = 0

    for (let index = 0; index + 1 < classNames.length; index += 1) {
        const first = classNames[index]!
        const second = classNames[index + 1]!
        const input = `${first} ${second}`
        checkedPairs += 1

        const generatedResult = generatedTwMerge(input)
        const defaultResult = defaultTwMerge(input)

        if (generatedResult === defaultResult) {
            continue
        }
        if (neutralizedClassNames.has(first) || neutralizedClassNames.has(second)) {
            continue
        }
        adjudicated += 1

        const firstDeclarations = declaredDeclarations(designSystem, first)
        const secondDeclarations = declaredDeclarations(designSystem, second)
        const conflictExpected =
            firstDeclarations !== null &&
            secondDeclarations !== null &&
            declarationsConflict(firstDeclarations, secondDeclarations)
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

    return { checkedPairs, adjudicated, improvementsOverDefault }
}

/**
 * Whether two classes' compiled declarations conflict. Identical property-name sets always conflict (color utilities often differ only in custom-property values). Otherwise a conflict needs interference on a real CSS property — overlap on `--tw-*` custom properties alone is composition, not conflict — with one exception: re-declaring the same property with identical `var()`-composed text (like `border-spacing: var(--tw-border-spacing-x) var(--tw-border-spacing-y)`) carries its state in the custom properties and doesn't conflict by itself.
 */
function declarationsConflict(first: Map<string, string>, second: Map<string, string>): boolean {
    if (
        first.size === second.size &&
        [...first.keys()].every((property) => second.has(property))
    ) {
        return true
    }

    for (const [firstProperty, firstValue] of first) {
        if (firstProperty.startsWith('--')) {
            continue
        }
        for (const [secondProperty, secondValue] of second) {
            if (secondProperty.startsWith('--')) {
                continue
            }
            if (!propertiesInterfere(firstProperty, secondProperty)) {
                continue
            }
            const isSharedComposition =
                firstProperty === secondProperty &&
                firstValue === secondValue &&
                firstValue.includes('var(--tw-')
            if (!isSharedComposition) {
                return true
            }
        }
    }

    return false
}

/**
 * Whether setting one CSS property interferes with the other. Beyond equality this covers shorthands, exploiting CSS's systematic naming: a shorthand's name is either a dash-prefix of its longhands (`inset` → `inset-block-end`, `font` → `font-size`) or shares first and last segment with them (`border-radius` → `border-bottom-right-radius`, `border-color` → `border-top-color`).
 */
function propertiesInterfere(first: string, second: string): boolean {
    if (first === second) {
        return true
    }
    if (first.startsWith(`${second}-`) || second.startsWith(`${first}-`)) {
        return true
    }
    const firstSegments = first.split('-')
    const secondSegments = second.split('-')
    return (
        firstSegments[0] === secondSegments[0] &&
        firstSegments.length > 1 &&
        secondSegments.length > 1 &&
        firstSegments[firstSegments.length - 1] === secondSegments[secondSegments.length - 1]
    )
}
