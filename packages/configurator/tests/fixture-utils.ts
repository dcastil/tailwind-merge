import { fileURLToPath } from 'node:url'

import { expect } from 'vitest'
import { createTailwindMerge, twMerge as defaultTwMerge } from 'tailwind-merge'
import { type AnyConfig, createClassGroupUtils } from 'tailwind-merge/unstable-do-not-import'

import { type ConfigPlan, type GenerateOptions, generate } from '../src'
import { fullyCovers } from '../src/custom-utilities'
import {
    type DeclarationEntry,
    type DesignSystemAccess,
    declaredDeclarations,
    loadDesignSystems,
    propertyCovers,
    qualifiedProperty,
} from '../src/design-system'

export const fixtureBase = fileURLToPath(new URL('.', import.meta.url))

/**
 * Tagged template for fixture CSS. Strips the common leading indentation (and enclosing blank lines) so fixtures indent naturally with the surrounding test code — and the `css` tag itself follows the convention editors and Prettier recognize for embedded languages (like graphql`` or styled-components), so fixtures get CSS syntax highlighting and formatting.
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
    const text = strings.reduce((joined, part, index) => joined + String(values[index - 1]) + part)

    const lines = text.split('\n')
    if (lines[0]?.trim() === '') {
        lines.shift()
    }
    while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') {
        lines.pop()
    }

    const indentWidths = lines
        .filter((line) => line.trim() !== '')
        .map((line) => /^\s*/.exec(line)![0].length)
    const commonIndent = indentWidths.length === 0 ? 0 : Math.min(...indentWidths)

    return `${lines.map((line) => line.slice(commonIndent)).join('\n')}\n`
}

/**
 * Generates a config from fixture CSS and bundles everything fixture tests need: the merge function built from the materialized config, the plan report, the emitted code, and the loaded design system for conformance sweeps.
 */
export async function generateFixture(
    css: string,
    base: string = fixtureBase,
    options: Omit<GenerateOptions, 'css' | 'base'> = {},
) {
    const { code, config, plan } = await generate({ css, base, ...options })
    const { project } = await loadDesignSystems({ css, base })

    return {
        code,
        config,
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

        // Interference means the pair must merge. Without interference the pair normally must stay — except when the second class fully subsumes the first (identical scaffolding plus overridden state, like supabase's `hit-area` vs `hit-area-0`): removing the first is lossless there, so both keeping and merging count as correct.
        const acceptableResults = conflictExpected ? [second] : [input]
        if (!conflictExpected && fullyCovers(secondDeclarations, firstDeclarations)) {
            acceptableResults.push(second)
        }

        if (acceptableResults.includes(generatedResult)) {
            improvementsOverDefault.push(
                `${input} → ${generatedResult} (default: ${defaultResult})`,
            )
        } else {
            failures.push({
                input,
                generated: generatedResult,
                default: defaultResult,
                oracle: acceptableResults.join(' | '),
            })
        }
    }

    expect(failures).toEqual([])

    return { checkedPairs, adjudicated, improvementsOverDefault }
}

/**
 * The exactness undermatch gate: for every class name the design system compiles, the exact and compact configs must classify into the same group — 'exact' may only drop matches for names that produce no CSS. The conformance sweep cannot police this side of exactness: an undermatched real class keeps its pair intact, which is also what the default config does, so the two sides agree and the oracle is never consulted. Classification parity against compact (whose coverage the sweep does verify) closes that hole.
 */
export function assertExactClassificationParity(
    designSystem: DesignSystemAccess,
    exactConfig: AnyConfig,
    compactConfig: AnyConfig,
): void {
    const exactClassGroupId = createClassGroupUtils(exactConfig).getClassGroupId
    const compactClassGroupId = createClassGroupUtils(compactConfig).getClassGroupId

    const mismatches: { className: string; exact?: string; compact?: string }[] = []
    for (const [className] of designSystem.getClassList()) {
        if (declaredDeclarations(designSystem, className) === null) {
            continue
        }
        const exactGroupId = exactClassGroupId(className)
        const compactGroupId = compactClassGroupId(className)
        if (exactGroupId !== compactGroupId) {
            mismatches.push({ className, exact: exactGroupId, compact: compactGroupId })
        }
    }

    expect(mismatches).toEqual([])
}

/**
 * Whether two classes' compiled declarations conflict. Identical signatures (same render targets and property names) always conflict — color utilities often differ only in custom-property values. Otherwise a conflict needs interference on a real CSS property, and interference is bounded three ways: overlap on `--tw-*` custom properties alone is composition, not conflict; declarations on different render targets (a `border-color` on `::after` vs one on the element itself) never touch each other; and re-declaring the same property with byte-identical text (shared scaffolding like `mask-composite: intersect` or `var()`-composed state carriers) is idempotent and conflicts with nothing. Conditional declarations (media queries, `:hover`-style guards, dark-mode wrappers) also don't count as interference — they overlap only sometimes, and the generated config conservatively keeps such classes side by side.
 */
function declarationsConflict(first: DeclarationEntry[], second: DeclarationEntry[]): boolean {
    const firstSignature = new Set(first.map(qualifiedProperty))
    const secondSignature = new Set(second.map(qualifiedProperty))
    if (
        firstSignature.size === secondSignature.size &&
        [...firstSignature].every((key) => secondSignature.has(key))
    ) {
        return true
    }

    for (const firstEntry of first) {
        if (firstEntry.property.startsWith('--') || firstEntry.conditional) {
            continue
        }
        for (const secondEntry of second) {
            if (secondEntry.property.startsWith('--') || secondEntry.conditional) {
                continue
            }
            if (firstEntry.context !== secondEntry.context) {
                continue
            }
            if (!propertiesInterfere(firstEntry.property, secondEntry.property)) {
                continue
            }
            const isIdempotentRedeclaration =
                firstEntry.property === secondEntry.property &&
                firstEntry.value === secondEntry.value
            if (!isIdempotentRedeclaration) {
                return true
            }
        }
    }

    return false
}

/**
 * Whether setting one CSS property interferes with the other: either controls the other per the shared shorthand-naming relation (`propertyCovers`), which also knows the naming exceptions where a dash prefix lies (`color` vs `color-scheme`).
 */
function propertiesInterfere(first: string, second: string): boolean {
    return propertyCovers(first, second) || propertyCovers(second, first)
}
