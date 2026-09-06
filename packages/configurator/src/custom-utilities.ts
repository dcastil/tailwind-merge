import { type EncodingMode, encodeScale } from './compress.ts'
import {
    type DeclarationEntry,
    type DesignSystemAccess,
    classesCompile,
    declaredDeclarations,
    declaredProperties,
    propertyCovers,
    sameDeclarationScope,
} from './design-system.ts'
import { type PlanValue, type ValidatorName } from './plan.ts'

export interface CustomUtilityPlan {
    /** Self-conflict groups to register (group ID → items), for utilities that are not aliases of a built-in group. */
    groups: Map<string, PlanValue[]>
    /** Static utility classes that turned out to be aliases of a built-in group — their compiled declarations match that group's signature exactly, so they join it and get its full conflict behavior (class name → group ID). */
    aliases: Map<string, string>
    /** Inferred override relationships: group ID → built-in and custom group IDs whose declarations the utility fully covers, meaning the utility coming later in a class list makes the earlier class irrelevant. */
    conflicts: Map<string, string[]>
}

export interface BuildCustomUtilityPlanOptions {
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
    /** Classifies a class name against a config generated from the vanilla theme, used to find one exemplar class per built-in group. */
    vanillaClassGroupId: (className: string) => string | undefined
    /** How functional utilities' value spaces are encoded — see `EncodingMode`. */
    encoding: EncodingMode
}

/**
 * Plans tailwind-merge support for utilities the project registers beyond the built-ins — both `@utility` definitions in CSS and utilities added by `@plugin` JS plugins land in the same registry, so one diff covers both.
 *
 * Support is empirical, derived entirely from each utility's compiled declarations, in three tiers:
 *
 * 1. A static utility whose declarations match exactly one built-in group's signature and mutually cover its effects is an alias of that group (an unconditional `color` utility behaves like `text-red-500`), so it joins the group and merges with its classes in both directions.
 * 2. Every other utility root becomes its own group so it merges against itself — and when its declarations fully cover what another group sets (`btn` with `padding` + `border-radius` covers everything `p-4` sets; see `fullyCovers` for the exact rule), an override edge is added so the utility coming later removes the covered class. The reverse direction stays out on purpose: `p-4` after `btn` only overrides part of `btn`, and removing `btn` would lose the rest of its effect — the same partial-override rule the default config applies between `px` and `p`.
 * 3. Declarations that are conditional (media queries, dark-mode guards) or target other elements (pseudo-elements, child selectors) only count as covered when they are byte-identical shared scaffolding: they overlap only sometimes or somewhere else, so a utility that merely touches them stays side by side with whatever it partially overlaps.
 *
 * Roots that already exist as built-ins are skipped entirely: shadowing changes built-in behavior in ways a registry diff cannot judge.
 */
