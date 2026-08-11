import {
    type DesignSystemAccess,
    declaredProperties,
    haveProperSubset,
    havePropertiesEqual,
} from './design-system.ts'

export interface CollisionResolution {
    className: string
    /** The group whose scale value wrongly claimed the class. */
    claimingGroupId: string
    /** The group the class resolved to before the theme changed it. */
    vanillaGroupId: string
    /** 'restore': the original classification is still correct, remove the new claim. 'neutralize': the class now resolves through multiple utilities at once, so it must not belong to any group — remove every claim and let it pass through unmerged. */
    resolution: 'restore' | 'neutralize'
}

export interface AugmentationResult {
    /** Full class names to append per class group ID, in class-list order. */
    assignments: Map<string, string[]>
    /** Existing classes whose classification the theme accidentally changed (a value name shadowing them), e.g. `bg-bottom` with a `--color-bottom` defined. */
    collisions: CollisionResolution[]
    /** New classes no group could be determined for, with the reason — reported instead of guessed. */
    unassigned: { className: string; reason: string }[]
}

export interface BuildAugmentationsOptions {
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
    /** Classifies a class name against the config generated from the project's theme (before augmentation). Classes it already places correctly need no augmentation. */
    projectClassGroupId: (className: string) => string | undefined
    /** Classifies a class name against a config generated from the vanilla theme, used to bucket vanilla sibling classes into candidate groups. */
    vanillaClassGroupId: (className: string) => string | undefined
}

/**
 * Finds the classes the project's theme creates beyond what the standard theme namespaces cover, and determines which class group owns each one — empirically, without a maintained namespace table.
 *
 * Mechanism: diff the project's class list against the vanilla one. Every new class that the generated config doesn't already classify is matched against candidate groups derived from its vanilla siblings (classes sharing the first name segment, e.g. `text-…`), where each candidate group is represented by the declared-property signature of one exemplar class. A unique signature match assigns the group — `text-primary` declares `color` like `text-red-500` does, not `font-size` like `text-xl` — which handles Tailwind's undocumented compat sub-namespaces (`--text-color-*`, `--background-color-*`) and namespaces tailwind-merge has no theme key for (`--z-index-*`, `--border-width-*`) with one rule. Ambiguous or unmatched classes are reported, never guessed.
 */
export function buildAugmentations({
    project,
    vanilla,
    projectClassGroupId,
    vanillaClassGroupId,
}: BuildAugmentationsOptions): AugmentationResult {
    const vanillaClassNames = vanilla.getClassList().map(([className]) => className)
    const vanillaClassNameSet = new Set(vanillaClassNames)

    const newClassNames = project
        .getClassList()
        .map(([className]) => className)
        .filter((className) => !vanillaClassNameSet.has(className))

    const exemplarsByFirstSegment = collectExemplars(vanillaClassNames, vanillaClassGroupId)

    const assignments = new Map<string, string[]>()
    const unassigned: { className: string; reason: string }[] = []
    const handledNames = new Set<string>()

    for (const className of newClassNames) {
        // Negative utilities ('-z-header') resolve through the same class-map path as their positive form because the parser skips the leading dash, so only the positive name gets registered and each positive/negative pair is handled once.
        const registrationName = className.startsWith('-') ? className.slice(1) : className
        if (handledNames.has(registrationName)) {
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

        if (projectClassGroupId(registrationName) === targetGroupId) {
            continue
        }

        const groupClassNames = assignments.get(targetGroupId)
        if (groupClassNames) {
            groupClassNames.push(registrationName)
        } else {
            assignments.set(targetGroupId, [registrationName])
        }
    }

    // Collision corrections: a theme value name can shadow a class that already exists (`--color-bottom` vs the `bg-bottom` position, `--color-xl` vs the `drop-shadow-xl` size). Which side Tailwind resolves differs per utility — `text-xl` genuinely becomes a color while `drop-shadow-xl` stays a size — so every class whose classification changed relative to the vanilla config is re-checked against its compiled output. Classes that now compile into multiple rules at once belong to no group at all.
    const collisions: CollisionResolution[] = []

    for (const className of vanillaClassNames) {
        const projectGroupId = projectClassGroupId(className)
        const vanillaGroupId = vanillaClassGroupId(className)
        if (
            projectGroupId === vanillaGroupId ||
            projectGroupId === undefined ||
            vanillaGroupId === undefined
        ) {
            continue
        }

        const registrationName = className.startsWith('-') ? className.slice(1) : className
        if (handledNames.has(registrationName)) {
            continue
        }

        const properties = declaredProperties(project, className)
        if (properties === null || properties.size === 0) {
            continue
        }
        handledNames.add(registrationName)

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
                vanillaGroupId,
                resolution: 'neutralize',
            })
        } else if (targetGroupId === vanillaGroupId) {
            collisions.push({
                className: registrationName,
                claimingGroupId: projectGroupId,
                vanillaGroupId,
                resolution: 'restore',
            })
        } else {
            unassigned.push({
                className: registrationName,
                reason:
                    typeof targetGroupId === 'string'
                        ? `classification changed to an unexpected group (${targetGroupId})`
                        : `classification changed but ${targetGroupId.reason}`,
            })
        }
    }

    return { assignments, collisions, unassigned }
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
