import {
    type DeclarationEntry,
    type DesignSystemAccess,
    declaredDeclarations,
    declaredProperties,
    haveProperSubset,
    havePropertiesEqual,
    sameDeclarationScope,
} from './design-system.ts'

export interface CollisionResolution {
    className: string
    /** The group whose scale value wrongly claims the class. */
    claimingGroupId: string
    /** The group that owns the class according to its compiled declarations. Theme overrides can change that owner even when the original matcher still claims the class. */
    ownerGroupId: string
    /** 'restore': the owner's classification is the correct one, take the claim away from the claiming group. 'neutralize': the class now resolves through multiple utilities at once, so it must not belong to any group — take every claim away and let it pass through unmerged. */
    resolution: 'restore' | 'neutralize'
}

export interface AugmentationResult {
    /** Full class names to append per class group ID, in class-list order. */
    assignments: Map<string, string[]>
    /** Existing classes whose classification the theme accidentally changed (a value name shadowing them), e.g. `bg-bottom` with a `--color-bottom` defined. */
    collisions: CollisionResolution[]
    /** Classes no group could be determined for, with the reason — reported instead of guessed. */
    unassigned: { className: string; reason: string }[]
}

export interface BuildAugmentationsOptions {
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
    /** Classifies a class name against the config generated from the project's theme (before augmentation). Classes it already places correctly need no augmentation. */
    projectClassGroupId: (className: string) => string | undefined
    /** Classifies a class name against a config generated from the vanilla theme, used to bucket vanilla sibling classes into candidate groups. */
    vanillaClassGroupId: (className: string) => string | undefined
    /** Class-name prefixes per group ID, from the group definitions' object keys. Groups listing several prefixes (`start` holds both `inset-s` and the deprecated `start` spelling) drive alias-spelling expansion: Tailwind's class list only suggests one spelling, so the others must be probed. */
    groupPrefixKeys: Map<string, string[]>
    /** Groups already classified by custom-utility inference. Property signatures alone must not undo its condition-aware decisions. */
    customGroupIds: ReadonlySet<string>
    /** Functional classes whose arbitrary postfix effects cannot safely share their base group's conflicts. */
    preservedCustomClasses: ReadonlySet<string>
}

/**
 * Finds new and reinterpreted project classes and determines their owning groups empirically, without a maintained namespace table.
 *
 * Mechanism: diff the project's class list against the vanilla one. Every new class that the generated config doesn't already classify is matched against candidate groups derived from its vanilla siblings (classes sharing the first name segment, e.g. `text-…`), where each candidate group is represented by the declared-property signature of one exemplar class. A unique signature match assigns the group — `text-primary` declares `color` like `text-red-500` does, not `font-size` like `text-xl` — which handles Tailwind's undocumented compat sub-namespaces (`--text-color-*`, `--background-color-*`) and namespaces tailwind-merge has no theme key for (`--z-index-*`, `--border-width-*`) with one rule. Ambiguous or unmatched classes are reported, never guessed.
 * Existing names are also checked when their group claim or membership in Tailwind's grouped suggestions changes; the deduplicated class list alone cannot reveal an added interpretation.
 */
