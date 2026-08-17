import { validators } from 'tailwind-merge'

import { type PlanValue, type ValidatorName } from './plan.ts'

/**
 * How finite value sets (theme scales, custom-utility value spaces) are encoded into class-group matchers.
 *
 * - 'compact': smallest emitted representation wins, even when a validator matches names beyond the actual set. The classic overmatch premise "merging a class that produces no CSS is harmless" turned out to be wrong for merge semantics — a classified class gains eviction power, so `twMerge('rounded-md', 'rounded-xs')` drops the real `rounded-md` when `rounded-xs` isn't in the theme but matches the scale's validator (first reported from the field, 2026-08-13). Compact stays the default because the damage is limited to class names outside the theme, which linting normally rules out — the config is correct for correct usage of the theme's tokens.
 * - 'exact': a matcher may only accept names that exist. Costs bundle size (enumeration instead of validators); buys eviction-proofness for inputs that produce no CSS.
 *
 * Genuinely open-ended value spaces (the bare `--spacing` multiplier, arbitrary values, bare numbers on utilities that accept any) keep their validators in both modes — a validator is only "overmatching" when the real value set is finite.
 */
export type EncodingMode = 'compact' | 'exact'

export interface ScaleEncoding {
    items: PlanValue[]
    /** Which encoding won, for reporting. Not part of the generated output. */
    strategy: string
}

/**
 * Encodes a theme scale's value names into the smallest class-group representation the mode allows.
 *
 * Policy (see PROPOSAL.md): the encoding must never fail to match a name that exists in the theme; whether it may overmatch names that don't exist is what `EncodingMode` decides. Candidates are compared by estimated emitted size:
 * - plain enumeration of all names
 * - 'compact' only: a validator covering all names, plus enumerated outliers (e.g. t-shirt sizes with a `base` outlier)
 * - families with a shared first segment collapsed into a nested entry (e.g. `{ red: [isNumber] }` for `red-50` … `red-950` — in 'exact' mode the tails enumerate instead, staying exact because only listed prefix+tail combinations match)
 *
 * The family encoding also mirrors Tailwind's own resolution order better than a flat validator: a named part match wins over sibling validators in the class map, exactly like Tailwind prefers a color namespace hit over a bare value interpretation.
 */
export function encodeScale(names: string[], encoding: EncodingMode): ScaleEncoding {
    if (names.length === 0) {
        return { items: [], strategy: 'empty' }
    }

    const candidates = [
        ...(encoding === 'compact' ? encodeWithValidators(names) : []),
        encodeAsFamilies(names, encoding),
        { items: names.map(literal), strategy: 'enumerated' },
    ].filter((candidate): candidate is ScaleEncoding => candidate !== null)

    let best = candidates[0]!
    let bestCost = estimateCost(best.items)

    for (let index = 1; index < candidates.length; index++) {
        const candidate = candidates[index]!
        const cost = estimateCost(candidate.items)
        if (cost < bestCost) {
            best = candidate
            bestCost = cost
        }
    }

    return best
}

/**
 * Rough size in characters of the emitted representation. Only used to compare encodings of the same scale against each other, so precision doesn't matter as long as it is monotonic with real output size.
 */
export function estimateCost(items: PlanValue[]): number {
    let cost = 0

    for (const item of items) {
        if (item.kind === 'class') {
            cost += item.value.length + 4
        } else if (item.kind === 'validator') {
            cost += item.name.length + 4
        } else {
            cost += 4
            for (const [key, entryItems] of item.entries) {
                cost += key.length + 4 + estimateCost(entryItems)
            }
        }
    }

    return cost
}

/**
 * Validators that are worth trying as whole-scale replacements. Ordered from most to least specific so that on equal cost the least overmatching candidate wins via first-strictly-smaller comparison in `encodeScale`.
 */
const VALIDATOR_CANDIDATES: [ValidatorName, (value: string) => boolean][] = [
    ['isTshirtSize', validators.isTshirtSize],
    ['isFraction', validators.isFraction],
    ['isNumber', validators.isNumber],
]

function encodeWithValidators(names: string[]): ScaleEncoding[] {
    return VALIDATOR_CANDIDATES.flatMap(([name, validator]) => {
        const outliers = names.filter((value) => !validator(value))
        const coveredCount = names.length - outliers.length

        // A validator needs to replace a meaningful number of names to be worth the overmatching, and outliers dominating means it's the wrong validator for this scale.
        if (coveredCount < 3 || outliers.length > coveredCount) {
            return []
        }

        return [
            {
                items: [...outliers.map(literal), { kind: 'validator' as const, name }],
                strategy: outliers.length === 0 ? `validator:${name}` : `mixed:${name}`,
            },
        ]
    })
}

/**
 * Collapses names sharing a first segment into one nested entry per family, with the tails themselves encoded recursively through `encodeScale` — so numeric shades still end in a validator (`{ red: [isNumber] }`), word tails enumerate without repeating the prefix (`{ gap: ['narrow', 'wide'] }`), and multi-segment names factor further (`{ background: [{ alternative: [isNumber] }] }`). Each family keeps the factored form only when it estimates smaller than enumerating its members, so short families don't pay the object overhead. Structural factoring measures smaller on minified AND compressed output (unlike reference-based sharing, it removes repetition without adding entropy — see EmitOptions.sharing for that contrast).
 */
function encodeAsFamilies(names: string[], encoding: EncodingMode): ScaleEncoding | null {
    const families = new Map<string, { tails: string[]; enumeratedCost: number }>()

    for (const name of names) {
        const separatorIndex = name.indexOf('-')
        if (separatorIndex > 0) {
            const familyName = name.slice(0, separatorIndex)
            const tail = name.slice(separatorIndex + 1)
            let family = families.get(familyName)
            if (!family) {
                family = { tails: [], enumeratedCost: 0 }
                families.set(familyName, family)
            }
            family.tails.push(tail)
            family.enumeratedCost += name.length + 4
        }
    }

    const factoredFamilies = new Map<string, PlanValue[]>()
    for (const [familyName, { tails, enumeratedCost }] of families) {
        if (tails.length < 2) {
            continue
        }
        const tailEncoding = encodeScale(tails, encoding)
        if (familyName.length + 4 + estimateCost(tailEncoding.items) < enumeratedCost) {
            factoredFamilies.set(familyName, tailEncoding.items)
        }
    }

    if (factoredFamilies.size === 0) {
        return null
    }

    // Emit in original theme order: the first member of a factored family becomes the shared object (all families in one object literal), other members are skipped, everything else stays enumerated.
    const items: PlanValue[] = []
    const familiesObject: PlanValue = { kind: 'object', entries: [] }
    const emittedFamilies = new Set<string>()

    for (const name of names) {
        const separatorIndex = name.indexOf('-')
        const familyName = separatorIndex > 0 ? name.slice(0, separatorIndex) : null

        if (familyName === null || !factoredFamilies.has(familyName)) {
            items.push(literal(name))
            continue
        }

        if (!emittedFamilies.has(familyName)) {
            emittedFamilies.add(familyName)
            if (familiesObject.entries.length === 0) {
                items.push(familiesObject)
            }
            familiesObject.entries.push([familyName, factoredFamilies.get(familyName)!])
        }
    }

    return { items, strategy: 'families' }
}

function literal(value: string): PlanValue {
    return { kind: 'class', value }
}
