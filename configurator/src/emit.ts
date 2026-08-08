import { ConfigPlan, PlanValue } from './plan'

export interface EmitOptions {
    /** Complete comment lines placed at the very top of the module, e.g. provenance info. */
    banner?: string
    /**
     * How much repeated content is deduplicated into shared consts, measured on the vanilla theme (minified / gzip / brotli in bytes):
     * - 'scales' (default): only resolved theme scales become shared consts, everything else stays inline (31,989 / 8,822 / 7,706). Best compressed size, which is what network transfer pays — compressors handle inline repetition nearly for free, while extra references add entropy.
     * - 'aggressive': additionally hoists every repeated array/object that pays for itself and spreads mined runs (28,492 / 9,364 / 8,197). Best minified-uncompressed size, at the cost of compressed size.
     * - 'none': fully inline (47,289 / 9,055 / 7,767). Only useful as a measurement baseline.
     */
    sharing?: 'scales' | 'aggressive' | 'none'
}

/**
 * Serializes a plan into the source code of a standalone module exporting `getConfig` and `twMerge`.
 *
 * The whole config is built inside `getConfig` so that nothing is allocated at module evaluation — `createTailwindMerge` invokes the callback on the first `twMerge` call, preserving the library's lazy-init behavior. The module imports only `createTailwindMerge` and `validators` from tailwind-merge, so bundlers tree-shake the default config away.
 *
 * Two measured insights shape the output. Validators are destructured once and referenced as bare identifiers because property accesses like `v.isArbitraryVariable` survive minification while local bindings get mangled. And sharing is applied selectively (see EmitOptions.sharing): deduplicating repetition into consts shrinks the minified size but *grows* the compressed size, since references add entropy where gzip/brotli handled the repetition nearly for free — so the default shares only theme scales, emitted as references or spreads (e.g. `['none', ...scale7]`). Sharing array identity across class groups is safe because tailwind-merge never mutates config arrays. Output is deterministic for identical input so a future `--check` mode can diff against the file on disk.
 */
export const emitModule = (plan: ConfigPlan, options: EmitOptions = {}): string => {
    const candidates = collectConstantCandidates(plan, options.sharing ?? 'scales')

    // First pass with every candidate available determines which consts are actually referenced (directly from the config or transitively from other used consts). The second pass re-serializes with final sequential names for just the used ones, so decisions are identical and numbering has no gaps.
    const firstPass = serializeAll(plan, candidates, provisionalNames(candidates))
    const usedCanonicals = resolveTransitiveUsage(candidates, firstPass)
    const finalNames = assignNames(candidates, usedCanonicals)
    const secondPass = serializeAll(plan, candidates, finalNames)
    const { configBody, constantBodies } = secondPass

    const lines: string[] = []

    if (options.banner) {
        lines.push(options.banner, '')
    }

    lines.push("import { createTailwindMerge, validators as v, type Config } from 'tailwind-merge'")
    lines.push('')
    lines.push('/**')
    lines.push(
        ' * Builds the tailwind-merge config for this project. Called lazily on the first `twMerge` call. Can be composed further via `createTailwindMerge(getConfig, ...extensions)`.',
    )
    lines.push(' *')
    lines.push(
        " * The structure mirrors tailwind-merge's default config. The `scale*` consts hold this project's resolved theme scales — each one's comment says which theme namespace it came from — and class groups use them by reference or as spreads. Patterns like `isTshirtSize` come from tailwind-merge's public validators.",
    )
    lines.push(' */')
    lines.push('export const getConfig = () => {')

    // Validators are referenced as bare identifiers instead of `v.name` property accesses: property names survive minification while local bindings get mangled to single characters, and validator references are among the most repeated tokens in the config.
    const usedValidators = collectUsedValidatorNames(plan)
    if (usedValidators.length > 0) {
        const inline = `${INDENT}const { ${usedValidators.join(', ')} } = v`
        if (inline.length <= MAX_LINE_LENGTH) {
            lines.push(inline)
        } else {
            lines.push(`${INDENT}const {`)
            lines.push(...usedValidators.map((name) => `${INDENT}${INDENT}${name},`))
            lines.push(`${INDENT}} = v`)
        }
        lines.push('')
    }

    for (const [canonical, body] of sortByDependencies(secondPass, finalNames)) {
        const comment = candidates.get(canonical)?.comment
        if (comment) {
            lines.push(`${INDENT}/** ${comment} */`)
        }
        lines.push(`${INDENT}const ${finalNames.get(canonical)} = ${body}`)
    }
    if (constantBodies.size > 0) {
        lines.push('')
    }

    lines.push(...configBody)
    lines.push('}')
    lines.push('')
    lines.push('export const twMerge = createTailwindMerge(getConfig)')
    lines.push('')

    return lines.join('\n')
}

