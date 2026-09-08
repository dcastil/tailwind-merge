import { mkdtempSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { expect } from 'vitest'
import { createTailwindMerge, twMerge as defaultTwMerge } from 'tailwind-merge'
import { type AnyConfig, createClassGroupUtils } from 'tailwind-merge/unstable-do-not-import'

import { type ConfigPlan, type GenerateOptions, generate } from '../src'
import { materializeConfig } from '../src/materialize'
import {
    type DesignSystemAccess,
    declaredDeclarations,
    loadDesignSystems,
} from '../src/design-system'

import { acceptableResults, mergeVerdict } from './oracle'

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

export interface GeneratedFixture {
    code: string
    config: AnyConfig
    plan: ConfigPlan
    /** The merge function built from the materialized config. */
    twMerge: (classList: string) => string
    /** The project's loaded design system, for conformance sweeps and compiled-CSS lookups. */
    designSystem: DesignSystemAccess
}

/**
 * Generates a config from fixture CSS and bundles everything fixture tests need: the merge function built from the materialized config, the plan report, the emitted code, and the loaded design system for conformance sweeps.
 *
 * Generation is the expensive part of every fixture (0.1–1 s, depending on the theme), so results are memoized per CSS, base, and options within the worker: tests anywhere in a file can ask for the vanilla theme, or share a theme between describe blocks, without paying twice. Every generated fixture also passes through the emitted-module round trip (see `importEmittedModule`), the one gate that proves the code the emitter writes builds the same config the tests exercise in memory.
 */
export function generateFixture(
    css: string,
    base: string = fixtureBase,
    options: Omit<GenerateOptions, 'css' | 'base'> = {},
): Promise<GeneratedFixture> {
    const key = JSON.stringify([css, base, options])
    let fixture = fixtureCache.get(key)
    if (!fixture) {
        fixture = buildFixture(css, base, options)
        fixtureCache.set(key, fixture)
    }
    return fixture
}

const fixtureCache = new Map<string, Promise<GeneratedFixture>>()

async function buildFixture(
    css: string,
    base: string,
    options: Omit<GenerateOptions, 'css' | 'base'>,
): Promise<GeneratedFixture> {
    const { code, config, plan } = await generate({ css, base, ...options })
    const { project } = await loadDesignSystems({ css, base })

    const emitted = await importEmittedModule(code, options.format ?? 'ts')
    // The emitted module and the materialized config come from the same plan, so they must describe the same config — validators are compared by reference, which holds because both import the same tailwind-merge module instance.
    expect(emitted.getConfig()).toEqual(config)

    if (options.prune === undefined) {
        await assertEveryCompilingClassIsAccountedFor(project, plan)
    }

    return {
        code,
        config,
        plan,
        twMerge: createTailwindMerge(() => config),
        designSystem: project,
    }
}

/**
 * The classification invariant every unpruned fixture must hold: a class Tailwind suggests and compiles is either classified by the generated config or listed in the report — never silently dropped. Three bugs of exactly that shape (compat sub-namespace phantoms, reset names re-added through a sub-namespace, negative-first classification) escaped the merge-behavior tests because no fixture happened to exercise them; this check runs over every fixture, real-world themes included. The vanilla config's own gaps (tracked by vanilla-coverage.test.ts) are inherited by every theme and excluded here.
 */
async function assertEveryCompilingClassIsAccountedFor(
    project: DesignSystemAccess,
    plan: ConfigPlan,
): Promise<void> {
    const knownGaps = await vanillaGaps()
    const accountedFor = new Set(plan.report.resolvedCollisions
        .filter((collision) => collision.keptGroupId === null)
        .map((collision) => collision.className))
    const reportedRoots: string[] = []
    for (const { className } of plan.report.unassignedClasses) {
        if (className.endsWith('-*')) {
            reportedRoots.push(className.slice(0, -1))
        } else {
            accountedFor.add(className)
        }
    }

    const dropped = unclassifiedCompilingClasses(project, plan).filter((className) => {
        const registrationName = className.startsWith('-') ? className.slice(1) : className
        return (
            !knownGaps.has(className) &&
            !accountedFor.has(registrationName) &&
            !reportedRoots.some((root) => registrationName.startsWith(root))
        )
    })
    expect(dropped, 'compiling classes neither classified nor reported').toEqual([])
}

/** Names of the design system's class list that compile but the generated config (prefix removed, since class-list names are unprefixed) does not classify. */
function unclassifiedCompilingClasses(designSystem: DesignSystemAccess, plan: ConfigPlan): string[] {
    const { getClassGroupId } = createClassGroupUtils(materializeConfig({ ...plan, prefix: null }))
    return designSystem
        .getClassList()
        .map(([className]) => className)
        .filter(
            (className) =>
                getClassGroupId(className) === undefined &&
                declaredDeclarations(designSystem, className) !== null,
        )
}

let vanillaGapsPromise: Promise<Set<string>> | undefined

function vanillaGaps(): Promise<Set<string>> {
    return (vanillaGapsPromise ??= (async () => {
        const css = "@import 'tailwindcss';"
        const [{ plan }, { project }] = await Promise.all([
            generate({ css, base: fixtureBase }),
            loadDesignSystems({ css, base: fixtureBase }),
        ])
        return new Set(unclassifiedCompilingClasses(project, plan))
    })())
}

/**
 * Writes emitted module code to a worker-private temp directory inside tests/ and imports it through Vitest, so the code runs exactly as a consumer's build would run it: the TypeScript is transformed, `tailwind-merge` resolves through the package's vitest alias, and `getConfig()` yields a real config object. The directory lives inside tests/ because the alias only applies to files Vite serves from the project; it is removed when the worker exits, and `tests/global-setup.ts` sweeps anything a crashed run left behind.
 */
export async function importEmittedModule(
    code: string,
    format: 'ts' | 'js',
): Promise<{ getConfig: () => AnyConfig; twMerge: (classList: string) => string }> {
    if (roundTripDirectory === undefined) {
        const directory = mkdtempSync(join(fixtureBase, '.tmp-roundtrip-'))
        roundTripDirectory = directory
        process.on('exit', () => rmSync(directory, { recursive: true, force: true }))
    }
    const file = join(roundTripDirectory, `module-${roundTripCounter++}.${format}`)
    await writeFile(file, code)
    return import(/* @vite-ignore */ pathToFileURL(file).href)
}

let roundTripDirectory: string | undefined
let roundTripCounter = 0

/**
 * Checks a table of class lists against their expected merge results and reports every mismatch at once, input and actual output side by side — the quickest way to pin many cases and to see what a config does when one of them breaks. Rows are `classList: expected` pairs; an array of pairs works too when a class list needs to appear twice.
 */
export function expectMerges(
    twMerge: (classList: string) => string,
    table: Record<string, string> | [classList: string, expected: string][],
): void {
    const rows = Array.isArray(table) ? table : Object.entries(table)
    const mismatches = rows.flatMap(([classList, expected]) => {
        const actual = twMerge(classList)
        return actual === expected ? [] : [`${classList}  →  ${actual}   (expected: ${expected})`]
    })
    expect(mismatches).toEqual([])
}

/**
 * Renders what a merge function does with each class list as `input → output` lines, for inline snapshots of exploratory tables: write the inputs, run Vitest with `-u` to fill in the outputs, and review them in the diff. The conformance sweep remains the correctness authority; these tables document behavior where seeing it matters.
 */
export function mergeTable(twMerge: (classList: string) => string, classLists: string[]): string {
    return classLists.map((classList) => `${classList}  →  ${twMerge(classList)}`).join('\n')
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
 * The central correctness invariant, applicable to any theme: for every consecutive pair of the design system's class list, the generated merge result must equal the default twMerge result — and where the two configs disagree, Tailwind itself referees through the oracle in oracle.ts: the compiled declarations of both classes decide whether the later one makes the earlier one irrelevant, and classes that compile to nothing cannot conflict at all.
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
        // A class that compiles to nothing cannot conflict with anything; otherwise the oracle in oracle.ts decides from the compiled declarations.
        const verdict =
            firstDeclarations !== null && secondDeclarations !== null
                ? mergeVerdict(firstDeclarations, secondDeclarations)
                : 'keep'
        const acceptable = acceptableResults(verdict, first, second)

        if (acceptable.includes(generatedResult)) {
            improvementsOverDefault.push(
                `${input} → ${generatedResult} (default: ${defaultResult})`,
            )
        } else {
            failures.push({
                input,
                generated: generatedResult,
                default: defaultResult,
                oracle: acceptable.join(' | '),
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
 * A deterministic "used classes" sample drawn from a design system's class list: every `stride`-th class name, with a rotating share decorated the way real sources decorate them — variants, the important marker in both spellings, postfix modifiers — plus a few arbitrary values, a negative value, an arbitrary property, and non-class tokens a scanner would also pick up. Stands in for a scanner's output in tests that don't involve real source files.
 */
export function sampleUsedClasses(designSystem: DesignSystemAccess, stride: number): string[] {
    const classNames = designSystem.getClassList().map(([className]) => className)
    const sample: string[] = []

    for (let index = 0; index < classNames.length; index += stride) {
        const className = classNames[index]!
        const variant = index % 5 === 0 ? 'hover:' : index % 7 === 0 ? 'md:dark:' : ''
        const postfix = index % 13 === 0 ? '/50' : ''
        const important = index % 11 === 0 ? '!' : ''
        sample.push(
            index % 17 === 0
                ? `${variant}!${className}`
                : `${variant}${className}${postfix}${important}`,
        )
    }

    sample.push(
        'p-[13px]',
        'bg-[url(/img.png)]',
        'w-[calc(100%-2rem)]',
        'text-(--my-var)',
        'grid-cols-[1fr_2fr]',
        '[mask-type:luminance]',
        '-mt-2',
        'const',
        'className',
        '---',
    )
    return sample
}

/**
 * The pruning invariant: for class lists made of used classes, the pruned config must merge exactly like the full config — each class alone, each consecutive pair in both orders, a pseudo-random partner from elsewhere in the list, and a share of triples. Classes outside the used set are deliberately not checked here; the pruned config treats them as non-Tailwind classes by design.
 */
export function assertPruningEquivalence(
    fullConfig: AnyConfig,
    prunedConfig: AnyConfig,
    usedClasses: string[],
): { checkedClassLists: number } {
    const fullTwMerge = createTailwindMerge(() => fullConfig)
    const prunedTwMerge = createTailwindMerge(() => prunedConfig)
    const mismatches: { input: string; full: string; pruned: string }[] = []
    let checkedClassLists = 0

    const check = (input: string) => {
        checkedClassLists += 1
        const full = fullTwMerge(input)
        const pruned = prunedTwMerge(input)
        if (full !== pruned) {
            mismatches.push({ input, full, pruned })
        }
    }

    for (let index = 0; index < usedClasses.length; index += 1) {
        const first = usedClasses[index]!
        const second = usedClasses[(index + 1) % usedClasses.length]!
        const third = usedClasses[(index * 7919) % usedClasses.length]!
        check(first)
        check(`${first} ${second}`)
        check(`${second} ${first}`)
        check(`${first} ${third}`)
        if (index % 3 === 0) {
            check(`${first} ${second} ${third}`)
        }
    }

    expect(mismatches).toEqual([])
    return { checkedClassLists }
}
