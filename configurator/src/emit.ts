import { ConfigPlan, PlanValue } from './plan'

export interface EmitOptions {
    /** Complete comment lines placed at the very top of the module, e.g. provenance info. */
    banner?: string
}

const MAX_LINE_LENGTH = 100
const INDENT = '    '

/**
 * Serializes a plan into the source code of a standalone module exporting `config` and `twMerge`.
 *
 * The module imports only `createTailwindMerge` and `validators` from tailwind-merge, so bundlers tree-shake the default config away. Repeated scale arrays (colors appear in ~50 class groups) are hoisted into shared consts to keep the emitted file and the resulting bundle small; the shared arrays are never mutated by tailwind-merge, which makes sharing safe. Output is deterministic for identical input so a future `--check` mode can diff against the file on disk.
 */
export const emitModule = (plan: ConfigPlan, options: EmitOptions = {}): string => {
    const sharedArrays = collectSharedArrays(plan)
    const lines: string[] = []

    if (options.banner) {
        lines.push(options.banner, '')
    }

    lines.push("import { createTailwindMerge, validators as v, type Config } from 'tailwind-merge'")
    lines.push('')

    for (const { name, items } of sharedArrays.constants) {
        lines.push(`const ${name} = ${serializeArrayBody(items, 0, sharedArrays)}`)
    }
    if (sharedArrays.constants.length > 0) {
        lines.push('')
    }

    lines.push('export const config = {')
    lines.push(`${INDENT}cacheSize: ${plan.cacheSize},`)
    if (plan.prefix !== null) {
        lines.push(`${INDENT}prefix: ${quote(plan.prefix)},`)
    }
    lines.push(`${INDENT}theme: {},`)

    lines.push(`${INDENT}classGroups: {`)
    for (const [classGroupId, items] of plan.classGroups) {
        lines.push(`${INDENT}${INDENT}${propertyKey(classGroupId)}: ${serializeArray(items, 8, sharedArrays)},`)
    }
    lines.push(`${INDENT}},`)

    pushStringRecordMap(lines, 'conflictingClassGroups', plan.conflictingClassGroups)
    pushStringRecordMap(lines, 'conflictingClassGroupModifiers', plan.conflictingClassGroupModifiers)

    lines.push(`${INDENT}postfixLookupClassGroups: ${serializeStringArray(plan.postfixLookupClassGroups)},`)
    lines.push(`${INDENT}orderSensitiveModifiers: ${serializeStringArray(plan.orderSensitiveModifiers)},`)
    lines.push('} satisfies Config<string, never>')
    lines.push('')
    lines.push('export const twMerge = createTailwindMerge(() => config)')
    lines.push('')

    return lines.join('\n')
}

interface SharedArrays {
    /** Canonical form → const name, for arrays that are emitted as shared consts. */
    names: Map<string, string>
    /** Consts in dependency-safe order: collected post-order, so an array nested inside another shared array is defined first. */
    constants: { name: string; items: PlanValue[] }[]
}

/**
 * Finds arrays worth hoisting into shared consts: any array (class group or nested object entry) whose canonical form occurs more than once and is long enough that a reference is cheaper than repetition.
 */
const collectSharedArrays = (plan: ConfigPlan): SharedArrays => {
    const occurrences = new Map<string, { count: number; items: PlanValue[] }>()
    const postOrderKeys: string[] = []

    const visitArray = (items: PlanValue[]) => {
        for (const item of items) {
            if (item.kind === 'object') {
                for (const [, entryItems] of item.entries) {
                    visitArray(entryItems)
                }
            }
        }

        const key = canonicalArray(items)
        const existing = occurrences.get(key)
        if (existing) {
            existing.count += 1
        } else {
            occurrences.set(key, { count: 1, items })
            postOrderKeys.push(key)
        }
    }

    for (const [, items] of plan.classGroups) {
        visitArray(items)
    }

    const shared: SharedArrays = { names: new Map(), constants: [] }

    for (const key of postOrderKeys) {
        const { count, items } = occurrences.get(key)!
        if (count >= 2 && key.length >= 30) {
            const name = `scale${shared.constants.length}`
            shared.names.set(key, name)
            shared.constants.push({ name, items })
        }
    }

    return shared
}

const serializeArray = (items: PlanValue[], indent: number, shared: SharedArrays): string => {
    const sharedName = shared.names.get(canonicalArray(items))
    if (sharedName) {
        return sharedName
    }
    return serializeArrayBody(items, indent, shared)
}

/**
 * Serializes an array without the shared-const lookup for the array itself, used both for inline arrays and for the right-hand side of shared const declarations (which must not reference themselves). Nested arrays still use shared consts, which is safe because consts are emitted in post-order.
 */
const serializeArrayBody = (items: PlanValue[], indent: number, shared: SharedArrays): string => {
    const parts = items.map((item) => serializeValue(item, indent + 4, shared))
    const inline = `[${parts.join(', ')}]`

    if (indent + inline.length <= MAX_LINE_LENGTH && !inline.includes('\n')) {
        return inline
    }

    const itemIndent = INDENT.repeat(indent / 4 + 1)
    const closingIndent = INDENT.repeat(indent / 4)
    return `[\n${parts.map((part) => `${itemIndent}${part},`).join('\n')}\n${closingIndent}]`
}

const serializeValue = (value: PlanValue, indent: number, shared: SharedArrays): string => {
    if (value.kind === 'class') {
        return quote(value.value)
    }
    if (value.kind === 'validator') {
        return `v.${value.name}`
    }

    const entryParts = value.entries.map(
        ([key, items]) => `${propertyKey(key)}: ${serializeArray(items, indent + 4, shared)}`,
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
 * Canonical string form of an array used as identity for shared-const detection: fully inlined, ignoring shared consts and line breaks, so identical content always produces identical keys. Cached by array identity since plans reuse array instances for repeated scales.
 */
const canonicalArray = (items: PlanValue[]): string => {
    let canonical = canonicalCache.get(items)
    if (!canonical) {
        canonical = `[${items.map(canonicalValue).join(', ')}]`
        canonicalCache.set(items, canonical)
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
    return `{ ${value.entries
        .map(([key, items]) => `${propertyKey(key)}: ${canonicalArray(items)}`)
        .join(', ')} }`
}

const canonicalCache = new WeakMap<PlanValue[], string>()

const pushStringRecordMap = (lines: string[], property: string, map: Map<string, string[]>) => {
    lines.push(`${INDENT}${property}: {`)
    for (const [key, values] of map) {
        lines.push(`${INDENT}${INDENT}${propertyKey(key)}: ${serializeStringArray(values)},`)
    }
    lines.push(`${INDENT}},`)
}

const serializeStringArray = (values: readonly string[]): string =>
    `[${values.map(quote).join(', ')}]`

const propertyKey = (key: string): string =>
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key)

const quote = (value: string): string => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
