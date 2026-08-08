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
export const loadDesignSystems = async ({
    css,
    base,
}: LoadDesignSystemsOptions): Promise<{ project: DesignSystemAccess; vanilla: DesignSystemAccess }> => {
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
 * Compiles a class through Tailwind and returns the set of CSS properties (custom properties included) it declares, or null when the class produces no CSS. `@property` registrations are stripped first: composable utilities share them without conflicting, so they are noise for conflict semantics. This is the same signature the test oracle uses to decide whether two classes conflict, which is exactly why group classification uses it too.
 */
export const declaredProperties = (
    designSystem: DesignSystemAccess,
    className: string,
): Set<string> | null => {
    let cache = declaredPropertiesCache.get(designSystem)
    if (!cache) {
        cache = new Map()
        declaredPropertiesCache.set(designSystem, cache)
    }

    let properties = cache.get(className)
    if (properties === undefined) {
        const css = designSystem.candidatesToCss([className])[0] ?? null
        if (css === null) {
            properties = null
        } else {
            properties = new Set()
            const declarations = css.replace(/@property[^{]*\{[^}]*\}/g, '')
            for (const match of declarations.matchAll(/^\s*(--[\w-]+|[a-z-]+)\s*:/gim)) {
                properties.add(match[1]!)
            }
        }
        cache.set(className, properties)
    }

    return properties
}

const declaredPropertiesCache = new WeakMap<DesignSystemAccess, Map<string, Set<string> | null>>()

/** Set equality over property names — the strict form of "these classes set the same things". */
export const havePropertiesEqual = (first: Set<string>, second: Set<string>): boolean =>
    first.size === second.size && [...first].every((property) => second.has(property))