export function buildCustomUtilityPlan({
    project,
    vanilla,
    vanillaClassGroupId,
    encoding,
}: BuildCustomUtilityPlanOptions): CustomUtilityPlan {
    const vanillaRoots = new Set([
        ...vanilla.utilities.keys('static'),
        ...vanilla.utilities.keys('functional'),
    ])
    const functionalRoots = project.utilities.keys('functional').filter((root) => !vanillaRoots.has(root))
    const staticRoots = project.utilities.keys('static').filter((root) => !vanillaRoots.has(root))
    const staticRootSet = new Set(staticRoots)
    const functionalClasses = collectFunctionalClasses(project, functionalRoots, staticRootSet)
    const functionalExemplars = new Map(
        [...functionalClasses].map(([root, classNames]) => [
            root,
            classNames.find((className) => declaredDeclarations(project, className)?.length) ?? null,
        ]),
    )

    const groupSignatures = collectGroupSignatures(vanilla, vanillaClassGroupId)

    const groups = new Map<string, CustomUtilityGroup>()
    const aliases = new Map<string, string>()

    for (const root of staticRoots) {
        // A static root sharing its name with a functional custom root joins the functional group only when the two provably have the same effect (they cover each other, like a `shimmer` default alongside `shimmer-*` values) — splitting those would stop them from merging. When the functional form carries state the bare form doesn't (supabase's `hit-area` scaffold vs `hit-area-*` offsets), they stay separate groups and override inference below adds the correct one-directional relationship instead.
        if (functionalClasses.has(root)) {
            const functionalExemplar = functionalExemplars.get(root) ?? null
            if (
                functionalExemplar !== null &&
                fullyCovers(
                    declaredDeclarations(project, root),
                    declaredDeclarations(project, functionalExemplar),
                ) &&
                fullyCovers(
                    declaredDeclarations(project, functionalExemplar),
                    declaredDeclarations(project, root),
                )
            ) {
                continue
            }
            groups.set(`${customUtilityGroupId(root)}.static`, {
                items: [{ kind: 'class', value: root }],
                exemplar: root,
            })
            continue
        }

        const aliasGroupId = findAliasGroup(project, root, groupSignatures)
        if (aliasGroupId !== null) {
            aliases.set(root, aliasGroupId)
        } else {
            groups.set(customUtilityGroupId(root), {
                items: [{ kind: 'class', value: root }],
                exemplar: root,
            })
        }
    }

    for (const root of functionalRoots) {
        const groupId = customUtilityGroupId(root)
        const items: PlanValue[] = []
        if (staticRootSet.has(root) && !groups.has(`${groupId}.static`)) {
            items.push({ kind: 'class', value: root })
        }
        // 'compact': `isAny` under the root makes every `root-*` value self-conflict — right in that whatever values the utility accepts all set the same declarations, but it also hands nonexistent values eviction power over real ones (see `EncodingMode`). 'exact' therefore enumerates the compile-verified named values and keeps only the validators whose whole value kind probes as accepted.
        const valueItems =
            encoding === 'compact'
                ? [{ kind: 'validator', name: 'isAny' } satisfies PlanValue]
                : exactFunctionalValueItems(
                      project,
                      root,
                      functionalClasses.get(root)!.map((className) => className.slice(root.length + 1)),
                  )
        if (valueItems.length > 0) {
            items.push({ kind: 'object', entries: [[root, valueItems]] })
        }
        if (items.length > 0) {
            groups.set(groupId, { items, exemplar: functionalExemplars.get(root) ?? null })
        }
    }

    return {
        groups: new Map([...groups].map(([groupId, group]) => [groupId, group.items])),
        aliases,
        conflicts: inferOverrideConflicts(project, groups, groupSignatures),
    }
}

/** Group IDs get a `utility.` prefix so they cannot collide with the skeleton's group IDs and are recognizable in reports and the emitted config. */
function customUtilityGroupId(root: string): string {
    return `utility.${root}`
}

/** Members and their representative class travel together, so override inference never has to reconstruct a utility root from a generated group ID. */
interface CustomUtilityGroup {
    items: PlanValue[]
    exemplar: string | null
}

/**
 * Indexes suggested classes once for both encoding and conflict inference. A static class belongs to its own root; other classes belong to the longest functional root that prefixes them. Using the same ownership rule prevents a nested root such as `demo-child-*` from becoming the exemplar or a named value of `demo-*`.
 */
function collectFunctionalClasses(
    project: DesignSystemAccess,
    functionalRoots: string[],
    staticRoots: Set<string>,
): Map<string, string[]> {
    const classesByRoot = new Map<string, string[]>(functionalRoots.map((root) => [root, []]))
    if (functionalRoots.length === 0) {
        return classesByRoot
    }
    const longestRootsFirst = [...functionalRoots].sort((first, second) => second.length - first.length)
    const seen = new Set<string>()

    for (const [className] of project.getClassList()) {
        if (staticRoots.has(className) || seen.has(className)) {
            continue
        }
        seen.add(className)
        const root = longestRootsFirst.find((candidate) => className.startsWith(`${candidate}-`))
        if (root !== undefined) {
            classesByRoot.get(root)!.push(className)
        }
    }

    return classesByRoot
}

/**
 * Value kinds a functional utility can accept beyond its named values, each proven open-ended by sentinel candidates: when the sentinels compile, Tailwind's value handling accepts the *kind* (`--value(number)` compiles every number), so the matching validator is exact rather than an approximation. Sentinels containing `.`, `/` or `%` cannot collide with named theme tokens (those characters are invalid in CSS custom property names); the integer sentinels could, which is why every kind requires two sentinels — a theme naming both is beyond unlikely.
 */
const BARE_VALUE_PROBES: [ValidatorName, string[]][] = [
    ['isFraction', ['355/113', '19/97']],
    ['isNumber', ['971.5', '823.25']],
    ['isInteger', ['9713', '8231']],
    ['isPercent', ['77.9%', '61.3%']],
]

/**
 * One representative arbitrary value per candidate type (length, number, percentage, color, plain ident). Accepting any of them means the utility takes arbitrary values, e.g. `--value([length])` or `--value([*])`.
 */
