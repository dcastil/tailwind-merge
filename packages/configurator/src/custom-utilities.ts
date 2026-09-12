import { validators } from 'tailwind-merge'

import { type EncodingMode, encodeScale } from './compress.ts'
import { segment } from './css-statements.ts'
import {
    type DeclarationEntry,
    type DesignSystemAccess,
    classesCompile,
    declaredDeclarations,
    declaredProperties,
    sameDeclarationScope,
} from './design-system.ts'
import { type PlanValue, type ValidatorName } from './plan.ts'
import { propertyCovers } from './property-coverage.ts'

export interface CustomUtilityPlan {
    /** Self-conflict groups to register (group ID → items), for utilities that are not aliases of a built-in group. */
    groups: Map<string, PlanValue[]>
    /** Static utility classes that turned out to be aliases of a built-in group — their compiled declarations match that group's signature exactly, so they join it and get its full conflict behavior (class name → group ID). */
    aliases: Map<string, string>
    /** Inferred override relationships: group ID → built-in and custom group IDs whose declarations the utility fully covers, meaning the utility coming later in a class list makes the earlier class irrelevant. */
    conflicts: Map<string, string[]>
    /** Mixed functional groups need a complete lookup before treating a slash as a modifier of the base group. */
    postfixLookupClassGroups: string[]
    /** Suggested classes at normalized lookup keys deliberately left unclassified because runtime lookup cannot safely distinguish their effects. Augmentation must preserve this decision. */
    preservedClasses: Set<string>
    /** Built-in functional roots the project registers an additional `@utility` for (`@utility text-*`). The extension is not planned, since a registry diff cannot judge how it changes the built-in's behavior: its values are classified only as far as the built-in matchers accept them, and the root is reported. */
    extendedBuiltInRoots: string[]
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
 * Functional roots whose slash modifiers change effects without a matching full-class group remain unclassified: the runtime's fallback from an unknown full class to its base group would otherwise discard those effects.
 *
 * Roots that already exist as built-ins are skipped entirely: shadowing changes built-in behavior in ways a registry diff cannot judge. Such roots are reported so the gap is visible instead of silent.
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
    // Each `@utility` registration adds a suggestion branch, so a built-in root with more branches than vanilla was extended by the project.
    const extendedBuiltInRoots = project.utilities
        .keys('functional')
        .filter(
            (root) =>
                vanillaRoots.has(root) &&
                project.utilities.getCompletions(root).length >
                    vanilla.utilities.getCompletions(root).length,
        )
    const staticRoots = project.utilities.keys('static').filter((root) => !vanillaRoots.has(root))
    const staticRootSet = new Set(staticRoots)
    const lookupRoots = [
        ...project.utilities.keys('static'),
        ...project.utilities.keys('functional'),
    ].map((root) => (root.startsWith('-') ? root.slice(1) : root))
    const functionalClasses = collectFunctionalClasses(project, functionalRoots)
    const functionalShapes = new Map(
        [...functionalClasses].map(([root, classNames]) => [
            root,
            groupFunctionalClasses(project, root, classNames),
        ]),
    )
    const preservedClasses = reconcileNegativeRoots(project, functionalShapes, staticRoots)
    const functionalExemplars = new Map(
        [...functionalShapes].map(([root, shapes]) => [root, shapes?.[0]?.exemplar ?? null]),
    )

    const groupSignatures = collectGroupSignatures(vanilla, vanillaClassGroupId)

    const groups = new Map<string, CustomUtilityGroup>()
    const aliases = new Map<string, string>()
    const postfixLookupClassGroups: string[] = []

