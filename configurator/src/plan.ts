import { getDefaultConfig, validators } from '../../src'
import { ClassGroup, ThemeGetter } from '../../src/lib/types'

import { ScaleEncoding, encodeScale } from './compress'
import { ThemeSnapshot } from './snapshot'

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
    /** Chosen encoding strategy per theme scale, for CLI output and tests. */
    scaleStrategies: Record<string, string>
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
}

export interface ScalePlan {
    items: PlanValue[]
    /** Human explanation of the scale's provenance and encoding, emitted as a JSDoc comment on the shared const. */
    comment: string
}

export interface BuildPlanOptions {
    snapshot: ThemeSnapshot
    cacheSize?: number
}

/**
 * Transforms the default config skeleton into a plan with all theme references resolved against the design-system snapshot.
 *
 * Walking `getDefaultConfig()` instead of maintaining a parallel structure means class group semantics, group ordering (which decides validator precedence in the class map), and conflict relationships automatically stay in sync with tailwind-merge.
 */
export function buildPlan({ snapshot, cacheSize }: BuildPlanOptions): ConfigPlan {
    const skeleton = getDefaultConfig()
    const resolveThemeKey = createThemeKeyResolver(Object.keys(skeleton.theme))
    const scaleEncodings = new Map<string, ScaleEncoding>()

    function resolveScale(themeKey: string): ScaleEncoding {
        let encoding = scaleEncodings.get(themeKey)
        if (!encoding) {
            encoding = encodeThemeScale(themeKey, snapshot)
            scaleEncodings.set(themeKey, encoding)
        }
        return encoding
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
                return resolveScale(resolveThemeKey(definition)).items
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
            scaleStrategies: Object.fromEntries(
                [...scaleEncodings].map(([themeKey, encoding]) => [themeKey, encoding.strategy]),
            ),
            prunedClassGroups,
            augmentedClassGroups: {},
            resolvedCollisions: [],
            unassignedClasses: [],
        },
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
            vanillaGroupId: string
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

    plan.report.unassignedClasses = [...augmentations.unassigned]

    // Collisions are resolved by removing claims. Each group array holds its own copy of the scale items, so a removed value keeps working for every other utility root (with `--color-xl`, removing `xl` under `drop-shadow` leaves `text-xl` a color). 'restore' removes only the new claim — the original group's own machinery then classifies the class again. 'neutralize' removes the claims of both groups, because a class compiling into multiple rules at once must not be merged away in either direction.
    for (const { className, claimingGroupId, vanillaGroupId, resolution } of augmentations.collisions) {
        const groupIdsToRemoveFrom =
            resolution === 'restore' ? [claimingGroupId] : [claimingGroupId, vanillaGroupId]
        const removedFromGroupIds = groupIdsToRemoveFrom.filter((groupId) => {
            const items = plan.classGroups.get(groupId)
            return items !== undefined && removeClassClaim(items, className)
        })

        if (removedFromGroupIds.length === groupIdsToRemoveFrom.length) {
            plan.report.resolvedCollisions.push({
                className,
                keptGroupId: resolution === 'restore' ? vanillaGroupId : null,
                removedFromGroupIds,
            })
        } else {
            plan.report.unassignedClasses.push({
                className,
                reason: `name collision with ${claimingGroupId} could not be fully resolved (a claim is not a plain value that can be removed)`,
            })
        }
    }
}

/**
 * Removes the item that makes `className` resolve into this group: either a top-level full-class literal, or a literal value inside an object entry whose key prefixes the class name. Returns false when the claim comes from something else (a validator or a compressed family), which the caller reports instead of guessing.
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
                if (!className.startsWith(`${key}-`)) {
                    continue
                }
                const valueName = className.slice(key.length + 1)
                const valueIndex = entryItems.findIndex(
                    (entryItem) => entryItem.kind === 'class' && entryItem.value === valueName,
                )
                if (valueIndex !== -1) {
                    entryItems.splice(valueIndex, 1)
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
function encodeThemeScale(themeKey: string, snapshot: ThemeSnapshot): ScaleEncoding {
    const scale = snapshot.scales.get(themeKey)
    const names = scale?.names ?? []

    if (themeKey === 'color') {
        const encoding = encodeScale(names)
        return {
            items: [
                ...COLOR_KEYWORDS.map((value): PlanValue => ({ kind: 'class', value })),
                ...encoding.items,
            ],
            strategy: encoding.strategy,
        }
    }

    if (themeKey === 'spacing') {
        // The static `px` value (1px) is utility semantics and exists regardless of the theme. The numeric scale (`p-13` via multiplication) only exists while the bare `--spacing` multiplier variable is set, so the number validator must not be emitted without it.
        const encoding = encodeScale(names)
        const items: PlanValue[] = [{ kind: 'class', value: 'px' }]
        let strategy = encoding.strategy
        if (scale?.hasBareValue) {
            items.push({ kind: 'validator', name: 'isNumber' })
            strategy = names.length === 0 ? 'multiplier' : `multiplier+${encoding.strategy}`
        }
        items.push(...encoding.items)
        return { items, strategy }
    }

    return encodeScale(names)
}

/**
 * Identifies which theme key a theme getter refers to by calling it with a probe theme whose values are unique markers. The key is not exposed on the getter itself, so this observes it through the getter's only behavior.
 */
function createThemeKeyResolver(themeKeys: string[]) {
    const markerToKey = new Map<unknown, string>()
    const probeTheme: Record<string, ClassGroup<string>> = {}

    for (const themeKey of themeKeys) {
        const marker: ClassGroup<string> = []
        markerToKey.set(marker, themeKey)
        probeTheme[themeKey] = marker
    }

    return (themeGetter: ThemeGetter): string => {
        const themeKey = markerToKey.get(themeGetter(probeTheme))
        if (!themeKey) {
            throw new Error('Theme getter in default config refers to an unknown theme key')
        }
        return themeKey
    }
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

function filterConflictMap(
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
