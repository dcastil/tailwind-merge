import { getDefaultConfig, validators } from 'tailwind-merge'
import { type ClassGroup, type ThemeGetter } from 'tailwind-merge/unstable-do-not-import'

import { type EncodingMode, type ScaleEncoding, encodeScale } from './compress.ts'
import { type CustomUtilityPlan } from './custom-utilities.ts'
import { type ThemeSnapshot } from './snapshot.ts'

/**
 * Serializable representation of one class definition within a class group.
 *
 * The plan is the single intermediate representation between the default-config skeleton and the two outputs (runtime config object and emitted source code). Keeping it fully serializable — validators are referenced by name, never by function — guarantees that materialized and emitted configs cannot drift apart.
 */
export type PlanValue =
    | { kind: 'class'; value: string }
    | { kind: 'validator'; name: ValidatorName }
    | { kind: 'object'; entries: [string, PlanValue[]][] }

export type ValidatorName = keyof typeof validators

export interface ConfigPlan {
    cacheSize: number
    prefix: string | null
    classGroups: Map<string, PlanValue[]>
    /** Resolved scales per theme key. Group arrays contain the items as contiguous runs (theme getters are spliced in place), so the emitter can reuse them as spreadable shared consts, named and documented per theme key. */
    scales: Map<string, ScalePlan>
    conflictingClassGroups: Map<string, string[]>
    conflictingClassGroupModifiers: Map<string, string[]>
    postfixLookupClassGroups: string[]
    orderSensitiveModifiers: string[]
    report: PlanReport
}

export interface PlanReport {
    /** Which encoding mode the plan was built with — see `EncodingMode` for the tradeoff. */
    encoding: EncodingMode
    /** Chosen encoding strategy per theme scale, for CLI output and tests. */
    scaleStrategies: Record<string, string>
    /** Self-conflict groups created for utilities the project registers beyond the built-ins (`@utility` and `@plugin`), by group ID. */
    customUtilityGroups: string[]
    /** Static custom utilities whose compiled declarations exactly match one built-in group's signature — they joined that group instead of getting their own (class name → group ID). */
    aliasedUtilityClasses: Record<string, string>
    /** Inferred override relationships for custom utility groups: the utility coming later in a class list removes classes of the listed groups, because its unconditional element-level declarations fully cover theirs. */
    customUtilityConflicts: Record<string, string[]>
    /** Class groups dropped because the theme disables everything they could match, e.g. after a namespace reset. Their conflict map entries are dropped with them. */
    prunedClassGroups: string[]
    /** Full class names appended per class group by the vanilla-diff augmentation pass — classes from compat sub-namespaces (`--text-color-*`) and namespaces without a tailwind-merge theme key (`--z-index-*`). */
    augmentedClassGroups: Record<string, string[]>
    /** Name collisions resolved after a theme value name shadowed an existing class (e.g. `--color-bottom` vs `bg-bottom`). `keptGroupId` names the group the class stays in, or is null when the class now resolves through multiple utilities at once and was neutralized — removed from every group so it passes through unmerged. */
    resolvedCollisions: {
        className: string
        keptGroupId: string | null
        removedFromGroupIds: string[]
    }[]
    /** Theme-created classes no group could be determined for. Reported so gaps are visible instead of silently unmergeable. */
    unassignedClasses: { className: string; reason: string }[]
    /** Present when the plan was pruned to a project's used classes (see `prunePlan`). */
    pruning?: PruneReport
}

/** What pruning did to a plan, for CLI output, plugin logs, and tests. Counts only — the kept class names are visible in the emitted config itself. */
export interface PruneReport {
    /** Distinct class names handed to the pruner (raw scanner tokens included: anything that looked like a class name in the sources). */
    usedClassCount: number
    /** How many of them the full config classifies into a class group; the rest are non-Tailwind tokens, arbitrary properties, or class names the theme doesn't produce. */
    classifiedClassCount: number
    classGroupsBefore: number
    classGroupsAfter: number
    /** Class groups dropped because no used class belongs to them, in plan order. */
    removedClassGroups: string[]
    /** Class groups kept in full because a used class classified into them through a path the member-level walk could not attribute — should stay empty; non-empty means a mismatch between the walk and tailwind-merge's class map worth investigating. */
    unprunedClassGroups: string[]
}

export interface ScalePlan {
    items: PlanValue[]
    /** Human explanation of the scale's provenance and encoding, emitted as a JSDoc comment on the shared const. */
    comment: string
}