const ARBITRARY_VALUE_PROBES = ['[3px]', '[7]', '[41%]', '[#650a1b]', '[twm-probe]']

const ARBITRARY_VARIABLE_PROBE = '(--twm-probe)'

/**
 * The exact-mode value matchers of one functional root: the compile-verified named values (scale-encoded, so families still factor), plus validators for every open-ended value kind the probes prove. Remaining approximation: `isArbitraryValue` matches arbitrary values of the wrong *type* (`ll-[red]` on a `--value([length])` utility), because typed arbitrary validators re-implement Tailwind's type inference heuristically and a mismatch there would undermatch real classes — the worse failure. Values a kind probe cannot represent don't exist today (checked against Tailwind 4.3's value handling: named, literal, bare number/integer/percentage/ratio, arbitrary, arbitrary variable), so anything not probed here simply doesn't compile and correctly stays unclassified.
 */
function exactFunctionalValueItems(
    project: DesignSystemAccess,
    root: string,
    namedTails: string[],
): PlanValue[] {
    const probeTails = [
        ...BARE_VALUE_PROBES.flatMap(([, sentinels]) => sentinels),
        ...ARBITRARY_VALUE_PROBES,
        ARBITRARY_VARIABLE_PROBE,
    ]
    const allTails = [...namedTails, ...probeTails]
    const compileResults = classesCompile(
        project,
        allTails.map((tail) => `${root}-${tail}`),
    )
    const compiledTails = new Set(allTails.filter((_, index) => compileResults[index]))

    // Suggestions that don't compile produce no CSS and must not gain eviction power — the same rule that motivates exact mode in the first place.
    const items = encodeScale(
        namedTails.filter((tail) => compiledTails.has(tail)),
        'exact',
    ).items

    const acceptedKinds = BARE_VALUE_PROBES.filter(([, sentinels]) =>
        sentinels.every((sentinel) => compiledTails.has(sentinel)),
    ).map(([validatorName]) => validatorName)
    for (const validatorName of acceptedKinds) {
        // isNumber accepting every integer makes isInteger redundant beside it.
        if (validatorName === 'isInteger' && acceptedKinds.includes('isNumber')) {
            continue
        }
        items.push({ kind: 'validator', name: validatorName })
    }
    if (ARBITRARY_VALUE_PROBES.some((probe) => compiledTails.has(probe))) {
        items.push({ kind: 'validator', name: 'isArbitraryValue' })
    }
    if (compiledTails.has(ARBITRARY_VARIABLE_PROBE)) {
        items.push({ kind: 'validator', name: 'isArbitraryVariable' })
    }

    return items
}

interface GroupSignatures {
    groupIds: () => Iterable<string>
    /** Full context-qualified property signature of the group's exemplar class. */
    signature: (groupId: string) => Set<string> | null
    /** The group exemplar's full declarations, the target side of override-cover checks. */
    declarations: (groupId: string) => DeclarationEntry[] | null
}

/**
 * One exemplar vanilla class per built-in group, with lazily computed signatures — most groups are never compared against, and compiling ~300 exemplars eagerly would cost more than the whole rest of the pass.
 */
function collectGroupSignatures(
    vanilla: DesignSystemAccess,
    vanillaClassGroupId: (className: string) => string | undefined,
): GroupSignatures {
    const exemplars = new Map<string, string>()
    for (const [className] of vanilla.getClassList()) {
        const groupId = vanillaClassGroupId(className)
        if (groupId !== undefined && !exemplars.has(groupId)) {
            exemplars.set(groupId, className)
        }
    }

    const signatureCache = new Map<string, Set<string> | null>()

    return {
        groupIds: () => exemplars.keys(),
        signature: (groupId) => {
            let signature = signatureCache.get(groupId)
            if (signature === undefined) {
                const exemplar = exemplars.get(groupId)
                signature = exemplar === undefined ? null : declaredProperties(vanilla, exemplar)
                signatureCache.set(groupId, signature)
            }
            return signature
        },
        // declaredDeclarations caches per class behind the scenes, so no extra cache is needed here.
        declarations: (groupId) => {
            const exemplar = exemplars.get(groupId)
            return exemplar === undefined ? null : declaredDeclarations(vanilla, exemplar)
        },
    }
}

/**
 * Finds the single built-in group whose classes set exactly what the static utility sets: the signatures (context-qualified property names) must be equal, and utility and group exemplar must cover each other — the cover check adds conditionality awareness the signature lacks, so a padding inside a media query can never alias into the unconditional `p` group. Zero matches means the utility does its own thing; several matches would make the choice a guess, so both fall back to self-conflict grouping.
 */