export function buildAugmentations({
    project,
    vanilla,
    projectClassGroupId,
    vanillaClassGroupId,
    groupPrefixKeys,
    customGroupIds,
    preservedCustomClasses,
}: BuildAugmentationsOptions): AugmentationResult {
    const vanillaClassNames = vanilla.getClassList().map(([className]) => className)
    const vanillaClassNameSet = new Set(vanillaClassNames)

    const newClassNames = project
        .getClassList()
        .map(([className]) => className)
        .filter((className) => !vanillaClassNameSet.has(className))

    const exemplarsByFirstSegment = collectExemplars(vanillaClassNames, vanillaClassGroupId)
    const changedSuggestionNames = changedUtilitySuggestions(project, vanilla)

    const assignments = new Map<string, string[]>()
    const collisions: CollisionResolution[] = []
    const unassigned: { className: string; reason: string }[] = []
    const handledNames = new Set<string>()

    for (const className of newClassNames) {
        // Negative utilities ('-z-header') resolve through the same class-map path as their positive form because the parser skips the leading dash, so only the positive name gets registered and each positive/negative pair is handled once.
        const registrationName = className.startsWith('-') ? className.slice(1) : className
        if (handledNames.has(registrationName)) {
            continue
        }
        if (preservedCustomClasses.has(registrationName)) {
            handledNames.add(registrationName)
            unassigned.push({
                className: registrationName,
                reason: 'Custom utility effects cannot be distinguished safely by runtime lookup',
            })
            continue
        }
        const claimingGroupId = projectClassGroupId(registrationName)
        if (claimingGroupId !== undefined && customGroupIds.has(claimingGroupId)) {
            // A custom border-grid can share border-color's property names while adding dark-mode effects. Keep its established ownership even when its name resembles a built-in root.
            continue
        }

        const properties = declaredProperties(project, className)
        if (properties === null || properties.size === 0) {
            // Suggestion-only entries that don't compile produce no CSS and can't conflict with anything.
            continue
        }
        handledNames.add(registrationName)

        const targetGroupId = classifyByProperties(
            className,
            properties,
            exemplarsByFirstSegment,
            vanilla,
        )

        if (typeof targetGroupId !== 'string') {
            // The generated config may already classify the class correctly through the standard namespaces (e.g. a custom `--text-*` size); only real gaps are worth reporting.
            if (projectClassGroupId(registrationName) === undefined) {
                unassigned.push({ className: registrationName, reason: targetGroupId.reason })
            }
            continue
        }

        if (claimingGroupId === targetGroupId) {
            continue
        }
        if (claimingGroupId !== undefined) {
            // Another group's scale already claims the new class — a theme value name that exists in two namespaces one utility reads (`--shadow-brand` next to `--color-brand` makes `shadow-brand` a box shadow, yet the color scale's `brand` claims it for shadow-color too), or a numeric color token shadowing a bare-number value (`--color-4` vs `decoration-4`, which Tailwind keeps as a thickness). Appending the class to its owner group below is not enough when both claims are literals on the same path — the later group in the config would win — so the wrong claim is also removed like any other collision.
            collisions.push({
                className: registrationName,
                claimingGroupId,
                ownerGroupId: targetGroupId,
                resolution: 'restore',
            })
        }

        const groupClassNames = assignments.get(targetGroupId)
        if (groupClassNames) {
            groupClassNames.push(registrationName)
        } else {
            assignments.set(targetGroupId, [registrationName])
        }

        // Alias-spelling expansion: the class list only suggests one spelling of utilities that exist under several names (`inset-s-sm` but never the deprecated `start-sm`), so a value assigned through one of a group's prefixes is probed under the group's other prefixes. Only spellings Tailwind compiles to the identical declarations join — empirically verified, like everything else here.
        for (const aliasName of aliasSpellings(registrationName, targetGroupId, groupPrefixKeys)) {
            if (handledNames.has(aliasName) || projectClassGroupId(aliasName) === targetGroupId) {
                continue
            }
            const aliasDeclarations = declaredDeclarations(project, aliasName)
            const classDeclarations = declaredDeclarations(project, registrationName)
            if (
                aliasDeclarations !== null &&
                classDeclarations !== null &&
                declarationsEqual(aliasDeclarations, classDeclarations)
            ) {
                handledNames.add(aliasName)
                assignments.get(targetGroupId)!.push(aliasName)
            }
        }
    }

    // Existing names need a declaration check when their suggestion branch changes, even if both classifiers return the same group: --text-color-base adds text-base to the color suggestions without changing its old font-size matcher. Checking the grouped suggestions avoids compiling every unchanged vanilla class. Custom-utility inference already checked its own groups and must retain ownership.
    for (const className of vanillaClassNames) {
        const registrationName = className.startsWith('-') ? className.slice(1) : className
        const projectGroupId = projectClassGroupId(className)
        const vanillaGroupId = vanillaClassGroupId(className)
        if (
            (projectGroupId === vanillaGroupId && !changedSuggestionNames.has(registrationName)) ||
            projectGroupId === undefined ||
            vanillaGroupId === undefined ||
            customGroupIds.has(projectGroupId)
        ) {
            continue
        }

        if (handledNames.has(registrationName)) {
            continue
        }

        const properties = declaredProperties(project, className)
        if (properties === null || properties.size === 0) {
            continue
        }
        handledNames.add(registrationName)

        const vanillaProperties = declaredProperties(vanilla, className)
        if (vanillaProperties !== null && havePropertiesEqual(properties, vanillaProperties)) {
            if (projectGroupId !== vanillaGroupId) {
                collisions.push({
                    className: registrationName,
                    claimingGroupId: projectGroupId,
                    ownerGroupId: vanillaGroupId,
                    resolution: 'restore',
                })
            }
            continue
        }
        const claimingSignature = exemplarsByFirstSegment
            .get(firstNameSegment(className))
            ?.get(projectGroupId)
        const claimingProperties =
            claimingSignature === undefined ? null : declaredProperties(vanilla, claimingSignature)
        if (
            vanillaProperties !== null &&
            claimingProperties !== null &&
            haveProperSubset(vanillaProperties, properties) &&
            [...claimingProperties].every((property) => properties.has(property))
        ) {
            collisions.push({
                className: registrationName,
                claimingGroupId: projectGroupId,
                ownerGroupId: vanillaGroupId,
                resolution: 'neutralize',
            })
            continue
        }

        const targetGroupId = classifyByProperties(
            className,
            properties,
            exemplarsByFirstSegment,
            vanilla,
        )

        if (targetGroupId === projectGroupId) {
            // Tailwind really does resolve the class differently now (e.g. `text-xl` becoming a color) — the new classification is correct.
            continue
        }
        if (typeof targetGroupId !== 'string' && targetGroupId.isJanus) {
            collisions.push({
                className: registrationName,
                claimingGroupId: projectGroupId,
                ownerGroupId: vanillaGroupId,
                resolution: 'neutralize',
            })
        } else if (typeof targetGroupId === 'string') {
            if (targetGroupId !== vanillaGroupId) {
                // The new owner may have no existing matcher for this name (or may have been reset entirely), so removing the old claim alone is insufficient.
                const groupClassNames = assignments.get(targetGroupId) ?? []
                groupClassNames.push(registrationName)
                assignments.set(targetGroupId, groupClassNames)
            }
            collisions.push({
                className: registrationName,
                claimingGroupId: projectGroupId,
                ownerGroupId: targetGroupId,
                resolution: 'restore',
            })
        } else {
            unassigned.push({
                className: registrationName,
                reason: `classification changed but ${targetGroupId.reason}`,
            })
        }
    }

    return { assignments, collisions, unassigned }
}

