import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { type Resolver, __unstable__loadDesignSystem, loadModule } from '@tailwindcss/node'
import type * as TailwindEngine from 'tailwindcss'

import { createModuleResolver, createStylesheetResolver, trackModuleDependencies } from './resolvers.ts'

/** Bundler-owned resolution shared by design-system loading and source scanning. Either resolver can defer to Tailwind's normal filesystem/package resolution or return an alias-expanded request; the shared resolvers finish extension/package lookup and track missing targets. */
export interface TailwindIntegration {
    resolveCss: Resolver
    resolveJs: Resolver
    /** Files read by generation, plus missing resolution targets and their existing parent directories on failure so integrations can observe creation and retry. */
    onDependency?: (file: string) => void
}

/**
 * The structural slice of Tailwind's design system the configurator relies on. The real object's types hide most of this behind private fields, so the loader narrows to what is actually used; verified against tailwindcss 4.3.x and guarded by tests.
 */
export interface DesignSystemAccess {
    theme: {
        prefix: string | null
        entries(): Iterable<[string, unknown]>
    }
    utilities: {
        keys(kind: 'static' | 'functional'): string[]
        /** Suggestions retain their utility branches here; getClassList deduplicates overlapping names and omits modifiers for roots without named base values. */
        getCompletions(root: string): {
            values: (string | null)[]
            modifiers: string[]
            supportsNegative?: boolean
        }[]
    }
    getClassList(): [string, { modifiers: string[] }][]
    /** Variant suggestions and selector templates, including CSS and JavaScript registrations. */
    getVariants(): {
        name: string
        values: string[]
        hasDash: boolean
        selectors(options?: { value?: string }): string[]
    }[]
    candidatesToCss(classes: string[]): (string | null)[]
}

export interface LoadDesignSystemsOptions {
    css: string
    base: string
    integration?: TailwindIntegration
}

/**
 * Loads project and vanilla systems through the same installed compiler and CSS-resolution base. The vanilla system is the reference for diffing and classifying theme-created classes; comparisons are only meaningful with an identical compiler.
 */
export async function loadDesignSystems({
    css,
    base,
    integration,
}: LoadDesignSystemsOptions): Promise<{
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
}> {
    const [project, vanilla] = await Promise.all([
        loadDesignSystem(css, base, integration),
        loadDesignSystem("@import 'tailwindcss';", base, integration),
    ])

    return {
        project: memoizeClassList(project as unknown as DesignSystemAccess),
        vanilla: memoizeClassList(vanilla as unknown as DesignSystemAccess),
    }
}

/** The node wrapper currently drops resolver hooks when loading a design system. Use its own Tailwind engine with explicit loaders for bundler integrations, without changing globals or resolving a different compiler from the project. */
async function loadDesignSystem(css: string, base: string, integration?: TailwindIntegration) {
    if (!integration) {
        return __unstable__loadDesignSystem(css, { base })
    }
    const engine = await (tailwindEngine ??= loadModule(
        'tailwindcss',
        path.dirname(fileURLToPath(import.meta.resolve('@tailwindcss/node'))),
        () => {},
    ).then<typeof TailwindEngine>(({ path: file }) => import(pathToFileURL(file).href)))
    const resolveStylesheet = createStylesheetResolver(
        integration.resolveCss,
        integration.onDependency,
        integration.onDependency,
    )
    const resolveModule = createModuleResolver(integration.resolveJs, integration.onDependency)
    return engine.__unstable__loadDesignSystem(css, {
        base,
        async loadStylesheet(id, from) {
            const file = await resolveStylesheet(id, from)
            return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') }
        },
        async loadModule(id, from) {
            const file = await resolveModule(id, from)
            try {
                // Tailwind only collects transitive dependencies and busts ESM caches for relative module requests. Aliases resolving to local configs/plugins must follow that same path.
                return await loadModule(
                    `./${path.relative(from, file)}`,
                    from,
                    integration.onDependency ?? (() => {}),
                    // Reuse the fresh resolution instead of re-entering Tailwind's cached resolver, which can still consider a newly created module missing.
                    async () => file,
                )
            } catch (error) {
                if (integration.onDependency) {
                    await trackModuleDependencies(file, integration.onDependency)
                }
                throw error
            }
        },
    })
}