const MAX_LINE_LENGTH = 100
const INDENT = '    '
/** Assumed length of a const reference when estimating whether hoisting or spreading saves bytes. */
const NAME_LENGTH = 7

/** Validator names in first-use order, for the destructuring statement at the top of `getConfig`. */
const collectUsedValidatorNames = (plan: ConfigPlan): string[] => {
    const names = new Set<string>()

    const visitItems = (items: PlanValue[]) => {
        for (const item of items) {
            if (item.kind === 'validator') {
                names.add(item.name)
            } else if (item.kind === 'object') {
                for (const [, entryItems] of item.entries) {
                    visitItems(entryItems)
                }
            }
        }
    }

    for (const [, items] of plan.classGroups) {
        visitItems(items)
    }

    return [...names]
}

interface ConstantCandidate {
    kind: 'array' | 'object'
    node: PlanValue[] | Extract<PlanValue, { kind: 'object' }>
    /** Item-wise canonical forms for arrays, used for run matching. */
    itemCanonicals: string[] | null
    /** Semantic const name, set for theme scales (e.g. `scaleColor`). Falls back to positional naming when absent or already taken. */
    preferredName: string | null
    /** JSDoc text emitted above the const declaration. Stripped by minifiers, so it costs nothing in production bundles. */
    comment: string | null
}

type CandidateMap = Map<string, ConstantCandidate>

interface SerializedOutput {
    configBody: string[]
    constantBodies: Map<string, string>
    /** Canonicals referenced from the config body itself. */
    directUsage: Set<string>
    /** Canonicals referenced from within each candidate's body. */
    usageByConstant: Map<string, Set<string>>
}

/**
 * Gathers what becomes a shared const under the chosen sharing strategy: the resolved theme scales (group arrays contain them as contiguous runs), and under 'aggressive' additionally every repeated array/object whose size outweighs a reference plus frequent runs mined from the group arrays (e.g. the spacing tail repeated across margin/padding/sizing scales).
 */
const collectConstantCandidates = (
    plan: ConfigPlan,
    sharing: NonNullable<EmitOptions['sharing']>,
): CandidateMap => {
    const candidates: CandidateMap = new Map()

    if (sharing === 'none') {
        return candidates
    }

    const addArrayCandidate = (
        canonical: string,
        items: PlanValue[],
        preferredName: string | null = null,
        comment: string | null = null,
    ) => {
        const existing = candidates.get(canonical)
        if (!existing) {
            candidates.set(canonical, {
                kind: 'array',
                node: items,
                itemCanonicals: items.map(canonicalValue),
                preferredName,
                comment,
            })
        } else if (existing.preferredName === null) {
            existing.preferredName = preferredName
            existing.comment = comment
        } else if (comment !== null) {
            // Two theme scales resolved to identical content and share one const; the comment must mention both origins.
            existing.comment = `${existing.comment ?? ''} ${comment}`.trim()
        }
    }

    if (sharing === 'aggressive') {
        const arrayStats = new Map<string, { count: number; items: PlanValue[] }>()
        const objectStats = new Map<
            string,
            { count: number; node: Extract<PlanValue, { kind: 'object' }> }
        >()
        const runStats = new Map<string, { count: number; items: PlanValue[] }>()
        const collectionOrder: string[] = []

        const visitArray = (items: PlanValue[]) => {
            for (const item of items) {
                if (item.kind === 'object') {
                    for (const [, entryItems] of item.entries) {
                        visitArray(entryItems)
                    }
                    const canonical = canonicalValue(item)
                    const stats = objectStats.get(canonical)
                    if (stats) {
                        stats.count += 1
                    } else {
                        objectStats.set(canonical, { count: 1, node: item })
                        collectionOrder.push(canonical)
                    }
                }
            }

            const canonical = canonicalArray(items)
            const stats = arrayStats.get(canonical)
            if (stats) {
                stats.count += 1
            } else {
                arrayStats.set(canonical, { count: 1, items })
                collectionOrder.push(canonical)
            }

            // Mine contiguous runs so recurring scale fragments compress into spreads even when no full array repeats. Window sizes are capped: longer runs than this don't occur repeatedly in practice.
            for (let size = 3; size <= Math.min(8, items.length - 1); size++) {
                for (let start = 0; start + size <= items.length; start++) {
                    const run = items.slice(start, start + size)
                    const runCanonical = canonicalArray(run)
                    const runEntry = runStats.get(runCanonical)
                    if (runEntry) {
                        runEntry.count += 1
                    } else {
                        runStats.set(runCanonical, { count: 1, items: run })
                    }
                }
            }
        }

        for (const [, items] of plan.classGroups) {
            visitArray(items)
        }

        for (const canonical of collectionOrder) {
            const array = arrayStats.get(canonical)
            if (array && hoistingPaysOff(canonical.length, array.count)) {
                addArrayCandidate(canonical, array.items)
                continue
            }
            const object = objectStats.get(canonical)
            if (object && hoistingPaysOff(canonical.length, object.count)) {
                candidates.set(canonical, {
                    kind: 'object',
                    node: object.node,
                    itemCanonicals: null,
                    preferredName: null,
                    comment: null,
                })
            }
        }

        for (const [canonical, run] of runStats) {
            if (!candidates.has(canonical) && spreadingPaysOff(canonical.length, run.count)) {
                addArrayCandidate(canonical, run.items)
            }
        }
    }

    // Theme scales are prime spread targets — group arrays contain them verbatim wherever a theme getter was substituted.
    for (const [themeKey, scale] of plan.scales) {
        if (scale.items.length >= 2) {
            addArrayCandidate(
                canonicalArray(scale.items),
                scale.items,
                scaleConstName(themeKey),
                scale.comment,
            )
        }
    }

    return candidates
}