    for (const root of staticRoots) {
        // Runtime lookup strips a leading minus before walking the class map, so a static utility registers under its unsigned name: a literal `-solo` would sit on a trie path no lookup visits. Opposite signs with incompatible effects were preserved above and skip this loop.
        const lookupRoot = root.startsWith('-') ? root.slice(1) : root
        if (preservedClasses.has(lookupRoot)) {
            continue
        }
        // A static root sharing its name with a functional custom root joins the functional group only when the two provably have the same effect (they cover each other, like a `shimmer` default alongside `shimmer-*` values) — splitting those would stop them from merging. When the functional form carries state the bare form doesn't (supabase's `hit-area` scaffold vs `hit-area-*` offsets), they stay separate groups and override inference below adds the correct one-directional relationship instead.
        if (functionalClasses.has(root)) {
            const functionalExemplar = functionalExemplars.get(root) ?? null
            if (
                functionalExemplar !== null &&
                functionalShapes.get(root)?.length === 1 &&
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
            groups.set(`${customUtilityGroupId(lookupRoot)}.static`, {
                items: [{ kind: 'class', value: lookupRoot }],
                exemplar: root,
            })
            continue
        }

        const aliasGroupId = findAliasGroup(project, root, groupSignatures)
        if (aliasGroupId !== null) {
            aliases.set(lookupRoot, aliasGroupId)
        } else {
            groups.set(customUtilityGroupId(lookupRoot), {
                items: [{ kind: 'class', value: lookupRoot }],
                exemplar: root,
            })
        }
    }

    for (const root of functionalRoots) {
        const lookupRoot = root.startsWith('-') ? root.slice(1) : root
        const groupId = customUtilityGroupId(lookupRoot)
        const shapes = functionalShapes.get(root)
        if (!shapes) {
            for (const className of functionalClasses.get(root)!) {
                preservedClasses.add(className.startsWith('-') ? className.slice(1) : className)
            }
            continue
        }
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
                        items: [{ kind: 'object', entries: [[lookupRoot, valueItems]] }],
                        exemplar: shape.exemplar,
                    })
                    postfixLookupClassGroups.push(shapeGroupId)
                }
            }
            continue
        }
        const items: PlanValue[] = []
        if (
            staticRootSet.has(root) &&
            !preservedClasses.has(lookupRoot) &&
            !groups.has(`${groupId}.static`)
        ) {
            items.push({ kind: 'class', value: lookupRoot })
        } else if (!staticRootSet.has(root) && bareValueJoinsRoot(project, root, shapes[0]!)) {
            // A plugin's `DEFAULT` value: Tailwind suggests and compiles the bare `tint` but registers no static root for it, so it has no other way into the group. It joins only when it provably has the same effect as the root's values.
            items.push({ kind: 'class', value: lookupRoot })
        }
        // A failed descendant lookup retries ancestor validators. Even a uniform parent must use exact matchers when nested roots exist, or isAny would reclaim child utilities deliberately preserved for incompatible or unrepresentable effects. Normalize both signs just as runtime lookup does.
        const hasDescendantRoot = lookupRoots.some((candidate) =>
            candidate.startsWith(`${lookupRoot}-`),
        )
        const valueItems =
            encoding === 'compact' && !hasDescendantRoot
                ? [{ kind: 'validator', name: 'isAny' } satisfies PlanValue]
                : exactFunctionalValueItems(
                      project,
                      root,
                      functionalClasses
                          .get(root)!
                          .map((className) => className.slice(root.length + 1)),
                  )
        if (valueItems.length > 0) {
            items.push({ kind: 'object', entries: [[lookupRoot, valueItems]] })
        }
        if (items.length > 0) {
            const existing = groups.get(groupId)
            groups.set(groupId, {
                items: [...(existing?.items ?? []), ...items],
                exemplar: existing?.exemplar ?? functionalExemplars.get(root) ?? null,
            })
        }
    }

    return {
        groups: new Map([...groups].map(([groupId, group]) => [groupId, group.items])),
        aliases,
        conflicts: inferOverrideConflicts(project, groups, groupSignatures),
        postfixLookupClassGroups,
        preservedClasses,
        extendedBuiltInRoots,
    }
}