function findAliasGroup(
    project: DesignSystemAccess,
    className: string,
    groupSignatures: GroupSignatures,
): string | null {
    const properties = declaredProperties(project, className)
    if (properties === null || properties.size === 0) {
        return null
    }
    const declarations = declaredDeclarations(project, className)

    const matches: string[] = []
    for (const groupId of groupSignatures.groupIds()) {
        const signature = groupSignatures.signature(groupId)
        if (
            signature !== null &&
            signature.size === properties.size &&
            [...properties].every((key) => signature.has(key)) &&
            aliasEquivalent(declarations, groupSignatures.declarations(groupId))
        ) {
            matches.push(groupId)
        }
    }

    return matches.length === 1 ? matches[0]! : null
}

/**
 * Signature equality alone is blind to conditions. Aliases need an unconditional element-level effect and mutual coverage: a later built-in color must never remove a custom utility's independent hover or dark-mode color, even when both touch only `color`.
 */
function aliasEquivalent(
    first: DeclarationEntry[] | null,
    second: DeclarationEntry[] | null,
): boolean {
    if (first === null || second === null) {
        return false
    }
    return (
        first.some((entry) => entry.context === '' && !entry.conditional) &&
        fullyCovers(first, second) &&
        fullyCovers(second, first)
    )
}

/**
 * Whether a class fully covers another, meaning: with the coverer coming later, the covered class has no independent effect left, so removing it loses nothing. Each declaration of the target must be accounted for — an unconditional element-level real property by an equal or shorthand property of the coverer, an unconditional element-level custom property (a state carrier like `--hit-area-l`) by the coverer re-declaring the same one, and everything conditional or targeting another element (shared `::before` scaffolding) only by a byte-identical declaration under the same enclosing rules in the coverer. Anything unaccounted for means partial overlap, and partial overlap never justifies removal — the same rule the default config applies between `px` and `p`.
 */
export function fullyCovers(
    coverer: DeclarationEntry[] | null,
    target: DeclarationEntry[] | null,
): boolean {
    if (coverer === null || target === null || target.length === 0) {
        return false
    }

    return target.every((targetEntry) => {
        if (targetEntry.context === '' && !targetEntry.conditional) {
            if (targetEntry.property.startsWith('--')) {
                return coverer.some(
                    (entry) =>
                        entry.context === '' &&
                        !entry.conditional &&
                        entry.property === targetEntry.property,
                )
            }
            return coverer.some(
                (entry) =>
                    entry.context === '' &&
                    !entry.conditional &&
                    !entry.property.startsWith('--') &&
                    propertyCovers(entry.property, targetEntry.property),
            )
        }

        return coverer.some(
            (entry) =>
                sameDeclarationScope(entry, targetEntry) &&
                entry.property === targetEntry.property &&
                entry.value === targetEntry.value,
        )
    })
}

/**
 * For every custom group, finds the groups whose exemplar declarations its utility fully covers — whenever the utility comes later in a class list, the covered class is redundant and gets removed. Inference is exemplar-based like classification: one class stands in for each group, which is exact for custom utilities (all values of a root set the same properties) and an approximation for built-in groups.
 */
function inferOverrideConflicts(
    project: DesignSystemAccess,
    customGroups: Map<string, CustomUtilityGroup>,
    groupSignatures: GroupSignatures,
): Map<string, string[]> {
    const customDeclarations = new Map<string, DeclarationEntry[] | null>()
    for (const [groupId, { exemplar }] of customGroups) {
        customDeclarations.set(
            groupId,
            exemplar === null ? null : declaredDeclarations(project, exemplar),
        )
    }

    const conflicts = new Map<string, string[]>()

    for (const [groupId, declarations] of customDeclarations) {
        if (declarations === null || declarations.length === 0) {
            continue
        }

        const covered: string[] = []

        for (const targetGroupId of groupSignatures.groupIds()) {
            if (fullyCovers(declarations, groupSignatures.declarations(targetGroupId))) {
                covered.push(targetGroupId)
            }
        }

        for (const [otherGroupId, otherDeclarations] of customDeclarations) {
            if (otherGroupId !== groupId && fullyCovers(declarations, otherDeclarations)) {
                covered.push(otherGroupId)
            }
        }

        if (covered.length > 0) {
            conflicts.set(groupId, covered)
        }
    }

    return conflicts
}
