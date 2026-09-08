import { type ChildNode, parse } from 'postcss'

import { segment } from './css-statements.ts'

/**
 * Interprets the CSS Tailwind compiles for one class: which render target each declaration styles and under which conditions. Kept free of any design-system dependency so the scope and selector rules can be tested against literal CSS; `declaredDeclarations` in design-system.ts is the compile-and-cache layer on top.
 */

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

interface BlockFrame {
    context: string
    conditional: boolean
    scope: readonly string[]
    /** Set for blocks whose declarations are not element styles (`@property`, `@keyframes` and their descendants). */
    skip: boolean
}

/** Annotates compiled CSS with the target and conditions needed for coverage checks. PostCSS owns CSS syntax (including escaped identifiers, importance, and nested value blocks); this walker only interprets style scopes. `candidate` is the class the CSS was compiled for, so its own selector can be told apart from ancestor classes a variant adds (`.in-dark\:block` inside `:where(.dark *) .in-dark\:block`); without it the first class selector is taken. */
export function parseDeclarations(css: string, candidate?: string): DeclarationEntry[] {
    const entries: DeclarationEntry[] = []
    visit(parse(css).nodes)
    return entries

    function visit(nodes: ChildNode[], frame?: BlockFrame) {
        for (const node of nodes) {
            if (node.type === 'decl') {
                if (frame && !frame.skip) {
                    entries.push({
                        context: frame.context,
                        conditional: frame.conditional,
                        scope: frame.scope,
                        property: node.prop,
                        important: node.important ?? false,
                        value: node.value,
                    })
                }
            } else if (node.type === 'rule' || node.type === 'atrule') {
                const header = node.type === 'rule'
                    ? node.selector
                    : `@${node.name}${node.params ? ` ${node.params}` : ''}`
                visit(node.nodes ?? [], frameForHeader(header, frame, candidate))
            }
        }
    }
}

function frameForHeader(
    header: string,
    parent: BlockFrame | undefined,
    candidate: string | undefined,
): BlockFrame {
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

    const { contextFragment, conditional, relativeSelector } = analyzeSelector(header, candidate)
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

/** The class selector to anchor on: the one spelling the candidate, or the first one when the candidate is unknown or absent (a selector Tailwind built without the class itself). */
function findClassAnchor(subject: string, candidate: string | undefined): RegExpExecArray | null {
    const classSelectors = [...subject.matchAll(/\.(?:[\w-]|\\(?:[\da-f]{1,6}\s?|.))+/gi)]
    if (candidate !== undefined) {
        const own = classSelectors.find((match) => unescapeIdentifier(match[0].slice(1)) === candidate)
        if (own) {
            return own
        }
    }
    return classSelectors[0] ?? null
}

/** Reverses CSS identifier escaping: `\:` → `:`, `\32 xl` → `2xl`. */
function unescapeIdentifier(identifier: string): string {
    return identifier.replace(/\\(?:([\da-f]{1,6})\s?|(.))/gi, (_, hex: string | undefined, char: string | undefined) =>
        hex !== undefined ? String.fromCodePoint(Number.parseInt(hex, 16)) : (char as string),
    )
}

/** Single-colon selectors that are pseudo-elements by CSS's legacy compatibility rule; everything else single-colon is a pseudo-class. */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter'])

/**
 * Determines what a selector does to the render target relative to the class's base element. The subject anchor is `&` (nested rules) or the class selector itself (top-level rules, possibly wrapped in `:where(...)`). Pseudo-elements and combinator tails after the anchor change the target; pseudo-classes and ancestor prefixes only add conditions.
 */
function analyzeSelector(
    selector: string,
    candidate: string | undefined,
): {
    contextFragment: string
    conditional: boolean
    relativeSelector: string
} {
    // The first selector supplies the property signature. The complete list stays in the scope, and list declarations conservatively avoid unconditional coverage below. Split only at top-level commas: a list inside `:where(.dark, .dark *)` is one selector.
    let subject = segment(selector, ',')[0]!.trim()

    // Unwrap a `:where(...)` / `:is(...)` enclosing the entire selector — it only changes specificity, not the target.
    const wrapper = /^:(?:where|is)\((.*)\)$/.exec(subject)
    if (wrapper) {
        subject = wrapper[1]!.trim()
    }

    // Prefer the nesting anchor over an ancestor class (`.dark &`), then the candidate's own class over any other: ancestor variants like `in-*` and `group-*` put their ancestor's class first (`:where(.dark *) .in-dark\:block`), and anchoring there would turn the utility's own element into a combinator target. A hexadecimal escape consumes its optional trailing space too (`\32 xl`): that space belongs to a numeric variant's class name, not a descendant selector.
    const anchorMatch = /&/.exec(subject) ?? findClassAnchor(subject, candidate)
    if (!anchorMatch) {
        // No recognizable anchor means the block targets something unrelated (not emitted by current Tailwind); give it a distinct context so it can never collide with base declarations.
        return {
            contextFragment: subject.replace(/\s+/g, ' '),
            conditional: false,
            relativeSelector: selector,
        }
    }

    // Anything before the anchor is ancestor context (`.dark .foo`), a condition on the same target.
    let conditional = anchorMatch.index > 0 || segment(selector, ',').length > 1
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
