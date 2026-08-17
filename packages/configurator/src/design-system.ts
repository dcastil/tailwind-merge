import { __unstable__loadDesignSystem } from '@tailwindcss/node'

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
    }
    getClassList(): [string, { modifiers: string[] }][]
    candidatesToCss(classes: string[]): (string | null)[]
}

export interface LoadDesignSystemsOptions {
    css: string
    base: string
}

/**
 * Loads the project's design system alongside a vanilla one resolved from the same base directory (and therefore the same Tailwind installation and version). The vanilla system is the reference for diffing which classes the project's theme created and for classifying them — comparisons are only meaningful when both sides come from the identical compiler.
 */
export async function loadDesignSystems({ css, base }: LoadDesignSystemsOptions): Promise<{
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
}> {
    const [project, vanilla] = await Promise.all([
        __unstable__loadDesignSystem(css, { base }),
        __unstable__loadDesignSystem("@import 'tailwindcss';", { base }),
    ])

    return {
        project: project as unknown as DesignSystemAccess,
        vanilla: vanilla as unknown as DesignSystemAccess,
    }
}

/**
 * One CSS declaration of a compiled class, annotated with where and when it applies. The annotations exist because conflict semantics depend on them: a `border-color` set on an `::after` overlay never fights with a `border-color` on the element itself, and a padding that only applies inside a media query cannot be said to fully override an unconditional one.
 */
export interface DeclarationEntry {
    /** Render target of the declaration: `''` for the element the class sits on, a pseudo-element chain like `'::after'`, or a combinator tail like `'> :not(:last-child)'` when the declaration styles a different element entirely. */
    context: string
    /** True when the declaration applies only under a condition — an `@media`/`@supports`/`@container` wrapper or a pseudo-class guard like `:hover` or `:is(.dark *)`. */
    conditional: boolean
    property: string
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
    /** Set for blocks whose declarations are not element styles (`@property`, `@keyframes` and their descendants). */
    skip: boolean
}

/**
 * Parses the CSS text Tailwind compiles for one class into annotated declarations. A hand-rolled scanner is enough here: `candidatesToCss` output is machine-generated nested CSS without comments, and only braces, semicolons, and block headers need tracking.
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
        const colonIndex = declaration.indexOf(':')
        if (colonIndex <= 0) {
            return
        }
        const property = declaration.slice(0, colonIndex).trim()
        const value = declaration.slice(colonIndex + 1).trim()
        // Property-name shape guard (covers standard, vendor `-ms-…`, and custom `--…` properties) so selector fragments of malformed input never register as declarations.
        if (/^-{0,2}[a-zA-Z][\w-]*$/.test(property)) {
            entries.push({ context: frame.context, conditional: frame.conditional, property, value })
        }
    }

    let parenDepth = 0
    for (const char of css) {
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

function frameForHeader(header: string, parent: BlockFrame | undefined): BlockFrame {
    const parentContext = parent?.context ?? ''
    const parentConditional = parent?.conditional ?? false
    const parentSkip = parent?.skip ?? false

    if (header.startsWith('@')) {
        // Conditional at-rules keep targeting the same element; everything else at-rule-shaped (@property, @keyframes) holds non-style declarations.
        const isConditional = /^@(media|supports|container)\b/.test(header)
        return {
            context: parentContext,
            conditional: parentConditional || isConditional,
            skip: parentSkip || !isConditional,
        }
    }

    const { contextFragment, conditional } = analyzeSelector(header)
    return {
        context:
            parentContext === '' || contextFragment === ''
                ? parentContext + contextFragment
                : `${parentContext} ${contextFragment}`,
        conditional: parentConditional || conditional,
        skip: parentSkip,
    }
}

/** Single-colon selectors that are pseudo-elements by CSS's legacy compatibility rule; everything else single-colon is a pseudo-class. */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter'])

/**
 * Determines what a selector does to the render target relative to the class's base element. The subject anchor is `&` (nested rules) or the class selector itself (top-level rules, possibly wrapped in `:where(...)`). Pseudo-elements and combinator tails after the anchor change the target; pseudo-classes and ancestor prefixes only add conditions.
 */