let tailwindEngine: Promise<typeof TailwindEngine> | undefined

/**
 * Caches `getClassList()` on a loaded design system. Tailwind rebuilds the list on every call, and the custom-utility, augmentation, and collision passes share it. Repeated rebuilds previously dominated generation time on themes with many custom utilities. A loaded design system never changes, so caching is safe; consumers replace the object for a new theme.
 */
function memoizeClassList(designSystem: DesignSystemAccess): DesignSystemAccess {
    const original = designSystem.getClassList.bind(designSystem)
    let classList: ReturnType<DesignSystemAccess['getClassList']> | undefined
    designSystem.getClassList = () => (classList ??= original())
    return designSystem
}

/**
 * One CSS declaration of a compiled class, annotated with where and when it applies. The annotations exist because conflict semantics depend on them: a `border-color` set on an `::after` overlay never fights with a `border-color` on the element itself, and a padding that only applies inside a media query cannot be said to fully override an unconditional one.
 */
export interface DeclarationEntry {
    /** Render target of the declaration: `''` for the element the class sits on, a pseudo-element chain like `'::after'`, or a combinator tail like `'> :not(:last-child)'` when the declaration styles a different element entirely. */
    context: string
    /** True under a style-grouping at-rule, a pseudo-class guard, or a selector list whose combined effects cannot be treated as one unconditional target. */
    conditional: boolean
    /** Enclosing block headers relative to the utility's own selector (`&`). Keeping the full path distinguishes both guard expressions and which render target a guard surrounds. */
    scope: readonly string[]
    property: string
    /** Declaration-level importance, independent of an important modifier on the class name. */
    important: boolean
    value: string
}

/**
 * Compiles a class through Tailwind and returns its declarations, or null when the class produces no CSS. Callers pass unprefixed class names (the form `getClassList()` uses everywhere); the candidate is prefixed automatically when the theme defines a prefix, because Tailwind only compiles `tw:p-2`-style candidates there — without this, every declaration-based pass silently saw prefixed themes as producing no CSS. `@property` registrations and `@keyframes` bodies are skipped: composable utilities share the former without conflicting, and the latter describe animation frames, not what the class sets on an element. Values matter to the conflict oracle: two classes re-declaring the same property with identical text are idempotent together and carry their real state elsewhere (usually in custom properties).
 */
export function declaredDeclarations(
    designSystem: DesignSystemAccess,
    className: string,
): DeclarationEntry[] | null {
    let cache = declarationsCache.get(designSystem)
    if (!cache) {
        cache = new Map()
        declarationsCache.set(designSystem, cache)
    }

    let declarations = cache.get(className)
    if (declarations === undefined) {
        const css = designSystem.candidatesToCss([toCandidate(designSystem, className)])[0] ?? null
        declarations = css === null ? null : parseDeclarations(css)
        cache.set(className, declarations)
    }

    return declarations
}

/**
 * The context-qualified property names of a class — the signature used for class-group classification, where values and conditions don't matter but render targets do: `color` on the element and `color` on `::before` are different things to set.
 */
export function declaredProperties(
    designSystem: DesignSystemAccess,
    className: string,
): Set<string> | null {
    const declarations = declaredDeclarations(designSystem, className)
    return declarations === null
        ? null
        : new Set(declarations.map((entry) => qualifiedProperty(entry)))
}

/** Key joining render target and property name, e.g. `'::after border-color'`; base-context entries stay the bare property name. */
export function qualifiedProperty(entry: { context: string; property: string }): string {
    return entry.context === '' ? entry.property : `${entry.context} ${entry.property}`
}

/** Shared scaffolding must apply under the same guards on the same target; equal property/value text alone cannot prove that. Header order is kept conservatively rather than attempting CSS condition equivalence. */
export function sameDeclarationScope(first: DeclarationEntry, second: DeclarationEntry): boolean {
    return (
        first.context === second.context &&
        first.scope.length === second.scope.length &&
        first.scope.every((header, index) => header === second.scope[index])
    )
}

/**
 * Whether each class name compiles to CSS, checked in one `candidatesToCss` batch — the batched boolean form of the prefix-aware compilation `declaredDeclarations` does per class. Use one of the two over raw `candidatesToCss` so the answer holds for prefixed themes.
 */