export interface BuildPlanOptions {
    snapshot: ThemeSnapshot
    cacheSize?: number
    /** How finite value sets are encoded — see `EncodingMode`. Defaults to 'compact'. */
    encoding?: EncodingMode
}

/**
 * Transforms the default config skeleton into a plan with all theme references resolved against the design-system snapshot.
 *
 * Walking `getDefaultConfig()` instead of maintaining a parallel structure means class group semantics, group ordering (which decides validator precedence in the class map), and conflict relationships automatically stay in sync with tailwind-merge.
 */
export function buildPlan({ snapshot, cacheSize, encoding = 'compact' }: BuildPlanOptions): ConfigPlan {
    const skeleton = getDefaultConfig()
    const scaleEncodings = new Map<string, ScaleEncoding>()

    function resolveScale(themeKey: string): ScaleEncoding {
        let scaleEncoding = scaleEncodings.get(themeKey)
        if (!scaleEncoding) {
            scaleEncoding = encodeThemeScale(themeKey, snapshot, encoding)
            scaleEncodings.set(themeKey, scaleEncoding)
        }
        return scaleEncoding
    }

    function planGroup(group: ClassGroup<string>): PlanValue[] {
        return dedupeValues(group.flatMap(planDefinition))
    }

    function planDefinition(definition: ClassGroup<string>[number]): PlanValue[] {
        if (typeof definition === 'string') {
            return [{ kind: 'class', value: definition }]
        }

        if (typeof definition === 'function') {
            if (isThemeGetter(definition)) {
                if (definition.themeKey === undefined) {
                    // fromTheme sets themeKey on every getter it creates; absence means an unsupported tailwind-merge version (see the peerDependencies range).
                    throw new Error(
                        'Theme getter without a themeKey property — the configurator requires a tailwind-merge version that exposes it',
                    )
                }
                // Every group gets its own copy of the scale, nested family objects included: collision corrections later remove single claims from one group's copy (`xl` from the drop-shadow copy of the color scale while `text-xl` stays a color), which must never leak into the other groups or the shared scale const. The emitter recognizes scale runs structurally, so copies cost nothing in the output.
                return cloneValues(resolveScale(definition.themeKey).items)
            }

            const name = validatorNames.get(definition)
            if (!name) {
                // Would mean the default config uses a validator that is not exported publicly — a tailwind-merge change the configurator must be updated for.
                throw new Error('Unknown validator in default config, cannot emit a reference to it')
            }
            return [{ kind: 'validator', name }]
        }

        const entries = Object.entries(definition)
            .map(([key, value]): [string, PlanValue[]] => [key, planGroup(value)])
            .filter(([, items]) => items.length > 0)

        return entries.length === 0 ? [] : [{ kind: 'object', entries }]
    }

    const classGroups = new Map<string, PlanValue[]>()
    const prunedClassGroups: string[] = []

    for (const [classGroupId, group] of Object.entries(skeleton.classGroups)) {
        const items = planGroup(group)
        if (items.length === 0) {
            prunedClassGroups.push(classGroupId)
        } else {
            classGroups.set(classGroupId, items)
        }
    }

    for (const [classGroupId, classNames] of Object.entries(UTILITY_STATIC_CLASSES)) {
        const items = classGroups.get(classGroupId)
        if (items) {
            items.push(...classNames.map((value): PlanValue => ({ kind: 'class', value })))
        }
    }

    return {
        cacheSize: cacheSize ?? skeleton.cacheSize,
        prefix: snapshot.prefix,
        classGroups,
        scales: new Map(
            [...scaleEncodings].map(([themeKey, encoding]) => [
                themeKey,
                { items: encoding.items, comment: describeScale(themeKey, encoding.strategy) },
            ]),
        ),
        conflictingClassGroups: filterConflictMap(skeleton.conflictingClassGroups, classGroups),
        conflictingClassGroupModifiers: filterConflictMap(
            skeleton.conflictingClassGroupModifiers,
            classGroups,
        ),
        postfixLookupClassGroups: (skeleton.postfixLookupClassGroups ?? []).filter((classGroupId) =>
            classGroups.has(classGroupId),
        ),
        orderSensitiveModifiers: [...skeleton.orderSensitiveModifiers],
        report: {
            encoding,
            scaleStrategies: Object.fromEntries(
                [...scaleEncodings].map(([themeKey, scaleEncoding]) => [
                    themeKey,
                    scaleEncoding.strategy,
                ]),
            ),
            prunedClassGroups,
            customUtilityGroups: [],
            aliasedUtilityClasses: {},
            customUtilityConflicts: {},
            augmentedClassGroups: {},
            resolvedCollisions: [],
            unassignedClasses: [],
        },
    }
}

