import { validators } from '../../src'

import { PlanValue, ValidatorName } from './plan'

export interface ScaleEncoding {
    items: PlanValue[]
    /** Which encoding won, for reporting. Not part of the generated output. */
    strategy: string
}

/**
 * Encodes a theme scale's value names into the smallest class-group representation.
 *
 * Policy (see PROPOSAL.md): the encoding must never fail to match a name that exists in the theme, but it may overmatch names that don't exist when that makes the output smaller — merging a class that produces no CSS is harmless, missing a class that does is a bug. Candidates are compared by estimated emitted size:
 * - plain enumeration of all names
 * - a validator covering all names, plus enumerated outliers (e.g. t-shirt sizes with a `base` outlier)
 * - families with a shared numeric tail collapsed into nested validators (e.g. `{ red: [isNumber] }` for `red-50` … `red-950`)
 *
 * The family encoding also mirrors Tailwind's own resolution order better than a flat validator: a named part match wins over sibling validators in the class map, exactly like Tailwind prefers a color namespace hit over a bare value interpretation.
 */
export function encodeScale(names: string[]): ScaleEncoding {
    if (names.length === 0) {
        return { items: [], strategy: 'empty' }
    }

    const candidates = [
        ...encodeWithValidators(names),
        encodeAsFamilies(names),
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
 * Collapses names sharing a first segment and a numeric tail into `{ family: [isNumber] }` entries, which is how color palettes compress (many families × many shades become one nested validator per family). Names outside qualifying families stay enumerated, and a family only qualifies with at least 2 members so single values don't lose their exact match.
 */
function encodeAsFamilies(names: string[]): ScaleEncoding | null {
    const familyTails = new Map<string, string[]>()

    for (const name of names) {
        const separatorIndex = name.indexOf('-')
        if (separatorIndex > 0) {
            const family = name.slice(0, separatorIndex)
            const tail = name.slice(separatorIndex + 1)
            const tails = familyTails.get(family)
            if (tails) {
                tails.push(tail)
            } else {
                familyTails.set(family, [tail])
            }
        }
    }

    const qualifiedFamilies = new Set<string>()
    for (const [family, tails] of familyTails) {
        if (tails.length >= 2 && tails.every(validators.isNumber)) {
            qualifiedFamilies.add(family)
        }
    }

    if (qualifiedFamilies.size === 0) {
        return null
    }

    // Emit in original theme order: the first member of a qualified family becomes the shared object (all families in one object literal), other members are skipped, everything else stays enumerated.
    const items: PlanValue[] = []
    const familiesObject: PlanValue = { kind: 'object', entries: [] }
    const emittedFamilies = new Set<string>()

    for (const name of names) {
        const separatorIndex = name.indexOf('-')
        const family = separatorIndex > 0 ? name.slice(0, separatorIndex) : null

        if (family === null || !qualifiedFamilies.has(family)) {
            items.push(literal(name))
            continue
        }

        if (!emittedFamilies.has(family)) {
            emittedFamilies.add(family)
            if (familiesObject.entries.length === 0) {
                items.push(familiesObject)
            }
            familiesObject.entries.push([family, [{ kind: 'validator', name: 'isNumber' }]])
        }
    }

    return { items, strategy: 'families' }
}

function literal(value: string): PlanValue {
    return { kind: 'class', value }
}