/** `color` → `scaleColor`, `font-weight` → `scaleFontWeight`. Theme keys are unique, so the derived names are too; the `scale` prefix avoids collisions with destructured validator names. */
const scaleConstName = (themeKey: string): string =>
    `scale${themeKey
        .split('-')
        .map((segment) => `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`)
        .join('')}`

/** Hoisting replaces `count` inline copies with references plus one declaration. */
const hoistingPaysOff = (canonicalLength: number, count: number): boolean =>
    count >= 2 && count * (canonicalLength - NAME_LENGTH) - (canonicalLength + 20) > 0

/** Spreads pay a `...` on top of the reference at every use site. */
const spreadingPaysOff = (canonicalLength: number, count: number): boolean =>
    count >= 3 && count * (canonicalLength - NAME_LENGTH - 4) - (canonicalLength + 20) > 0

const provisionalNames = (candidates: CandidateMap): Map<string, string> =>
    new Map([...candidates.keys()].map((canonical, index) => [canonical, `scale${index}`]))

/** Names the used consts: theme scales get their semantic name (`scaleColor`), everything else positional numbering. Numeric names cannot collide with semantic ones, so uniqueness only needs the taken-set check. */
const assignNames = (candidates: CandidateMap, usedCanonicals: Set<string>): Map<string, string> => {
    const names = new Map<string, string>()
    const takenNames = new Set<string>()
    let positionalIndex = 0

    for (const [canonical, candidate] of candidates) {
        if (!usedCanonicals.has(canonical)) {
            continue
        }
        const name =
            candidate.preferredName !== null && !takenNames.has(candidate.preferredName)
                ? candidate.preferredName
                : `scale${positionalIndex++}`
        takenNames.add(name)
        names.set(canonical, name)
    }

    return names
}

/**
 * Serializes the config body and every candidate's body with the given name map, recording which candidates each output references so usage can be resolved before final naming.
 */