/**
 * Applies the custom-utility plan: self-conflict groups join `classGroups` like any other group, alias classes join their built-in group as literals (the trie gives named paths precedence, and joining wires up the group's full conflict behavior), and inferred override relationships land in `conflictingClassGroups` so a custom utility coming later removes the classes it fully covers.
 */
export function applyCustomUtilityPlan(
    plan: ConfigPlan,
    customUtilityPlan: CustomUtilityPlan,
): void {
    for (const [groupId, items] of customUtilityPlan.groups) {
        plan.classGroups.set(groupId, items)
        plan.report.customUtilityGroups.push(groupId)
    }
    // A postfix can add independent declarations and select a different effect group (pair-2/3 vs pair-2). Pruning mirrors the runtime's complete-class lookup for these groups.
    plan.postfixLookupClassGroups.push(...customUtilityPlan.postfixLookupClassGroups)
    for (const root of customUtilityPlan.extendedBuiltInRoots) {
        plan.report.unassignedClasses.push({
            className: `${root}-*`,
            reason: 'custom utility extends a built-in root; only values the built-in matchers accept are classified',
        })
    }

    for (const [className, groupId] of customUtilityPlan.aliases) {
        const items = plan.classGroups.get(groupId)
        if (!items) {
            // The target group was pruned, which can only happen when the theme reset everything it matched — the alias still belongs there, so restore the group with just the literal.
            plan.classGroups.set(groupId, [{ kind: 'class', value: className }])
        } else {
            items.push({ kind: 'class', value: className })
        }
        plan.report.aliasedUtilityClasses[className] = groupId
    }

    for (const [groupId, coveredGroupIds] of customUtilityPlan.conflicts) {
        // Override targets pruned from the plan have no classes left to remove; dropping the edge keeps the emitted conflict map free of dangling group IDs.
        const existingTargets = coveredGroupIds.filter((targetId) => plan.classGroups.has(targetId))
        if (existingTargets.length === 0) {
            continue
        }
        const conflictTargets = plan.conflictingClassGroups.get(groupId)
        if (conflictTargets) {
            conflictTargets.push(...existingTargets)
        } else {
            plan.conflictingClassGroups.set(groupId, existingTargets)
        }
        plan.report.customUtilityConflicts[groupId] = existingTargets
    }
}

/**
 * Appends augmentation classes (full class names determined by the vanilla-diff pass) to their class groups and records them in the report. Appending literals is enough: the trie gives named paths precedence over validators, and joining an existing group wires up all its conflict relations automatically.
 */
export function applyAugmentations(
    plan: ConfigPlan,
    augmentations: {
        assignments: Map<string, string[]>
        collisions: {
            className: string
            claimingGroupId: string
            ownerGroupId: string
            resolution: 'restore' | 'neutralize'
        }[]
        unassigned: { className: string; reason: string }[]
    },
): void {
    for (const [classGroupId, classNames] of augmentations.assignments) {
        const items = plan.classGroups.get(classGroupId)
        if (!items) {
            // The target group was pruned, which can only happen when the theme reset everything it matched — the augmented class still belongs there, so restore the group with just the literals.
            plan.classGroups.set(
                classGroupId,
                classNames.map((value): PlanValue => ({ kind: 'class', value })),
            )
        } else {
            items.push(...classNames.map((value): PlanValue => ({ kind: 'class', value })))
        }
        plan.report.augmentedClassGroups[classGroupId] = classNames
    }

    plan.report.unassignedClasses.push(...augmentations.unassigned)

    // Collisions are resolved by removing claims, which works on each group's own copy of the scale items (with `--color-xl`, removing `xl` under `drop-shadow` leaves `text-xl` a color). 'restore' removes the wrong group's claim so the owner's own machinery classifies the class again; 'neutralize' removes the claims of both groups, because a class compiling into multiple rules at once must not be merged away in either direction. A claim that is not a removable literal (a validator like `isNumber`, or a factored family's `{ x: [isNumber] }`) can still be outranked: tailwind-merge's class map always prefers an exact literal path over a validator, so 'restore' then appends the class to the owner group as a literal, and 'neutralize' gives it a conflict-free group of its own — either way the class ends up exactly where Tailwind's compiled output says it belongs.
    for (const { className, claimingGroupId, ownerGroupId, resolution } of augmentations.collisions) {
        const groupIdsToRemoveFrom =
            resolution === 'restore' ? [claimingGroupId] : [...new Set([claimingGroupId, ownerGroupId])]
        const removedFromGroupIds = groupIdsToRemoveFrom.filter((groupId) => {
            const items = plan.classGroups.get(groupId)
            return items !== undefined && removeClassClaim(items, className)
        })
        const fullyRemoved = removedFromGroupIds.length === groupIdsToRemoveFrom.length

        if (resolution === 'restore') {
            const ownerItems = plan.classGroups.get(ownerGroupId)
            if (!fullyRemoved && ownerItems !== undefined && !hasClassClaim(ownerItems, className)) {
                ownerItems.push({ kind: 'class', value: className })
            }
            plan.report.resolvedCollisions.push({
                className,
                keptGroupId: ownerGroupId,
                removedFromGroupIds,
            })
        } else {
            if (!fullyRemoved) {
                plan.classGroups.set(neutralizedGroupId(className), [{ kind: 'class', value: className }])
            }
            plan.report.resolvedCollisions.push({ className, keptGroupId: null, removedFromGroupIds })
        }
    }
}

