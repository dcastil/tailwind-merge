// Explicit .ts extensions (unlike the test files) because scripts/explain.mts imports this module under plain Node type stripping.
import { fullyCovers } from '../src/custom-utilities.ts'
import {
    type DeclarationEntry,
    propertyCovers,
    qualifiedProperty,
    sameDeclarationScope,
} from '../src/design-system.ts'

/**
 * What Tailwind's compiled CSS says a merge of two classes should do: 'merge' when the later class makes the earlier one irrelevant, 'keep' when both still have an effect, and 'either' when removing the earlier class is lossless without being required (the later class re-declares everything the earlier one sets — identical scaffolding plus overridden state, like supabase's `hit-area` vs `hit-area-0`).
 */
export type MergeVerdict = 'merge' | 'keep' | 'either'

/**
 * The conflict oracle behind the conformance sweeps: decides a pair of classes from their compiled declarations alone, so the verdict is theme-independent and owes nothing to any tailwind-merge config.
 * All coverage checks require sufficient declaration importance, including custom-property state: a normal declaration cannot erase an earlier inline-important one.
 *
 * Identical signatures merge when every earlier declaration has the same render target, enclosing rules, and property name in the later class — color utilities often differ only in custom-property values. Otherwise the later class must control every real declaration of the earlier one: an unconditional element-level declaration by re-declaring the same property with another value or a shorthand of it per `propertyCovers` (`p-4` after `px-2`), a conditional or off-element declaration only by repeating it byte for byte. Control is directional on purpose — a longhand after its shorthand (`px-2` after `p-4`) interferes without controlling, so both stay, the same partial-override rule tailwind-merge applies. Four kinds of overlap are composition rather than control: re-declaring a property with byte-identical text (shared scaffolding like `mask-composite: intersect`), overlap on custom properties alone (`--tw-*` state carriers), declarations on different render targets (a `border-color` on `::after` vs one on the element itself), and a later declaration that reads one of the earlier class's custom properties through `var()` without re-declaring it (`border-2` sets `border-style: var(--tw-border-style)`, which carries an earlier `border-dashed`; `scale-z-*` re-declares `scale:` as `var(--tw-scale-x) var(--tw-scale-y) var(--tw-scale-z)`, which still carries `scale-y-*`). Conditional declarations (media queries, `:hover`-style guards, dark-mode wrappers) also don't count — they overlap only sometimes, and the generated config conservatively keeps such classes side by side.
 */
export function mergeVerdict(first: DeclarationEntry[], second: DeclarationEntry[]): MergeVerdict {
    const firstSignature = new Set(first.map(qualifiedProperty))
    const secondSignature = new Set(second.map(qualifiedProperty))
    if (
        firstSignature.size === secondSignature.size &&
        [...firstSignature].every((key) => secondSignature.has(key)) &&
        first.every((entry) =>
            second.some(
                (other) =>
                    sameDeclarationScope(entry, other) &&
                    entry.property === other.property &&
                    (!entry.important || other.important),
            ),
        )
    ) {
        return 'merge'
    }

    const firstCustomProperties = unconditionalCustomProperties(first)
    const secondCustomProperties = unconditionalCustomProperties(second)

    let interference = false
    let everyDeclarationControlled = true
    let someDeclarationControlled = false

    for (const firstEntry of first) {
        if (firstEntry.property.startsWith('--')) {
            if (
                firstEntry.important &&
                !second.some(
                    (entry) =>
                        entry.important &&
                        sameDeclarationScope(entry, firstEntry) &&
                        entry.property === firstEntry.property,
                )
            ) {
                everyDeclarationControlled = false
            }
            continue
        }
        if (firstEntry.conditional || firstEntry.context !== '') {
            // A declaration that applies only sometimes or styles another element keeps its effect unless the later class repeats it byte for byte (shared scaffolding); `container`'s media-query max-widths survive a later `w-*`, so the pair stays.
            if (
                !second.some(
                    (secondEntry) =>
                        sameDeclarationScope(secondEntry, firstEntry) &&
                        secondEntry.property === firstEntry.property &&
                        (!firstEntry.important || secondEntry.important) &&
                        secondEntry.value === firstEntry.value,
                )
            ) {
                everyDeclarationControlled = false
            }
            continue
        }
        let controlled = false
        for (const secondEntry of second) {
            if (
                secondEntry.property.startsWith('--') ||
                secondEntry.conditional ||
                (firstEntry.important && !secondEntry.important) ||
                secondEntry.context !== firstEntry.context
            ) {
                continue
            }
            const sameProperty = firstEntry.property === secondEntry.property
            if (sameProperty && firstEntry.value === secondEntry.value) {
                controlled = true
                continue
            }
            if (sameProperty || propertyCovers(secondEntry.property, firstEntry.property)) {
                interference = true
                if (
                    !composesThrough(
                        secondEntry.value,
                        firstCustomProperties,
                        secondCustomProperties,
                    )
                ) {
                    controlled = true
                    someDeclarationControlled = true
                }
            } else if (propertyCovers(firstEntry.property, secondEntry.property)) {
                interference = true
            }
        }
        if (!controlled) {
            everyDeclarationControlled = false
        }
    }

    if (!interference) {
        return fullyCovers(second, first) ? 'either' : 'keep'
    }
    return someDeclarationControlled && everyDeclarationControlled ? 'merge' : 'keep'
}

/** The results the oracle accepts for `first second` under a verdict, in the shape `twMerge` returns them. */
export function acceptableResults(verdict: MergeVerdict, first: string, second: string): string[] {
    const both = `${first} ${second}`
    return verdict === 'merge' ? [second] : verdict === 'keep' ? [both] : [both, second]
}

function unconditionalCustomProperties(declarations: DeclarationEntry[]): Set<string> {
    const properties = new Set<string>()
    for (const entry of declarations) {
        if (entry.context === '' && !entry.conditional && entry.property.startsWith('--')) {
            properties.add(entry.property)
        }
    }
    return properties
}

/** Whether a declaration value reads a custom property the earlier class sets and the later class leaves alone — the earlier class then keeps acting through the variable. */
function composesThrough(
    value: string,
    firstCustomProperties: Set<string>,
    secondCustomProperties: Set<string>,
): boolean {
    for (const match of value.matchAll(/var\((--[\w-]+)/g)) {
        const name = match[1]!
        if (firstCustomProperties.has(name) && !secondCustomProperties.has(name)) {
            return true
        }
    }
    return false
}
