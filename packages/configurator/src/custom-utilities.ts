import { type EncodingMode, encodeScale } from './compress.ts'
import {
    type DeclarationEntry,
    type DesignSystemAccess,
    classesCompile,
    declaredDeclarations,
    declaredProperties,
    propertyCovers,
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
 * 1. A static utility whose declarations match exactly one built-in group's signature is an alias of that group (shadcn's `border-grid` is `border-color: var(--border)` and behaves like `border-red-500`), so it joins the group and merges with its classes in both directions.
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
    const functionalRootSet = new Set(functionalRoots)
    const staticRoots = project.utilities.keys('static').filter((root) => !vanillaRoots.has(root))

    const groupSignatures = collectGroupSignatures(vanilla, vanillaClassGroupId)

    const groups = new Map<string, PlanValue[]>()
    const aliases = new Map<string, string>()

    for (const root of staticRoots) {
        // A static root sharing its name with a functional custom root joins the functional group only when the two provably have the same effect (they cover each other, like a `shimmer` default alongside `shimmer-*` values) — splitting those would stop them from merging. When the functional form carries state the bare form doesn't (supabase's `hit-area` scaffold vs `hit-area-*` offsets), they stay separate groups and override inference below adds the correct one-directional relationship instead.
        if (functionalRootSet.has(root)) {
            const functionalExemplar = functionalRootExemplar(project, root)
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
            groups.set(`${customUtilityGroupId(root)}.static`, [{ kind: 'class', value: root }])
            continue
        }

        const aliasGroupId = findAliasGroup(project, root, groupSignatures)
        if (aliasGroupId !== null) {
            aliases.set(root, aliasGroupId)
        } else {
            groups.set(customUtilityGroupId(root), [{ kind: 'class', value: root }])
        }
    }

    const functionalValueTails =
        encoding === 'exact'
            ? collectFunctionalValueTails(project, functionalRootSet, [
                  ...functionalRoots,
                  ...staticRoots,
              ])
            : null

    for (const root of functionalRoots) {
        const groupId = customUtilityGroupId(root)
        const items: PlanValue[] = []
        if (
            project.utilities.keys('static').includes(root) &&
            !groups.has(`${groupId}.static`)
        ) {
            items.push({ kind: 'class', value: root })
        }
        // 'compact': `isAny` under the root makes every `root-*` value self-conflict — right in that whatever values the utility accepts all set the same declarations, but it also hands nonexistent values eviction power over real ones (see `EncodingMode`). 'exact' therefore enumerates the compile-verified named values and keeps only the validators whose whole value kind probes as accepted.
        const valueItems =
            functionalValueTails === null
                ? [{ kind: 'validator', name: 'isAny' } satisfies PlanValue]
                : exactFunctionalValueItems(project, root, functionalValueTails.get(root) ?? [])
        if (valueItems.length > 0) {
            items.push({ kind: 'object', entries: [[root, valueItems]] })
        }
        if (items.length > 0) {
            groups.set(groupId, items)
        }
    }

    return {
        groups,
        aliases,
        conflicts: inferOverrideConflicts(project, groups, groupSignatures),
    }
}

/** Group IDs get a `utility.` prefix so they cannot collide with the skeleton's group IDs and are recognizable in reports and the emitted config. */
function customUtilityGroupId(root: string): string {
    return `utility.${root}`
}

/**
 * Named values per functional root, from the class list in suggestion order. A class belongs to the longest custom root prefixing it, so `foo-bar-2` counts as a value of a `foo-bar` root rather than as `bar-2` under `foo`, and a class that *is* a static root stays out of value enumeration (the static branches above handle it). One pass over the class list serves every root.
 */
function collectFunctionalValueTails(
    project: DesignSystemAccess,
    functionalRootSet: Set<string>,
    allCustomRoots: string[],
): Map<string, string[]> {
    const tailsByRoot = new Map<string, string[]>()
    const seenClassNames = new Set<string>()

    for (const [className] of project.getClassList()) {
        if (seenClassNames.has(className)) {
            continue
        }
        seenClassNames.add(className)

        let owningRoot: string | null = null
        for (const root of allCustomRoots) {
            if (
                className.startsWith(`${root}-`) &&
                (owningRoot === null || root.length > owningRoot.length)
            ) {
                owningRoot = root
            }
        }
        if (owningRoot === null || !functionalRootSet.has(owningRoot)) {
            continue
        }

        let tails = tailsByRoot.get(owningRoot)
        if (!tails) {
            tails = []
            tailsByRoot.set(owningRoot, tails)
        }
        tails.push(className.slice(owningRoot.length + 1))
    }

    return tailsByRoot
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
 * The conditionality check on top of signature equality for aliasing: both classes must set the same properties *unconditionally* on the element itself. Signature equality alone is blind to conditions, and a utility whose only padding sits inside a media query is not an alias of `p-4` — while a utility re-declaring its own property again under a dark-mode guard (shadcn's `border-grid`) still is one, because the guard only re-touches a property both sides already set.
 */
function aliasEquivalent(
    first: DeclarationEntry[] | null,
    second: DeclarationEntry[] | null,
): boolean {
    if (first === null || second === null) {
        return false
    }
    const firstBase = unconditionalBaseKeys(first)
    const secondBase = unconditionalBaseKeys(second)
    return (
        firstBase.size > 0 &&
        firstBase.size === secondBase.size &&
        [...firstBase].every((property) => secondBase.has(property))
    )
}

function unconditionalBaseKeys(declarations: DeclarationEntry[]): Set<string> {
    const keys = new Set<string>()
    for (const entry of declarations) {
        if (entry.context === '' && !entry.conditional) {
            keys.add(entry.property)
        }
    }
    return keys
}

/**
 * Whether a class fully covers another, meaning: with the coverer coming later, the covered class has no independent effect left, so removing it loses nothing. Each declaration of the target must be accounted for — an unconditional element-level real property by an equal or shorthand property of the coverer, an unconditional element-level custom property (a state carrier like `--hit-area-l`) by the coverer re-declaring the same one, and everything conditional or targeting another element (shared `::before` scaffolding) only by a byte-identical declaration in the coverer. Anything unaccounted for means partial overlap, and partial overlap never justifies removal — the same rule the default config applies between `px` and `p`.
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
                entry.context === targetEntry.context &&
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
    customGroups: Map<string, PlanValue[]>,
    groupSignatures: GroupSignatures,
): Map<string, string[]> {
    const customDeclarations = new Map<string, DeclarationEntry[] | null>()
    for (const [groupId] of customGroups) {
        const exemplar = customGroupExemplar(project, groupId)
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

/** The class name representing a custom group's declaration shape: the group's static root, or any one suggested value of a functional root — all values of a functional utility set the same properties. A functional group whose root also has a separated static form is represented by a functional value, not the bare root. */
function customGroupExemplar(project: DesignSystemAccess, groupId: string): string | null {
    const root = groupId.replace(/^utility\./, '').replace(/\.static$/, '')
    if (groupId.endsWith('.static')) {
        return root
    }
    if (project.utilities.keys('functional').includes(root)) {
        return functionalRootExemplar(project, root)
    }
    return root
}

/** Any one suggested class of a functional root, taken from the class list. */
function functionalRootExemplar(project: DesignSystemAccess, root: string): string | null {
    for (const [className] of project.getClassList()) {
        if (className.startsWith(`${root}-`)) {
            return className
        }
    }
    return null
}