/** Group ID for a neutralized class that keeps a validator-based claim somewhere: a group of its own, referenced by no conflict map, so the class behaves like a non-Tailwind class while still outranking the validator through its literal path. */
function neutralizedGroupId(className: string): string {
    return `collision.${className}`
}

/** Whether `className` already resolves into these items through a literal — the check that keeps a restore from appending a duplicate literal to the owner group. Mirrors the walk in `removeClassClaim`. */
function hasClassClaim(items: PlanValue[], className: string): boolean {
    return items.some((item) => {
        if (item.kind === 'class') {
            return item.value === className
        }
        if (item.kind === 'object') {
            return item.entries.some(
                ([key, entryItems]) =>
                    className.startsWith(`${key}-`) &&
                    hasClassClaim(entryItems, className.slice(key.length + 1)),
            )
        }
        return false
    })
}

/** Deep copy of plan values, so group arrays can be edited independently of each other and of the shared scale definitions. */
function cloneValues(values: PlanValue[]): PlanValue[] {
    return values.map((value) =>
        value.kind === 'object'
            ? { kind: 'object', entries: value.entries.map(([key, items]) => [key, cloneValues(items)]) }
            : value,
    )
}

/**
 * Removes the item that makes `className` resolve into this group: a full-class literal, or a literal reached through object entries whose keys prefix the class name — recursively, because the family encoding nests (`background-alternative-200` may live at `{ background: [{ alternative: ['200'] }] }`). Returns false when the claim comes from something else (a validator), which the caller reports instead of guessing.
 */
function removeClassClaim(items: PlanValue[], className: string): boolean {
    for (let index = 0; index < items.length; index++) {
        const item = items[index]!

        if (item.kind === 'class' && item.value === className) {
            items.splice(index, 1)
            return true
        }

        if (item.kind === 'object') {
            for (const [key, entryItems] of item.entries) {
                if (
                    className.startsWith(`${key}-`) &&
                    removeClassClaim(entryItems, className.slice(key.length + 1))
                ) {
                    return true
                }
            }
        }
    }

    return false
}

/**
 * Colors that every color utility accepts as static keywords in addition to theme values. They are utility semantics rather than theme variables, so the design system's theme does not contain them. Today's default config matches them implicitly through the permissive `isAny` color scale.
 */
const COLOR_KEYWORDS = ['inherit', 'current', 'transparent']

/**
 * Static utility classes that belong to specific class groups but are neither theme values nor skeleton literals — the default config catches them through permissive validators or its approximated theme scales, both of which the plan replaces with exact values. The shadow `*-initial` utilities reset the corresponding `--tw-*-shadow-color` custom property, the gradient `*-none` utilities reset gradient stops, and `perspective-none` is a static value the skeleton keeps in its theme approximation. All verified via `candidatesToCss` probing against tailwindcss 4.3; P2's probing infrastructure should derive or at least verify this list automatically.
 */
