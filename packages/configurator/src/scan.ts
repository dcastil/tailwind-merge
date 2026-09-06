import { readFile } from 'node:fs/promises'

import { Features, compile } from '@tailwindcss/node'
import { type GlobEntry, type Scanner, type SourceEntry } from '@tailwindcss/oxide'

import { type TailwindIntegration } from './design-system.ts'

export interface SourceScannerOptions {
    /** Content of the Tailwind CSS entrypoint. */
    css: string
    /** Directory the CSS resolves imports from, usually the entrypoint's directory — the same `base` as for `generate`. */
    base: string
    /** Directories Tailwind's automatic source detection starts from when the CSS sets no `source(…)`: the Vite root for `@tailwindcss/vite`, the working directory for the PostCSS plugin and the CLI. Several bases scan the union. */
    autoDetectBases: readonly string[]
    /** Use the same bundler resolution hooks as generation so imports, safelists, and dependencies agree. */
    integration?: TailwindIntegration
}

export interface SourceScanner {
    /** Files of the CSS graph Tailwind read while compiling — `@import`ed stylesheets, `@config`/`@plugin` modules. The entrypoint itself is not included (the caller has it). */
    dependencies: ReadonlySet<string>
    /** The sources exactly as Tailwind's scanner receives them: the automatic-detection entries followed by every `@source` directive (negated ones included) and `@config` content path. */
    sources: readonly SourceEntry[]
    /** Whether the CSS uses Tailwind's utilities layer at all. Without it Tailwind scans nothing and no utility class renders, so the scan returns only the safelist. */
    scansUtilities: boolean
    /** Class names Tailwind generates regardless of what the sources contain — `@source inline(…)`, brace-expanded. */
    safelist: readonly string[]
    /** Runs the scan over the sources. Cheap to call again: the underlying scanner caches file state across calls, so re-scanning after edits costs milliseconds. */
    scan(): UsageScan
}

export interface UsageScan {
    /** Distinct candidate tokens Tailwind's scanner extracts from the sources, plus the safelist, minus `@source not inline(…)` exclusions — every string that could render as a utility class. Raw tokens, not validated: words like `const` are in here too, and classification against the generated config sorts them out. */
    classes: string[]
    /** Files the scan read, for watching. */
    files: string[]
    /** Glob entries the scan covers, for watching files that don't exist yet. */
    globs: GlobEntry[]
}

/**
 * Finds the class names a project can render, the way Tailwind does: the same candidate extractor (`@tailwindcss/oxide`'s scanner), over the same sources (`source(…)`, automatic detection, every `@source`), plus the `@source inline(…)` safelist. Pruning uses these candidates to preserve the full generated config's merge behavior for the same source usage.
 *
 * The sources come from Tailwind's own `compile()` (its `root` and `sources` results), which is also what reports the CSS graph's dependencies, so one compile serves both. What `compile()` does not expose is the safelist: `@source inline(…)` candidates stay private to its `build()`, so they are parsed from the entrypoint and every CSS dependency here, with Tailwind's brace-expansion rules. Negated inline sources exclude candidates even when they occur in files, exactly like Tailwind, which refuses to generate them.
 *
 * `@tailwindcss/oxide` is loaded lazily because it is a native module: a setup without a binary for its platform should fail only when scanning is requested, not when the configurator is imported.
 */
export async function createSourceScanner(options: SourceScannerOptions): Promise<SourceScanner> {
    const dependencies = new Set<string>()
    const compiler = await compile(options.css, {
        base: options.base,
        customCssResolver: options.integration?.resolveCss,
        customJsResolver: options.integration?.resolveJs,
        onDependency: (dependencyPath) => {
            dependencies.add(dependencyPath)
            options.integration?.onDependency?.(dependencyPath)
        },
    })

    const sources = [...autoDetectSources(compiler.root, options.autoDetectBases), ...compiler.sources]
    const scansUtilities = (compiler.features & Features.Utilities) !== 0
    const { safelist, exclusions } = await collectInlineSources(options.css, dependencies)
    const scanner = new (await loadScanner())({ sources })

    return {
        dependencies,
        sources,
        scansUtilities,
        safelist,
        scan() {
            const classes = new Set(scansUtilities ? scanner.scan() : [])
            for (const className of safelist) {
                classes.add(className)
            }
            for (const className of exclusions) {
                classes.delete(className)
            }
            return { classes: [...classes], files: scanner.files, globs: scanner.globs }
        },
    }
}