/** Runtime lookup removes a leading minus, so opposite static names, functional roots, and overlapping static/functional names share trie paths. Only compatible effects can share those paths. Preserve conflicting roots and their static claims together, including would-be aliases: either remaining claim could otherwise classify both signs and discard independent styles. */
function reconcileNegativeRoots(
    project: DesignSystemAccess,
    shapesByRoot: Map<string, FunctionalClassGroup[] | null>,
    staticRoots: string[],
): Set<string> {
    const preservedStaticClasses = new Set<string>()
    const staticRootSet = new Set(staticRoots)
    for (const root of staticRoots) {
        if (!root.startsWith('-') || !staticRootSet.has(root.slice(1))) {
            continue
        }
        const negative = declaredDeclarations(project, root)
        const positive = declaredDeclarations(project, root.slice(1))
        if (!fullyCovers(negative, positive) || !fullyCovers(positive, negative)) {
            preservedStaticClasses.add(root.slice(1))
        }
    }
    for (const [root, shapes] of shapesByRoot) {
        if (!root.startsWith('-')) {
            continue
        }
        const positiveRoot = root.slice(1)
        const positiveShapes = shapesByRoot.get(positiveRoot)
        let compatible = shapes !== null
        if (positiveShapes !== undefined) {
            if (shapes?.length === 1 && positiveShapes?.length === 1) {
                const negative = declaredDeclarations(project, shapes[0]!.exemplar)
                const positive = declaredDeclarations(project, positiveShapes[0]!.exemplar)
                compatible &&= fullyCovers(negative, positive) && fullyCovers(positive, negative)
            } else {
                compatible = false
            }
        }

        const staticClaims: string[] = []
        for (const className of staticRoots) {
            if (className !== positiveRoot && !className.startsWith(`${positiveRoot}-`)) {
                continue
            }
            const negative = declaredDeclarations(project, `-${className}`)
            if (!negative?.length) {
                continue
            }
            staticClaims.push(className)
            const positive = declaredDeclarations(project, className)
            compatible &&= fullyCovers(negative, positive) && fullyCovers(positive, negative)
        }
        if (compatible) {
            continue
        }
        shapesByRoot.set(root, null)
        if (shapesByRoot.has(positiveRoot)) {
            shapesByRoot.set(positiveRoot, null)
        }
        for (const className of staticClaims) {
            preservedStaticClasses.add(className)
        }
    }
    return preservedStaticClasses
}

