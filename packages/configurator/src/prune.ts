import { validators } from 'tailwind-merge'
import { createClassGroupUtils, createParseClassName } from 'tailwind-merge/unstable-do-not-import'

import { materializeConfig } from './materialize.ts'
import { type ConfigPlan, type PlanValue, filterConflictMap } from './plan.ts'

/**
 * Shrinks a plan to the class names a project actually uses: class groups no used class belongs to are dropped, and within the kept groups only the members some used class reaches survive — literals a used class names, nested prefix objects a used class descends into, and validators a used class's remaining tail satisfies.
 *
 * The pruned plan merges exactly like the full plan for every class list made of used classes, by construction: it is a subset of the full plan with tailwind-merge's lookup precedence intact. Classification of a used class runs through tailwind-merge's own parser and class map (prefix, variants, important marker, postfix modifiers — mirroring `mergeClassList`'s lookup order), so a class matched via a literal keeps that literal and a class matched via a validator keeps that validator, in the same group and at the same trie position; removing other members can never promote a previously losing candidate, because lookup tries deeper literal paths first and validators in definition order, and that order is preserved among the survivors. Members are only ever removed, never re-encoded, and validators are kept whenever any used tail satisfies them — over-keeping is always safe, under-keeping never is. Classes outside the used set lose their classification and pass through unmerged, which is the intended effect: a class Tailwind never saw has no styles, so keeping it next to a used class is at least as correct as merging it away.
 *
 * Used classes are raw tokens as a scanner finds them (`hover:bg-red-500/50`, `tw:p-4!`, `-mt-2`), deduplicated here; anything that does not classify is ignored. Conflict maps are filtered to the kept groups, `scales` stay untouched (the emitter drops shared consts nothing references anymore), and the result records what happened in `report.pruning`. The input plan is not mutated.
 */
export function prunePlan(plan: ConfigPlan, usedClasses: Iterable<string>): ConfigPlan {
    const config = materializeConfig(plan)
    const parseClassName = createParseClassName(config)
    const { getClassGroupId } = createClassGroupUtils(config)
    const postfixLookupClassGroupIds = new Set(config.postfixLookupClassGroups ?? [])

    /** Used class names that classified, per class group — already stripped to the part the class map matched (no variants, no important marker, no postfix modifier unless the postfix lookup matched it, no leading minus). */
    const matchedNamesByGroup = new Map<string, Set<string>>()
    const seen = new Set<string>()
    let classifiedClassCount = 0

    for (const rawClassName of usedClasses) {
        const className = rawClassName.trim()
        if (className === '' || seen.has(className)) {
            continue
        }
        seen.add(className)

        const classification = classify(className)
        if (classification === null) {
            continue
        }
        classifiedClassCount += 1

        let names = matchedNamesByGroup.get(classification.classGroupId)
        if (!names) {
            names = new Set()
            matchedNamesByGroup.set(classification.classGroupId, names)
        }
        names.add(lookupName(classification.matchedClassName))
    }

    /**
     * Mirrors the lookup in tailwind-merge's `mergeClassList`: a class with a postfix modifier (`bg-red-500/50`) is first looked up without it, groups listed in `postfixLookupClassGroups` get a second chance with the postfix included, and a class that only resolves with the postfix kept is taken as is. Returns the group and the exact string the class map matched — that string is what the member-level walk has to keep reachable.
     */
    function classify(
        className: string,
    ): { classGroupId: string; matchedClassName: string } | null {
        const { isExternal, baseClassName, maybePostfixModifierPosition } =
            parseClassName(className)
        if (isExternal) {
            return null
        }

        if (maybePostfixModifierPosition) {
            const withoutPostfix = baseClassName.substring(0, maybePostfixModifierPosition)
            let classGroupId = getClassGroupId(withoutPostfix)
            let matchedClassName = withoutPostfix

            const classGroupIdWithPostfix =
                classGroupId && postfixLookupClassGroupIds.has(classGroupId)
                    ? getClassGroupId(baseClassName)
                    : undefined
            if (classGroupIdWithPostfix && classGroupIdWithPostfix !== classGroupId) {
                classGroupId = classGroupIdWithPostfix
                matchedClassName = baseClassName
            }
            if (!classGroupId) {
                classGroupId = getClassGroupId(baseClassName)
                matchedClassName = baseClassName
            }
            return classGroupId ? { classGroupId, matchedClassName } : null
        }

        const classGroupId = getClassGroupId(baseClassName)
        return classGroupId ? { classGroupId, matchedClassName: baseClassName } : null
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