const UTILITY_STATIC_CLASSES: Record<string, string[]> = {
    'shadow-color': ['shadow-initial'],
    'inset-shadow-color': ['inset-shadow-initial'],
    'text-shadow-color': ['text-shadow-initial'],
    'gradient-from': ['from-none'],
    'gradient-via': ['via-none'],
    'gradient-to': ['to-none'],
    accent: ['accent-auto'],
    leading: ['leading-none'],
    perspective: ['perspective-none'],
}

/**
 * Encodes the scale for one theme key, applying per-key knowledge on top of the generic encoding.
 */
function encodeThemeScale(
    themeKey: string,
    snapshot: ThemeSnapshot,
    encoding: EncodingMode,
): ScaleEncoding {
    const scale = snapshot.scales.get(themeKey)
    const names = scale?.names ?? []

    if (themeKey === 'color') {
        const scaleEncoding = encodeScale(names, encoding)
        return {
            items: [
                ...COLOR_KEYWORDS.map((value): PlanValue => ({ kind: 'class', value })),
                ...scaleEncoding.items,
            ],
            strategy: scaleEncoding.strategy,
        }
    }

    if (themeKey === 'spacing') {
        // The static `px` value (1px) is utility semantics and exists regardless of the theme. The numeric scale (`p-13` via multiplication) only exists while the bare `--spacing` multiplier variable is set, so the number validator must not be emitted without it — and stays in exact mode too, because the multiplier genuinely makes every number compile.
        const scaleEncoding = encodeScale(names, encoding)
        const items: PlanValue[] = [{ kind: 'class', value: 'px' }]
        let strategy = scaleEncoding.strategy
        if (scale?.hasBareValue) {
            items.push({ kind: 'validator', name: 'isNumber' })
            strategy = names.length === 0 ? 'multiplier' : `multiplier+${scaleEncoding.strategy}`
        }
        items.push(...scaleEncoding.items)
        return { items, strategy }
    }

    return encodeScale(names, encoding)
}

/**
 * Explains where a scale's values come from and why they are encoded the way they are, so the generated file stays debuggable without readers having to know the compression policy. Derived from the encoding strategy instead of restating the values, which the code right below the comment already shows.
 */
function describeScale(themeKey: string, strategy: string): string {
    const namespace = `\`--${themeKey}-*\``

    if (themeKey === 'spacing' && strategy.startsWith('multiplier')) {
        const base = `The bare \`--spacing\` multiplier is set, which makes every number a valid spacing value (e.g. p-13).`
        return strategy === 'multiplier' ? base : `Named ${namespace} theme values. ${base}`
    }

    const prefix =
        themeKey === 'color'
            ? `Color keywords plus the ${namespace} theme values`
            : `The ${namespace} theme values`

    if (strategy === 'families') {
        return `${prefix}, with families sharing numeric suffixes compressed into nested matchers.`
    }
    if (strategy.startsWith('validator:')) {
        return `${prefix}, all matching \`${strategy.slice('validator:'.length)}\`.`
    }
    if (strategy.startsWith('mixed:')) {
        return `${prefix}: enumerated outliers plus the \`${strategy.slice('mixed:'.length)}\` pattern covering the rest.`
    }
    return `${prefix}.`
}

const validatorNames = new Map<unknown, ValidatorName>(
    Object.entries(validators).map(([name, validator]) => [validator, name as ValidatorName]),
)

function isThemeGetter(value: Function): value is ThemeGetter {
    return 'isThemeGetter' in value && value.isThemeGetter === true
}

/**
 * Removes duplicate literals and validator references while keeping the first occurrence, since substituting a theme scale can repeat values the skeleton already defines statically (e.g. `text-base` exists both as skeleton literal and as `--text-base` theme value).
 */
function dedupeValues(values: PlanValue[]): PlanValue[] {
    const seen = new Set<string>()

    return values.filter((value) => {
        if (value.kind === 'object') {
            return true
        }
        const key = value.kind === 'class' ? `c:${value.value}` : `v:${value.name}`
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

export function filterConflictMap(
    conflictMap: Partial<Record<string, readonly string[]>>,
    classGroups: Map<string, PlanValue[]>,
): Map<string, string[]> {
    const filtered = new Map<string, string[]>()

    for (const [classGroupId, conflicts] of Object.entries(conflictMap)) {
        if (!classGroups.has(classGroupId) || !conflicts) {
            continue
        }
        const existingConflicts = conflicts.filter((conflictId) => classGroups.has(conflictId))
        if (existingConflicts.length > 0) {
            filtered.set(classGroupId, existingConflicts)
        }
    }

    return filtered
}