/**
 * Finds names added to or removed from each Tailwind suggestion branch, before getClassList merges duplicate names. A name can move between branches or gain a second interpretation while remaining in the final class list. Branches are compared by position within the same compiler's utility definition; a reordered branch only causes extra declaration checks. Negative forms share their positive registration path.
 */
function changedUtilitySuggestions(project: DesignSystemAccess, vanilla: DesignSystemAccess): Set<string> {
    const changed = new Set<string>()
    for (const root of vanilla.utilities.keys('functional')) {
        const before = vanilla.utilities.getCompletions(root)
        const after = project.utilities.getCompletions(root)
        for (let index = 0; index < Math.max(before.length, after.length); index++) {
            const previousValues = new Set(before[index]?.values ?? [])
            const nextValues = new Set(after[index]?.values ?? [])
            for (const value of new Set([...previousValues, ...nextValues])) {
                if (previousValues.has(value) !== nextValues.has(value)) {
                    changed.add(value === null ? root : `${root}-${value}`)
                }
            }
        }
    }
    return changed
}

/**
 * One exemplar class per (first name segment, class group) pair, e.g. `text` → text-color: `text-red-500`. Only exemplars for segments that actually need classification get compiled later, so collecting names here is cheap.
 */
function collectExemplars(
    vanillaClassNames: string[],
    vanillaClassGroupId: (className: string) => string | undefined,
): Map<string, Map<string, string>> {
    const exemplarsByFirstSegment = new Map<string, Map<string, string>>()

    for (const className of vanillaClassNames) {
        const firstSegment = firstNameSegment(className)
        let groupExemplars = exemplarsByFirstSegment.get(firstSegment)
        if (groupExemplars === undefined) {
            groupExemplars = new Map()
            exemplarsByFirstSegment.set(firstSegment, groupExemplars)
        }

        const classGroupId = vanillaClassGroupId(className)
        if (classGroupId !== undefined && !groupExemplars.has(classGroupId)) {
            groupExemplars.set(classGroupId, className)
        }
    }

    return exemplarsByFirstSegment
}