export function classesCompile(designSystem: DesignSystemAccess, classNames: string[]): boolean[] {
    const candidates = classNames.map((className) => toCandidate(designSystem, className))
    return designSystem.candidatesToCss(candidates).map((compiledCss) => compiledCss !== null)
}

/** The candidate string Tailwind compiles for a class name: prefixed under a theme prefix (`tw:p-2`), the name itself otherwise. Class lists and everything downstream of them stay unprefixed, so the prefix exists only at this compilation boundary. */
function toCandidate(designSystem: DesignSystemAccess, className: string): string {
    const prefix = designSystem.theme.prefix
    return prefix === null ? className : `${prefix}:${className}`
}

const declarationsCache = new WeakMap<DesignSystemAccess, Map<string, DeclarationEntry[] | null>>()

interface BlockFrame {
    context: string
    conditional: boolean
    scope: readonly string[]
    /** Set for blocks whose declarations are not element styles (`@property`, `@keyframes` and their descendants). */
    skip: boolean
}

/**
 * Parses Tailwind's machine-generated nested CSS into annotated declarations. Quoted and escaped punctuation must stay inside its token: treating content: '(' as structure would hide a pseudo-element's declarations and make alias inference discard its styles.
 */
function parseDeclarations(css: string): DeclarationEntry[] {
    const entries: DeclarationEntry[] = []
    const stack: BlockFrame[] = []
    let buffer = ''

    const flushDeclaration = () => {
        const frame = stack[stack.length - 1]
        const declaration = buffer.trim()
        buffer = ''
        if (!frame || frame.skip || declaration === '') {
            return
        }
        const start = DECLARATION_START_RE.exec(declaration)
        if (!start) {
            return
        }
        const property = start[1]!
        const rawValue = declaration.slice(start[0].length).trim()
        const importantMatch = /\s*!\s*important$/i.exec(rawValue)
        const value = importantMatch ? rawValue.slice(0, importantMatch.index).trimEnd() : rawValue
        entries.push({
            context: frame.context,
            conditional: frame.conditional,
            scope: frame.scope,
            property,
            important: importantMatch !== null,
            value,
        })
    }

    let parenDepth = 0
    let quote = ''
    let escaped = false
    for (const char of css) {
        if (escaped) {
            buffer += char
            escaped = false
            continue
        }
        if (char === '\\') {
            buffer += char
            escaped = true
            continue
        }
        if (quote !== '') {
            buffer += char
            if (char === quote) {
                quote = ''
            }
            continue
        }
        if (char === '"' || char === "'") {
            buffer += char
            quote = char
            continue
        }
        if (char === '(') {
            parenDepth += 1
        } else if (char === ')') {
            parenDepth = Math.max(0, parenDepth - 1)
        }

        if (parenDepth === 0 && char === '{') {
            const header = buffer.trim()
            buffer = ''
            stack.push(frameForHeader(header, stack[stack.length - 1]))
        } else if (parenDepth === 0 && char === '}') {
            flushDeclaration()
            stack.pop()
        } else if (parenDepth === 0 && char === ';') {
            flushDeclaration()
        } else {
            buffer += char
        }
    }

    return entries
}

/** Custom-property identifiers may start with digits or underscores after -- and contain non-ASCII characters or CSS escapes. Match the delimiter too so an escaped colon stays in the name, while malformed selector fragments still cannot become declarations. */
const DECLARATION_START_RE =
    /^(--(?:[\w\u0080-\uFFFF-]|\\(?:[\da-f]{1,6}[ \t\n\r\f]?|[^\r\n\f]))+|-?[a-z][\w-]*)\s*:/i