/** Mirrors how `@tailwindcss/vite`, `@tailwindcss/postcss`, and the CLI turn the compiler's `root` into scanner sources: `source(none)` disables automatic detection, no `source(…)` means "everything under the base directory", and an explicit `source(…)` is the one directory to detect in. */
function autoDetectSources(
    root: 'none' | { base: string; pattern: string } | null,
    autoDetectBases: readonly string[],
): SourceEntry[] {
    if (root === 'none') {
        return []
    }
    if (root === null) {
        return autoDetectBases.map((base) => ({ base, pattern: '**/*', negated: false }))
    }
    return [{ ...root, negated: false }]
}

async function loadScanner(): Promise<typeof Scanner> {
    try {
        const oxide = await import('@tailwindcss/oxide')
        return oxide.Scanner
    } catch (error) {
        throw new Error(
            `Scanning sources needs @tailwindcss/oxide with a binary for this platform (${process.platform}-${process.arch}): ${error instanceof Error ? error.message : String(error)}`,
        )
    }
}

/**
 * Collects `@source inline(…)` safelist entries and `@source not inline(…)` exclusions from the entrypoint and the CSS files of its import graph. Tailwind's rules: the quoted argument is split into patterns at top-level whitespace, each pattern is brace-expanded, and the result is a plain candidate list — variants included (`{hover:,}underline`).
 */
async function collectInlineSources(
    css: string,
    dependencies: ReadonlySet<string>,
): Promise<{ safelist: string[]; exclusions: string[] }> {
    const safelist = new Set<string>()
    const exclusions = new Set<string>()

    const cssTexts = [css]
    for (const dependency of dependencies) {
        if (dependency.endsWith('.css')) {
            const content = await readFile(dependency, 'utf8').catch(() => null)
            if (content !== null) {
                cssTexts.push(content)
            }
        }
    }

    for (const text of cssTexts) {
        for (const statement of cssStatements(text)) {
            const match = INLINE_SOURCE_RE.exec(statement)
            if (!match) {
                continue
            }
            const target = match[1] ? exclusions : safelist
            for (const pattern of segment(match[3]!, ' ')) {
                if (pattern === '') {
                    continue
                }
                for (const candidate of expandBraces(pattern)) {
                    target.add(candidate)
                }
            }
        }
    }

    return { safelist: [...safelist], exclusions: [...exclusions] }
}