const serializeAll = (
    plan: ConfigPlan,
    candidates: CandidateMap,
    names: Map<string, string>,
): SerializedOutput => {
    const directUsage = new Set<string>()
    const usageByConstant = new Map<string, Set<string>>()

    const constantBodies = new Map<string, string>()
    for (const [canonical, candidate] of candidates) {
        const usage = new Set<string>()
        constantBodies.set(
            canonical,
            candidate.kind === 'array'
                ? serializeArrayBody(candidate.node as PlanValue[], 4, {
                      candidates,
                      names,
                      usage,
                      selfCanonical: canonical,
                  })
                : serializeObjectBody(candidate.node as Extract<PlanValue, { kind: 'object' }>, 4, {
                      candidates,
                      names,
                      usage,
                      selfCanonical: canonical,
                  }),
        )
        usageByConstant.set(canonical, usage)
    }

    const context: SerializeContext = {
        candidates,
        names,
        usage: directUsage,
        selfCanonical: null,
    }

    const configBody: string[] = []
    configBody.push(`${INDENT}return {`)
    configBody.push(`${INDENT}${INDENT}cacheSize: ${plan.cacheSize},`)
    if (plan.prefix !== null) {
        configBody.push(`${INDENT}${INDENT}prefix: ${quote(plan.prefix)},`)
    }
    configBody.push(`${INDENT}${INDENT}theme: {},`)

    configBody.push(`${INDENT}${INDENT}classGroups: {`)
    for (const [classGroupId, items] of plan.classGroups) {
        configBody.push(
            `${INDENT.repeat(3)}${propertyKey(classGroupId)}: ${serializeArray(items, 12, context)},`,
        )
    }
    configBody.push(`${INDENT}${INDENT}},`)

    pushStringRecordMap(configBody, 'conflictingClassGroups', plan.conflictingClassGroups)
    pushStringRecordMap(
        configBody,
        'conflictingClassGroupModifiers',
        plan.conflictingClassGroupModifiers,
    )

    configBody.push(
        `${INDENT}${INDENT}postfixLookupClassGroups: ${serializeStringArray(plan.postfixLookupClassGroups)},`,
    )
    configBody.push(
        `${INDENT}${INDENT}orderSensitiveModifiers: ${serializeStringArray(plan.orderSensitiveModifiers)},`,
    )
    configBody.push(`${INDENT}} satisfies Config<string, never>`)

    return { configBody, constantBodies, directUsage, usageByConstant }
}

/** Usage is transitive: a const referenced only from another used const's body still has to be emitted. */
const resolveTransitiveUsage = (candidates: CandidateMap, output: SerializedOutput): Set<string> => {
    const used = new Set<string>(output.directUsage)
    let changed = true

    while (changed) {
        changed = false
        for (const canonical of used) {
            for (const referenced of output.usageByConstant.get(canonical) ?? []) {
                if (!used.has(referenced)) {
                    used.add(referenced)
                    changed = true
                }
            }
        }
    }

    return used
}

/** Orders consts so that every reference points to an already-declared name, using the exact usage sets recorded during serialization. Containment makes cycles impossible. */
const sortByDependencies = (
    output: SerializedOutput,
    names: Map<string, string>,
): [string, string][] => {
    const remaining = new Map([...output.constantBodies].filter(([canonical]) => names.has(canonical)))
    const declared = new Set<string>()
    const sorted: [string, string][] = []

    while (remaining.size > 0) {
        let progressed = false

        for (const [canonical, body] of remaining) {
            const dependencies = [...(output.usageByConstant.get(canonical) ?? [])].filter(
                (dependency) => names.has(dependency) && dependency !== canonical,
            )
            if (dependencies.every((dependency) => declared.has(dependency))) {
                declared.add(canonical)
                sorted.push([canonical, body])
                remaining.delete(canonical)
                progressed = true
            }
        }

        if (!progressed) {
            throw new Error('Cyclic references between generated consts, this is a bug in emit.ts')
        }
    }

    return sorted
}

interface SerializeContext {
    candidates: CandidateMap
    names: Map<string, string>
    usage: Set<string>
    /** Canonical of the candidate currently being defined, which must not reference itself. */
    selfCanonical: string | null
}

const serializeArray = (items: PlanValue[], indent: number, context: SerializeContext): string => {
    const canonical = canonicalArray(items)
    if (canonical !== context.selfCanonical) {
        const name = context.names.get(canonical)
        if (name) {
            context.usage.add(canonical)
            return name
        }
    }
    return serializeArrayBody(items, indent, context)
}

const serializeArrayBody = (
    items: PlanValue[],
    indent: number,
    context: SerializeContext,
): string => {
    const itemCanonicals = items.map(canonicalValue)
    const parts: string[] = []

    let index = 0
    while (index < items.length) {
        const run = findLongestRun(items, itemCanonicals, index, context)
        if (run) {
            parts.push(`...${run.name}`)
            context.usage.add(run.canonical)
            index += run.length
        } else {
            parts.push(serializeValue(items[index]!, indent + 4, context))
            index += 1
        }
    }

    const inline = `[${parts.join(', ')}]`
    if (indent + inline.length <= MAX_LINE_LENGTH && !inline.includes('\n')) {
        return inline
    }

    const itemIndent = INDENT.repeat(indent / 4 + 1)
    const closingIndent = INDENT.repeat(indent / 4)
    return `[\n${parts.map((part) => `${itemIndent}${part},`).join('\n')}\n${closingIndent}]`
}