function frameForHeader(header: string, parent: BlockFrame | undefined): BlockFrame {
    const parentContext = parent?.context ?? ''
    const parentConditional = parent?.conditional ?? false
    const parentScope = parent?.scope ?? []
    const parentSkip = parent?.skip ?? false

    if (header.startsWith('@')) {
        // Registrations and animation frames are not element styles. Other wrappers, including @starting-style and unfamiliar grouping rules, retain their declarations conservatively under their full scope.
        const isNonStyle = /^@(?:property|(?:-[\w]+-)?keyframes)(?:\s|$)/i.test(header)
        return {
            context: parentContext,
            conditional: true,
            scope: [...parentScope, header],
            skip: parentSkip || isNonStyle,
        }
    }

    const { contextFragment, conditional, relativeSelector } = analyzeSelector(header)
    return {
        context:
            parentContext === '' || contextFragment === ''
                ? parentContext + contextFragment
                : `${parentContext} ${contextFragment}`,
        conditional: parentConditional || conditional,
        scope: [...parentScope, relativeSelector],
        skip: parentSkip,
    }
}

/** Single-colon selectors that are pseudo-elements by CSS's legacy compatibility rule; everything else single-colon is a pseudo-class. */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter'])

/**
 * Determines what a selector does to the render target relative to the class's base element. The subject anchor is `&` (nested rules) or the class selector itself (top-level rules, possibly wrapped in `:where(...)`). Pseudo-elements and combinator tails after the anchor change the target; pseudo-classes and ancestor prefixes only add conditions.
 */
function analyzeSelector(selector: string): {
    contextFragment: string
    conditional: boolean
    relativeSelector: string
} {
    // The first selector supplies the property signature. The complete list stays in the scope, and list declarations conservatively avoid unconditional coverage below.
    let subject = selector.split(',')[0]!.trim()

    // Unwrap a `:where(...)` / `:is(...)` enclosing the entire selector — it only changes specificity, not the target.
    const wrapper = /^:(?:where|is)\((.*)\)$/.exec(subject)
    if (wrapper) {
        subject = wrapper[1]!.trim()
    }

    // Prefer the nesting anchor over an ancestor class (`.dark &`). A hexadecimal escape consumes its optional trailing space too (`\32 xl`): that space belongs to a numeric variant's class name, not a descendant selector.
    const anchorMatch = /&/.exec(subject) ?? /\.(?:[\w-]|\\(?:[\da-f]{1,6}\s?|.))+/i.exec(subject)
    if (!anchorMatch) {
        // No recognizable anchor means the block targets something unrelated (not emitted by current Tailwind); give it a distinct context so it can never collide with base declarations.
        return {
            contextFragment: subject.replace(/\s+/g, ' '),
            conditional: false,
            relativeSelector: selector,
        }
    }

    // Anything before the anchor is ancestor context (`.dark .foo`), a condition on the same target.
    let conditional = anchorMatch.index > 0 || selector.includes(',')
    let contextFragment = ''
    let rest = subject.slice(anchorMatch.index + anchorMatch[0].length)

    while (rest !== '') {
        const pseudo = /^::?([\w-]+)(\((?:[^()]|\([^()]*\))*\))?/.exec(rest)
        if (pseudo) {
            const isPseudoElement =
                pseudo[0].startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(pseudo[1]!)
            if (isPseudoElement) {
                contextFragment += `::${pseudo[1]!}`
            } else {
                conditional = true
            }
            rest = rest.slice(pseudo[0].length)
            continue
        }

        const compound = /^(?:\.(?:[\w-]|\\(?:[\da-f]{1,6}\s?|.))+|\[[^\]]*\])/i.exec(rest)
        if (compound) {
            // Additional class or attribute requirements on the same element are conditions.
            conditional = true
            rest = rest.slice(compound[0].length)
            continue
        }

        // A combinator: the remainder selects a different element and becomes part of the target context.
        contextFragment += (contextFragment === '' ? '' : ' ') + rest.trim().replace(/\s+/g, ' ')
        break
    }

    return {
        contextFragment,
        conditional,
        // Keep the entire selector in the scope even when target classification only analyzes its first comma segment.
        relativeSelector: selector.replace(anchorMatch[0], '&'),
    }
}

/** Proper-subset check over property names, used to recognize classes whose declarations span multiple groups' signatures. */
export function haveProperSubset(subset: Set<string>, superset: Set<string>): boolean {
    return subset.size < superset.size && [...subset].every((property) => superset.has(property))
}

/** Set equality over property names — the strict form of "these classes set the same things". */
export function havePropertiesEqual(first: Set<string>, second: Set<string>): boolean {
    return first.size === second.size && [...first].every((property) => second.has(property))
}
