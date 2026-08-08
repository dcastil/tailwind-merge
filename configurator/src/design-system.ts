import { __unstable__loadDesignSystem } from '@tailwindcss/node'

/**
 * The structural slice of Tailwind's design system the configurator relies on. The real object's types hide most of this behind private fields, so the loader narrows to what is actually used; verified against tailwindcss 4.3.x and guarded by tests.
 */
export interface DesignSystemAccess {
    theme: {
        prefix: string | null
        entries(): Iterable<[string, unknown]>
    }
    getClassList(): [string, { modifiers: string[] }][]
    candidatesToCss(classes: string[]): (string | null)[]
}

export interface LoadDesignSystemsOptions {
    css: string
    base: string
}

/**
 * Loads the project's design system alongside a vanilla one resolved from the same base directory (and therefore the same Tailwind installation and version). The vanilla system is the reference for diffing which classes the project's theme created and for classifying them — comparisons are only meaningful when both sides come from the identical compiler.
 */
export async function loadDesignSystems({ css, base }: LoadDesignSystemsOptions): Promise<{
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
}> {
    const [project, vanilla] = await Promise.all([
        __unstable__loadDesignSystem(css, { base }),
        __unstable__loadDesignSystem("@import 'tailwindcss';", { base }),
    ])

    return {
        project: project as unknown as DesignSystemAccess,
        vanilla: vanilla as unknown as DesignSystemAccess,
    }
}

/**
 * Compiles a class through Tailwind and returns its declarations as property → value text, or null when the class produces no CSS. `@property` registrations are stripped first: composable utilities share them without conflicting, so they are noise for conflict semantics. Values matter to the conflict oracle: two classes re-declaring the same property with identical `var()`-composed text (like `border-spacing: var(--tw-border-spacing-x) var(--tw-border-spacing-y)`) carry their state in the custom properties, not the declaration itself.
 */
export function declaredDeclarations(
    designSystem: DesignSystemAccess,
    className: string,
): Map<string, string> | null {
    let cache = declarationsCache.get(designSystem)
    if (!cache) {
        cache = new Map()
        declarationsCache.set(designSystem, cache)
    }

    let declarations = cache.get(className)
    if (declarations === undefined) {
        const css = designSystem.candidatesToCss([className])[0] ?? null
        if (css === null) {
            declarations = null
        } else {
            declarations = new Map()
            const withoutPropertyRules = css.replace(/@property[^{]*\{[^}]*\}/g, '')
            for (const match of withoutPropertyRules.matchAll(
                /^\s*(--[\w-]+|[a-z-]+)\s*:\s*([^;]+);/gim,
            )) {
                declarations.set(match[1]!, match[2]!.trim())
            }
        }
        cache.set(className, declarations)
    }

    return declarations
}

/** The set of declared property names — the signature used for class-group classification, where values don't matter. */
export function declaredProperties(
    designSystem: DesignSystemAccess,
    className: string,
): Set<string> | null {
    const declarations = declaredDeclarations(designSystem, className)
    return declarations === null ? null : new Set(declarations.keys())
}

const declarationsCache = new WeakMap<DesignSystemAccess, Map<string, Map<string, string> | null>>()

/** Proper-subset check over property names, used to recognize classes whose declarations span multiple groups' signatures. */
export function haveProperSubset(subset: Set<string>, superset: Set<string>): boolean {
    return subset.size < superset.size && [...subset].every((property) => superset.has(property))
}

/** Set equality over property names — the strict form of "these classes set the same things". */
export function havePropertiesEqual(first: Set<string>, second: Set<string>): boolean {
    return first.size === second.size && [...first].every((property) => second.has(property))
}