function analyzeSelector(selector: string): { contextFragment: string; conditional: boolean } {
    // Comma lists don't occur in single-candidate output; analyzing the first part keeps the scanner total in case they ever do.
    let subject = selector.split(',')[0]!.trim()

    // Unwrap a `:where(...)` / `:is(...)` enclosing the entire selector — it only changes specificity, not the target.
    const wrapper = /^:(?:where|is)\((.*)\)$/.exec(subject)
    if (wrapper) {
        subject = wrapper[1]!.trim()
    }

    // Anchor: `&` or the first class selector (class names may contain escaped characters like `\%`).
    const anchorMatch = /&|\.(?:[\w-]|\\.)+/.exec(subject)
    if (!anchorMatch) {
        // No recognizable anchor means the block targets something unrelated (not emitted by current Tailwind); give it a distinct context so it can never collide with base declarations.
        return { contextFragment: subject.replace(/\s+/g, ' '), conditional: false }
    }

    // Anything before the anchor is ancestor context (`.dark .foo`), a condition on the same target.
    let conditional = anchorMatch.index > 0
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

        const compound = /^(?:\.(?:[\w-]|\\.)+|\[[^\]]*\])/.exec(rest)
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

    return { contextFragment, conditional }
}

/**
 * Dash-prefixed properties that their prefix property does NOT control, breaking CSS's otherwise systematic shorthand naming: `color` is unrelated to `color-scheme`, the `outline` shorthand excludes `outline-offset`, the `flex` shorthand covers grow/shrink/basis but not wrap/direction, and so on. These are web-platform facts (stable, not Tailwind-versioned), so a small maintained list is acceptable where everything else stays derived.
 */
const UNCONTROLLED_DASH_PREFIXED_PROPERTIES = new Set([
    'color-scheme',
    'overflow-wrap',
    'overflow-anchor',
    'outline-offset',
    'flex-wrap',
    'flex-direction',
    'flex-flow',
    'border-spacing',
    'border-collapse',
    'background-blend-mode',
    'mask-border',
    'animation-composition',
    'animation-timeline',
])

/**
 * Shorthands whose longhands don't carry the shorthand's name at all, so no naming rule can find them: `gap` controls `column-gap`/`row-gap`, `place-content` controls the align/justify pair, the `font` shorthand also resets `line-height`. The same maintained-list justification as above applies. Longhand-of-longhand chains don't need entries — utilities always declare the concrete properties these lists name.
 */
const IRREGULAR_SHORTHAND_LONGHANDS: Record<string, string[]> = {
    gap: ['column-gap', 'row-gap'],
    'place-content': ['align-content', 'justify-content'],
    'place-items': ['align-items', 'justify-items'],
    'place-self': ['align-self', 'justify-self'],
    'flex-flow': ['flex-direction', 'flex-wrap'],
    columns: ['column-width', 'column-count'],
    font: ['line-height'],
    'grid-area': ['grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end'],
}

/**
 * Whether setting `property` fully controls `target`, exploiting CSS's systematic shorthand naming: identity, dash-prefix (`padding` → `padding-inline`, `inset` → `inset-block-end`), or shared first and last segment with fewer segments (`border-radius` → `border-top-left-radius`, `border-color` → `border-top-color`) — corrected by the two enumerated exception lists where CSS naming lies about the relationship, in either direction.
 */
export function propertyCovers(property: string, target: string): boolean {
    if (property === target) {
        return true
    }
    if (IRREGULAR_SHORTHAND_LONGHANDS[property]?.includes(target)) {
        return true
    }
    if (target.startsWith(`${property}-`)) {
        return !UNCONTROLLED_DASH_PREFIXED_PROPERTIES.has(target)
    }
    const propertySegments = property.split('-')
    const targetSegments = target.split('-')
    return (
        propertySegments.length < targetSegments.length &&
        propertySegments.length > 1 &&
        propertySegments[0] === targetSegments[0] &&
        propertySegments[propertySegments.length - 1] === targetSegments[targetSegments.length - 1]
    )
}

/** Proper-subset check over property names, used to recognize classes whose declarations span multiple groups' signatures. */
export function haveProperSubset(subset: Set<string>, superset: Set<string>): boolean {
    return subset.size < superset.size && [...subset].every((property) => superset.has(property))
}

/** Set equality over property names — the strict form of "these classes set the same things". */
export function havePropertiesEqual(first: Set<string>, second: Set<string>): boolean {
    return first.size === second.size && [...first].every((property) => second.has(property))
}