/** `@source inline("…")` and `@source not inline('…')`, argument in either quote style. Tailwind requires the quotes, so unquoted forms are not a thing. */
const INLINE_SOURCE_RE = /^@source\s+(not\s+)?inline\(\s*(["'])((?:\\.|(?!\2)[^\\])*)\2\s*\)$/

/** Reads active CSS statements without interpreting selectors or declarations. Comments cannot introduce directives, and quoted text and function arguments cannot end a statement or open a block. */
function* cssStatements(css: string): Generator<string> {
    let statement = ''
    let quote = ''
    let parenDepth = 0
    for (let index = 0; index < css.length; index++) {
        const character = css[index]!
        if (character === '\\') {
            statement += css.slice(index, index + 2)
            index += 1
            continue
        }
        if (quote) {
            statement += character
            if (character === quote) {
                quote = ''
            }
            continue
        }
        if (character === '/' && css[index + 1] === '*') {
            const end = css.indexOf('*/', index + 2)
            index = end === -1 ? css.length : end + 1
            statement += ' '
            continue
        }
        if (character === '"' || character === "'") {
            quote = character
        } else if (character === '(') {
            parenDepth += 1
        } else if (character === ')') {
            parenDepth -= 1
        } else if (parenDepth === 0 && (character === ';' || character === '{' || character === '}')) {
            if (character === ';') {
                yield statement.trim()
            }
            statement = ''
            continue
        }
        statement += character
    }
    yield statement.trim()
}

const NUMERICAL_RANGE_RE = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/

/**
 * Brace expansion with Tailwind's semantics (`packages/tailwindcss/src/utils/brace-expansion.ts`): comma lists (`{hover:,focus:}`), numeric ranges with optional step and direction (`{100..900..100}`, `{5..0}`), nesting (`bg-red-{50,{100..900..100},950}`), and cartesian products across several groups. Unbalanced braces and zero steps throw like upstream; decimal ranges stay literal.
 */
export function expandBraces(pattern: string): string[] {
    const openIndex = pattern.indexOf('{')
    if (openIndex === -1) {
        return [pattern]
    }

    const prefix = pattern.slice(0, openIndex)
    const rest = pattern.slice(openIndex)

    let depth = 0
    let closeIndex = -1
    for (let index = 0; index < rest.length; index++) {
        const character = rest[index]
        if (character === '{') {
            depth += 1
        } else if (character === '}') {
            depth -= 1
            if (depth === 0) {
                closeIndex = index
                break
            }
        }
    }
    if (closeIndex === -1) {
        throw new Error(`The pattern \`${pattern}\` is not balanced.`)
    }

    const inside = rest.slice(1, closeIndex)
    const suffix = rest.slice(closeIndex + 1)
    const parts = (
        NUMERICAL_RANGE_RE.test(inside) ? expandSequence(inside) : segment(inside, ',')
    ).flatMap((part) => expandBraces(part))

    const expanded: string[] = []
    for (const suffixVariant of expandBraces(suffix)) {
        for (const part of parts) {
            expanded.push(prefix + part + suffixVariant)
        }
    }
    return expanded
}

function expandSequence(sequence: string): string[] {
    const match = NUMERICAL_RANGE_RE.exec(sequence)
    if (!match) {
        return [sequence]
    }
    const start = Number.parseInt(match[1]!, 10)
    const end = Number.parseInt(match[2]!, 10)
    let step = match[3] === undefined ? (start <= end ? 1 : -1) : Number.parseInt(match[3], 10)
    if (step === 0) {
        throw new Error('Step cannot be zero in sequence expansion.')
    }
    const increasing = start < end
    if (increasing && step < 0) {
        step = -step
    }
    if (!increasing && step > 0) {
        step = -step
    }

    const values: string[] = []
    for (let value = start; increasing ? value <= end : value >= end; value += step) {
        values.push(String(value))
    }
    return values
}

/**
 * Splits at a separator that sits outside any parentheses, brackets, braces, and quotes (Tailwind's `segment`), so `a(b,c),d` splits into two parts at the top-level comma and quoted separators stay put.
 */
export function segment(input: string, separator: string): string[] {
    const parts: string[] = []
    const stack: string[] = []
    let last = 0

    for (let index = 0; index < input.length; index++) {
        const character = input[index]!

        if (stack.length === 0 && character === separator) {
            parts.push(input.slice(last, index))
            last = index + 1
            continue
        }

        switch (character) {
            case '\\':
                index += 1
                break
            case '"':
            case "'":
                // Quoted content is opaque until the matching quote.
                while (++index < input.length) {
                    if (input[index] === '\\') {
                        index += 1
                    } else if (input[index] === character) {
                        break
                    }
                }
                break
            case '(':
                stack.push(')')
                break
            case '[':
                stack.push(']')
                break
            case '{':
                stack.push('}')
                break
            case ')':
            case ']':
            case '}':
                if (stack.length > 0 && stack[stack.length - 1] === character) {
                    stack.pop()
                }
                break
        }
    }

    parts.push(input.slice(last))
    return parts
}