/** Finds the longest candidate array matching the items starting at `start`, to be emitted as a spread. Skips the candidate currently being defined and full-array matches (those are handled as plain references). */
const findLongestRun = (
    items: PlanValue[],
    itemCanonicals: string[],
    start: number,
    context: SerializeContext,
): { name: string; canonical: string; length: number } | null => {
    let best: { name: string; canonical: string; length: number } | null = null

    for (const [canonical, candidate] of context.candidates) {
        if (
            candidate.kind !== 'array' ||
            canonical === context.selfCanonical ||
            candidate.itemCanonicals === null
        ) {
            continue
        }
        const length = candidate.itemCanonicals.length
        if (
            length < 2 ||
            (start === 0 && length === items.length) ||
            start + length > items.length ||
            (best && length <= best.length)
        ) {
            continue
        }
        const name = context.names.get(canonical)
        if (!name) {
            continue
        }

        let matches = true
        for (let offset = 0; offset < length; offset++) {
            if (itemCanonicals[start + offset] !== candidate.itemCanonicals[offset]) {
                matches = false
                break
            }
        }
        if (matches) {
            best = { name, canonical, length }
        }
    }

    return best
}

const serializeValue = (value: PlanValue, indent: number, context: SerializeContext): string => {
    if (value.kind === 'class') {
        return quote(value.value)
    }
    if (value.kind === 'validator') {
        return value.name
    }

    const canonical = canonicalValue(value)
    if (canonical !== context.selfCanonical) {
        const name = context.names.get(canonical)
        if (name) {
            context.usage.add(canonical)
            return name
        }
    }
    return serializeObjectBody(value, indent, context)
}

const serializeObjectBody = (
    value: Extract<PlanValue, { kind: 'object' }>,
    indent: number,
    context: SerializeContext,
): string => {
    const entryParts = value.entries.map(
        ([key, items]) => `${propertyKey(key)}: ${serializeArray(items, indent + 4, context)}`,
    )
    const inline = `{ ${entryParts.join(', ')} }`

    if (indent + inline.length <= MAX_LINE_LENGTH && !inline.includes('\n')) {
        return inline
    }

    const entryIndent = INDENT.repeat(indent / 4 + 1)
    const closingIndent = INDENT.repeat(indent / 4)
    return `{\n${entryParts.map((part) => `${entryIndent}${part},`).join('\n')}\n${closingIndent}}`
}

/**
 * Canonical string form used as identity for sharing decisions: fully inlined, ignoring shared consts and line breaks, so identical content always produces identical keys. Cached by node identity since plans reuse instances for repeated scales.
 */
const canonicalArray = (items: PlanValue[]): string => {
    let canonical = canonicalArrayCache.get(items)
    if (!canonical) {
        canonical = `[${items.map(canonicalValue).join(', ')}]`
        canonicalArrayCache.set(items, canonical)
    }
    return canonical
}

const canonicalValue = (value: PlanValue): string => {
    if (value.kind === 'class') {
        return quote(value.value)
    }
    if (value.kind === 'validator') {
        return `v.${value.name}`
    }
    let canonical = canonicalObjectCache.get(value)
    if (!canonical) {
        canonical = `{ ${value.entries
            .map(([key, items]) => `${propertyKey(key)}: ${canonicalArray(items)}`)
            .join(', ')} }`
        canonicalObjectCache.set(value, canonical)
    }
    return canonical
}

const canonicalArrayCache = new WeakMap<PlanValue[], string>()
const canonicalObjectCache = new WeakMap<Extract<PlanValue, { kind: 'object' }>, string>()

const pushStringRecordMap = (lines: string[], property: string, map: Map<string, string[]>) => {
    lines.push(`${INDENT}${INDENT}${property}: {`)
    for (const [key, values] of map) {
        lines.push(`${INDENT.repeat(3)}${propertyKey(key)}: ${serializeStringArray(values)},`)
    }
    lines.push(`${INDENT}${INDENT}},`)
}

const serializeStringArray = (values: readonly string[]): string =>
    `[${values.map(quote).join(', ')}]`

const propertyKey = (key: string): string =>
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key)

const quote = (value: string): string => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