function classifyByProperties(
    className: string,
    properties: Set<string>,
    exemplarsByFirstSegment: Map<string, Map<string, string>>,
    vanilla: DesignSystemAccess,
): string | { reason: string; isJanus: boolean } {
    const groupExemplars = exemplarsByFirstSegment.get(firstNameSegment(className))
    if (!groupExemplars || groupExemplars.size === 0) {
        return { reason: 'no vanilla classes share its root', isJanus: false }
    }

    const matches: string[] = []
    let containedSignatures = 0
    for (const [classGroupId, exemplarClassName] of groupExemplars) {
        const exemplarProperties = declaredProperties(vanilla, exemplarClassName)
        if (exemplarProperties === null) {
            continue
        }
        if (havePropertiesEqual(properties, exemplarProperties)) {
            matches.push(classGroupId)
        } else if (haveProperSubset(exemplarProperties, properties)) {
            containedSignatures += 1
        }
    }

    if (matches.length === 1) {
        return matches[0]!
    }
    if (matches.length === 0 && containedSignatures >= 2) {
        // Tailwind resolved the candidate through several interpretations at once and emitted all their declarations in one rule (e.g. `bg-bottom` with a `--color-bottom` theme value declares both background-color and background-position). Such a class cannot belong to one conflict group: merging it away in either direction would lose part of its effect.
        return { reason: 'resolves as multiple utilities at once', isJanus: true }
    }
    return {
        reason:
            matches.length === 0
                ? 'no candidate group declares the same CSS properties'
                : `ambiguous between class groups ${matches.join(', ')}`,
        isJanus: false,
    }
}

function firstNameSegment(className: string): string {
    const separatorIndex = className.indexOf('-')
    return separatorIndex === -1 ? className : className.slice(0, separatorIndex)
}

/**
 * The same value under the target group's other class-name prefixes: `inset-s-sm` assigned to the `start` group (prefixes `inset-s` and `start`) yields the candidate `start-sm`. The longest matching prefix decides where the value part begins, so a prefix that happens to prefix another never mis-splits the name.
 */
function aliasSpellings(
    className: string,
    groupId: string,
    groupPrefixKeys: Map<string, string[]>,
): string[] {
    const prefixes = groupPrefixKeys.get(groupId)
    if (!prefixes || prefixes.length < 2) {
        return []
    }

    const matchedPrefix = prefixes
        .filter((prefix) => className.startsWith(`${prefix}-`))
        .sort((first, second) => second.length - first.length)[0]
    if (matchedPrefix === undefined) {
        return []
    }

    const value = className.slice(matchedPrefix.length + 1)
    return prefixes
        .filter((prefix) => prefix !== matchedPrefix)
        .map((prefix) => `${prefix}-${value}`)
}

/** Exact equality of two compiled declaration lists — the bar for treating two spellings as the same utility. */
function declarationsEqual(first: DeclarationEntry[], second: DeclarationEntry[]): boolean {
    return (
        first.length === second.length &&
        first.every((entry, index) => {
            const other = second[index]!
            return (
                sameDeclarationScope(entry, other) &&
                entry.property === other.property &&
                entry.important === other.important &&
                entry.value === other.value
            )
        })
    )
}
