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
    /** Mixed functional groups need a complete lookup before treating a slash as a modifier of the base group. */
    postfixLookupClassGroups: string[]
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
 * 2. Other utilities receive self-conflict groups, splitting functional values when their compiled effects differ. When a group's declarations fully cover what another group sets (`btn` with `padding` + `border-radius` covers everything `p-4` sets; see `fullyCovers` for the exact rule), an override edge is added so the utility coming later removes the covered class. The reverse direction stays out on purpose: `p-4` after `btn` only overrides part of `btn`, and removing `btn` would lose the rest of its effect — the same partial-override rule the default config applies between `px` and `p`.
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
    const functionalRoots = project.utilities
        .keys('functional')
        .filter((root) => !vanillaRoots.has(root))
    const staticRoots = project.utilities.keys('static').filter((root) => !vanillaRoots.has(root))
    const staticRootSet = new Set(staticRoots)
    const functionalClasses = collectFunctionalClasses(project, functionalRoots)
    const functionalShapes = new Map(
        [...functionalClasses].map(([root, classNames]) => [
            root,
            groupFunctionalClasses(project, root, classNames),
        ]),
    )
    const functionalExemplars = new Map(
        [...functionalClasses].map(([root, classNames]) => [
            root,
            classNames.find((className) => declaredDeclarations(project, className)?.length) ??
                null,
        ]),
    )

    const groupSignatures = collectGroupSignatures(vanilla, vanillaClassGroupId)

    const groups = new Map<string, CustomUtilityGroup>()
    const aliases = new Map<string, string>()
    const postfixLookupClassGroups: string[] = []

    for (const root of staticRoots) {
        // A static root sharing its name with a functional custom root joins the functional group only when the two provably have the same effect (they cover each other, like a `shimmer` default alongside `shimmer-*` values) — splitting those would stop them from merging. When the functional form carries state the bare form doesn't (supabase's `hit-area` scaffold vs `hit-area-*` offsets), they stay separate groups and override inference below adds the correct one-directional relationship instead.
        if (functionalClasses.has(root)) {
            const functionalExemplar = functionalExemplars.get(root) ?? null
            if (
                functionalExemplar !== null &&
                functionalShapes.get(root)!.length === 1 &&
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
        const shapes = functionalShapes.get(root)!
        if (shapes.length > 1) {
            // Unresolved --value() declarations disappear independently. Keep known names and numeric kinds in their own shapes; broad arbitrary matchers cannot distinguish the remaining branches safely.
            for (const [index, shape] of shapes.entries()) {
                const valueItems = encodeScale(
                    shape.classNames.map((className) => className.slice(root.length + 1)),
                    'exact',
                ).items
                valueItems.push(
                    ...shape.validators
                        .filter(
                            (name) =>
                                name !== 'isInteger' || !shape.validators.includes('isNumber'),
                        )
                        .map((name): PlanValue => ({ kind: 'validator', name })),
                )
                if (valueItems.length > 0) {
                    const shapeGroupId = `${groupId}.${index}`
                    groups.set(shapeGroupId, {
                        items: [{ kind: 'object', entries: [[root, valueItems]] }],
                        exemplar: shape.exemplar,
                    })
                    postfixLookupClassGroups.push(shapeGroupId)
                }
            }
            continue
        }
        const items: PlanValue[] = []
        if (staticRootSet.has(root) && !groups.has(`${groupId}.static`)) {
            items.push({ kind: 'class', value: root })
        }
        // Uniform roots keep their open matchers. Compact's `isAny` also accepts nonexistent values; exact mode restricts this to compiled names and accepted value kinds (see `EncodingMode`).
        const valueItems =
            encoding === 'compact'
                ? [{ kind: 'validator', name: 'isAny' } satisfies PlanValue]
                : exactFunctionalValueItems(
                      project,
                      root,
                      functionalClasses
                          .get(root)!
                          .map((className) => className.slice(root.length + 1)),
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
        postfixLookupClassGroups,
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
 * Indexes suggested classes and their slash modifiers once for both encoding and conflict inference. Modifiers can enable independent declarations through --modifier(), so their complete candidates must participate in effect grouping. Bare utility names belong to their own roots; other classes belong to the longest functional root that prefixes them. Using the same ownership rule prevents a nested root such as `demo-child-*` from becoming the exemplar or a named value of `demo-*`.
 */
function collectFunctionalClasses(
    project: DesignSystemAccess,
    functionalRoots: string[],
): Map<string, string[]> {
    const classesByRoot = new Map<string, string[]>(functionalRoots.map((root) => [root, []]))
    if (functionalRoots.length === 0) {
        return classesByRoot
    }
    // Built-ins retain ownership too: flow-root is not a value of flow-*, nor backdrop-blur-sm or the bare functional default backdrop-grayscale of backdrop-*.
    const projectFunctionalRoots = project.utilities.keys('functional')
    const bareRoots = new Set([...project.utilities.keys('static'), ...projectFunctionalRoots])
    const longestRootsFirst = projectFunctionalRoots.sort(
        (first, second) => second.length - first.length,
    )
    const seen = new Set<string>()

    for (const [className, { modifiers }] of project.getClassList()) {
        if (
            bareRoots.has(className) ||
            !functionalRoots.some((root) => className.startsWith(`${root}-`))
        ) {
            continue
        }
        const root = longestRootsFirst.find((candidate) => className.startsWith(`${candidate}-`))
        const classes = root === undefined ? undefined : classesByRoot.get(root)
        if (classes) {
            for (const candidate of [
                className,
                ...modifiers.map((modifier) => `${className}/${modifier}`),
            ]) {
                if (!seen.has(candidate)) {
                    seen.add(candidate)
                    classes.push(candidate)
                }
            }
        }
    }

    return classesByRoot
}

interface FunctionalClassGroup {
    classNames: string[]
    exemplar: string
    validators: ValidatorName[]
}

/** Groups named values and numeric kinds by their compiled effects, ignoring values but preserving rule scope and importance. Probe arbitrary kinds too: a root's suggestions can contain only widths while arbitrary colors take a different branch. Probe-only shapes prevent unsafe root-wide matchers without registering probe names. */
function groupFunctionalClasses(
    project: DesignSystemAccess,
    root: string,
    classNames: string[],
): FunctionalClassGroup[] {
    const groups = new Map<string, FunctionalClassGroup>()
    const groupsByClassName = new Map<string, FunctionalClassGroup>()
    const namedClasses = new Set(classNames)
    const candidates = new Set([
        ...classNames,
        ...FUNCTIONAL_VALUE_PROBES.map((tail) => `${root}-${tail}`),
    ])
    for (const className of candidates) {
        const declarations = declaredDeclarations(project, className)
        if (!declarations?.length) {
            continue
        }
        const signature = [
            ...new Set(
                declarations.map((entry) =>
                    JSON.stringify([entry.context, entry.scope, entry.property, entry.important]),
                ),
            ),
        ]
            .sort()
            .join('\n')
        const group: FunctionalClassGroup = groups.get(signature) ?? {
            classNames: [],
            exemplar: className,
            validators: [],
        }
        if (namedClasses.has(className)) {
            group.classNames.push(className)
        }
        groups.set(signature, group)
        groupsByClassName.set(className, group)
    }
    for (const [validator, sentinels] of BARE_VALUE_PROBES) {
        const group = groupsByClassName.get(`${root}-${sentinels[0]!}`)
        if (
            group &&
            sentinels.every((tail) => groupsByClassName.get(`${root}-${tail}`) === group)
        ) {
            group.validators.push(validator)
        }
    }

    const result = [...groups.values()]
    const integerGroup = result.find((group) => group.validators.includes('isInteger'))
    // isNumber also accepts integers. A separate integer branch must be registered first so unsuggested integers keep the declarations --value(integer) adds; named literals outrank both validators automatically.
    if (integerGroup) {
        result.splice(result.indexOf(integerGroup), 1)
        result.unshift(integerGroup)
    }
    return result
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

const FUNCTIONAL_VALUE_PROBES = [
    ...BARE_VALUE_PROBES.flatMap(([, sentinels]) => sentinels),
    ...ARBITRARY_VALUE_PROBES,
    ARBITRARY_VARIABLE_PROBE,
]

/**
 * The exact-mode value matchers of a functional root whose compiled effects are uniform across suggestions and probes: compile-verified named values (scale-encoded, so families still factor), plus validators for accepted open-ended value kinds. Arbitrary-value matchers still approximate Tailwind's type inference: `isArbitraryValue` can match a wrong type (`ll-[red]` on a `--value([length])` utility), and the probes do not exhaust every possible arbitrary type or spelling. Mixed-effect roots bypass this helper to avoid assigning different arbitrary branches to one group.
 */
function exactFunctionalValueItems(
    project: DesignSystemAccess,
    root: string,
    namedTails: string[],
): PlanValue[] {
    const allTails = [...namedTails, ...FUNCTIONAL_VALUE_PROBES]
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
 * Finds the single built-in group whose classes set exactly what the static utility sets: the signatures (context-qualified property names) must be equal, and utility and group exemplar must cover each other. Coverage checks conditions and importance, so media-query padding or inline-important padding cannot alias into the normal unconditional `p` group. Zero matches means the utility does its own thing; several matches would make the choice a guess, so both fall back to self-conflict grouping.
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
 * Signature equality alone is blind to conditions and importance. Aliases need an unconditional element-level effect and mutual coverage: a later built-in color must never remove a custom utility's important, hover, or dark-mode color, even when both touch only `color`.
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
 * Every match also needs at least the target declaration's importance: a normal declaration cannot replace an inline-important property or custom-property state, even when the names and values agree.
 */
export function fullyCovers(
    coverer: DeclarationEntry[] | null,
    target: DeclarationEntry[] | null,
): boolean {
    if (coverer === null || target === null || target.length === 0) {
        return false
    }

    return target.every((targetEntry) =>
        coverer.some((entry) => {
            if (targetEntry.important && !entry.important) {
                return false
            }
            if (targetEntry.context === '' && !targetEntry.conditional) {
                if (entry.context !== '' || entry.conditional) {
                    return false
                }
                return targetEntry.property.startsWith('--')
                    ? entry.property === targetEntry.property
                    : !entry.property.startsWith('--') &&
                          propertyCovers(entry.property, targetEntry.property)
            }
            return (
                sameDeclarationScope(entry, targetEntry) &&
                entry.property === targetEntry.property &&
                entry.value === targetEntry.value
            )
        }),
    )
}

/**
 * For every custom group, finds the groups whose exemplar declarations its utility fully covers — whenever the utility comes later in a class list, the covered class is redundant and gets removed. One class stands in for each group: custom functional values are partitioned by their observed effects first, while built-in groups retain the representative-class approximation used in classification.
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