/** Whether a functional root's bare class (a plugin `DEFAULT` value) compiles and covers its shape's exemplar both ways, like a static root that joins its functional group. */
function bareValueJoinsRoot(
    project: DesignSystemAccess,
    root: string,
    shape: FunctionalClassGroup,
): boolean {
    const bare = declaredDeclarations(project, root)
    if (!bare?.length) {
        return false
    }
    const exemplar = declaredDeclarations(project, shape.exemplar)
    return fullyCovers(bare, exemplar) && fullyCovers(exemplar, bare)
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

/** Groups named values and numeric kinds by their compiled effects, ignoring values but preserving rule scope and importance. Probe-only shapes prevent unsafe root-wide matchers without registering probe names. Returns null when postfix effects lack a matching full-class group: the runtime falls back to a recognized base group on a full-lookup miss, so leaving only the postfix unclassified would still discard its independent styles. */
function groupFunctionalClasses(
    project: DesignSystemAccess,
    root: string,
    classNames: string[],
): FunctionalClassGroup[] | null {
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
        const signature = functionalEffectSignature(declarations)
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

    // Numeric/arbitrary-only roots can suggest named modifiers without contributing any class-list entries. Probe those completions independently of the named base candidates.
    const modifiers = new Set([
        ...project.utilities.getCompletions(root).flatMap((suggestion) => suggestion.modifiers),
        ...MODIFIER_PROBES,
    ])
    for (const className of candidates) {
        if (segment(className, '/').length > 1) {
            continue
        }
        const baseGroup = groupsByClassName.get(className)
        for (const modifier of modifiers) {
            const modifiedClass = `${className}/${modifier}`
            const declarations = declaredDeclarations(project, modifiedClass)
            if (!declarations?.length) {
                continue
            }
            const modifiedGroup = groups.get(functionalEffectSignature(declarations))
            if (baseGroup && modifiedGroup === baseGroup) {
                continue
            }
            // Named literals outrank validators, whose registration order matches `result`. Fractions can represent numeric base/modifier pairs, but cannot represent named bases such as `type-sm/2`.
            const tail = modifiedClass.slice(root.length + 1)
            const lookupGroup = namedClasses.has(modifiedClass)
                ? groupsByClassName.get(modifiedClass)
                : result.find((group) => group.validators.some((name) => validators[name](tail)))
            if (!modifiedGroup || lookupGroup !== modifiedGroup) {
                return null
            }
        }
    }
    return result
}

/** Values can vary within a functional group; its affected properties, targets, guards, and importance must remain the same. */
function functionalEffectSignature(declarations: DeclarationEntry[]): string {
    return [
        ...new Set(
            declarations.map((entry) =>
                JSON.stringify([entry.context, entry.scope, entry.property, entry.important]),
            ),
        ),
    ]
        .sort()
        .join('\n')
}

/**
 * Value kinds a functional utility can accept beyond its named values, tested with sentinel candidates: accepting the kind (`--value(number)` compiles every number) permits an open validator. The sentinels use unusual theme-token names, with two per kind to reduce the chance that named tokens impersonate open-ended support.
 */
const BARE_VALUE_PROBES: [ValidatorName, string[]][] = [
    ['isFraction', ['355/113', '19/97']],
    ['isNumber', ['971.5', '823.25']],
    ['isInteger', ['9713', '8231']],
    // Tailwind accepts bare percentages with integer amounts; decimal percentages would silently miss this branch.
    ['isPercent', ['79%', '61%']],
]

/**
 * Representatives covering Tailwind's recognized arbitrary data types for both base values and slash modifiers. Missing a type can make a root with independent branches look uniform, granting an unsafe broad matcher. Some types overlap: lengths also cover position, background size, and line width; URLs cover images; identifiers cover family names.
 */
const ARBITRARY_VALUE_PROBES = [
    '[3px]',
    '[7]',
    '[41%]',
    '[#650a1b]',
    '[twm-probe]',
    '[13/7]',
    '[url(twm-probe.svg)]',
    '[serif]',
    '[medium]',
    '[larger]',
    '[13deg]',
    '[1_2_3]',
]

const ARBITRARY_VARIABLE_PROBE = '(--twm-probe)'

// Tailwind suggests named modifiers, but bare numeric modifiers may have no suggestions at all. Probe them on valid named bases as well as the arbitrary base samples.
const MODIFIER_PROBES = [
    ...BARE_VALUE_PROBES.filter(([name]) => name !== 'isFraction').flatMap(
        ([, sentinels]) => sentinels,
    ),
    ...ARBITRARY_VALUE_PROBES,
    ARBITRARY_VARIABLE_PROBE,
]

const FUNCTIONAL_VALUE_PROBES = [
    ...BARE_VALUE_PROBES.flatMap(([, sentinels]) => sentinels),
    ...ARBITRARY_VALUE_PROBES,
    ARBITRARY_VARIABLE_PROBE,
]

/**
 * The exact-mode value matchers of a functional root whose compiled effects are uniform across suggestions and probes: compile-verified named values (scale-encoded, so families still factor), plus validators for accepted open-ended value kinds. Arbitrary-value matchers still approximate Tailwind's type inference: `isArbitraryValue` can match a wrong type (`ll-[red]` on a `--value([length])` utility), and representative probes do not validate every possible arbitrary value or explicit type label. Mixed-effect roots bypass this helper to avoid assigning different arbitrary branches to one group.
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
