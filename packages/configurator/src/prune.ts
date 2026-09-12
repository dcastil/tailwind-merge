import { validators } from 'tailwind-merge'
import { createClassGroupLookup } from 'tailwind-merge/unstable-do-not-import'

import { materializeConfig } from './materialize.ts'
import { type ConfigPlan, type PlanValue, filterConflictMap } from './plan.ts'

/**
 * Shrinks a plan to the class names a project actually uses: groups and members survive only when needed by a used class's lookup, including intermediate base matchers for slash-modified classes — literals a used class names, nested prefix objects a used class descends into, and validators a used class's remaining tail satisfies.
 *
 * The pruned plan merges exactly like the full plan for every class list made of used classes, by construction: it is a subset of the full plan with tailwind-merge's lookup precedence intact. Classification of a used class records the lookups of tailwind-merge's own merge engine (prefix, variants, important marker, and postfix modifiers), so a class matched via a literal keeps that literal and a class matched via a validator keeps that validator, in the same group and at the same trie position; removing other members can never promote a previously losing candidate, because lookup tries deeper literal paths first and validators in definition order, and that order is preserved among the survivors. Members are only ever removed, never re-encoded, and validators are kept whenever any used tail satisfies them — over-keeping is always safe, under-keeping never is. Retained validators can also classify names outside the used set, so the result is not a strict allowlist. Only supplied candidates carry the equivalence guarantee; consumers with externally supplied, separately styled class names should keep the full config.
 *
 * Used classes are raw tokens as a scanner finds them (`hover:bg-red-500/50`, `tw:p-4!`, `-mt-2`), deduplicated here; anything that does not classify is ignored. Conflict maps are filtered to the kept groups, `scales` stay untouched (the emitter drops shared consts nothing references anymore), and the result records what happened in `report.pruning`. The input plan is not mutated.
 */
export function prunePlan(plan: ConfigPlan, usedClasses: Iterable<string>): ConfigPlan {
    const config = materializeConfig(plan)
    const lookupClass = createClassGroupLookup(config)

    /** Every successful lookup needed by a used class, including a base group that enables a subsequent postfix lookup. Names contain only the part the class map matched, with a leading minus removed. */
    const matchedNamesByGroup = new Map<string, Set<string>>()
    const seen = new Set<string>()
    let classifiedClassCount = 0

    for (const rawClassName of usedClasses) {
        const className = rawClassName.trim()
        if (className === '' || seen.has(className)) {
            continue
        }
        seen.add(className)

        const matches = lookupClass(className)
        if (matches.length > 0) {
            classifiedClassCount += 1
        }
        for (const match of matches) {
            const { classGroupId } = match
            let names = matchedNamesByGroup.get(classGroupId)
            if (!names) {
                names = new Set()
                matchedNamesByGroup.set(classGroupId, names)
            }
            names.add(lookupName(match.className))
        }
    }

    const classGroups = new Map<string, PlanValue[]>()
    const removedClassGroups: string[] = []
    const unprunedClassGroups: string[] = []

    for (const [classGroupId, items] of plan.classGroups) {
        const names = matchedNamesByGroup.get(classGroupId)
        if (!names) {
            removedClassGroups.push(classGroupId)
            continue
        }
        const prunedItems = pruneItems(items, names)
        if (prunedItems.length === 0) {
            // A used class resolved into this group, but the walk found nothing it reaches — keep the group whole rather than risk undermatching; the report makes the discrepancy visible.
            unprunedClassGroups.push(classGroupId)
            classGroups.set(classGroupId, items)
        } else {
            classGroups.set(classGroupId, prunedItems)
        }
    }

    return {
        ...plan,
        classGroups,
        conflictingClassGroups: filterConflictMap(
            Object.fromEntries(plan.conflictingClassGroups),
            classGroups,
        ),
        conflictingClassGroupModifiers: filterConflictMap(
            Object.fromEntries(plan.conflictingClassGroupModifiers),
            classGroups,
        ),
        postfixLookupClassGroups: plan.postfixLookupClassGroups.filter((classGroupId) =>
            classGroups.has(classGroupId),
        ),
        report: {
            ...plan.report,
            pruning: {
                usedClassCount: seen.size,
                classifiedClassCount,
                classGroupsBefore: plan.classGroups.size,
                classGroupsAfter: classGroups.size,
                removedClassGroups,
                unprunedClassGroups,
            },
        },
    }
}

/**
 * Keeps the items of one class-group level that some name in `names` reaches, walking nested prefix objects the way tailwind-merge's class map does: an object entry's key is a dash-separated prefix, so a name descends into it with the key stripped (`red-500` enters `{ red: […] }` as `500`), a name equal to the key enters as the empty string (the `''` literal marks "the prefix alone is a class"), and validators see the remaining tail at their level. Literal strings must match the remaining name exactly.
 */
function pruneItems(items: PlanValue[], names: Set<string>): PlanValue[] {
    const kept: PlanValue[] = []

    for (const item of items) {
        if (item.kind === 'class') {
            if (names.has(item.value)) {
                kept.push(item)
            }
        } else if (item.kind === 'validator') {
            const validator = validators[item.name]
            for (const name of names) {
                if (validator(name)) {
                    kept.push(item)
                    break
                }
            }
        } else {
            const entries: [string, PlanValue[]][] = []
            for (const [key, entryItems] of item.entries) {
                const tails = new Set<string>()
                for (const name of names) {
                    if (name === key) {
                        tails.add('')
                    } else if (name.startsWith(`${key}-`)) {
                        tails.add(name.slice(key.length + 1))
                    }
                }
                if (tails.size === 0) {
                    continue
                }
                const prunedEntryItems = pruneItems(entryItems, tails)
                if (prunedEntryItems.length > 0) {
                    entries.push([key, prunedEntryItems])
                }
            }
            if (entries.length > 0) {
                kept.push({ kind: 'object', entries })
            }
        }
    }

    return kept
}

/** The string the class map walks for a matched class: negative classes like `-mt-2` start their lookup after the empty first part, exactly as `getClassGroupId` skips it. */
function lookupName(matchedClassName: string): string {
    const parts = matchedClassName.split('-')
    return parts[0] === '' && parts.length > 1 ? parts.slice(1).join('-') : matchedClassName
}
