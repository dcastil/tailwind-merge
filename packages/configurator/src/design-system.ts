import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { type Resolver, __unstable__loadDesignSystem, loadModule } from '@tailwindcss/node'
import type * as TailwindEngine from 'tailwindcss'

import { type DeclarationEntry, parseDeclarations } from './declarations.ts'
import { createModuleResolver, createStylesheetResolver, trackModuleDependencies } from './resolvers.ts'

export type { DeclarationEntry } from './declarations.ts'

/** Bundler-owned resolution shared by design-system loading and source scanning. Either resolver can defer to Tailwind's normal filesystem/package resolution or return an alias-expanded request; the shared resolvers finish extension/package lookup and track missing targets. */
export interface TailwindIntegration {
    resolveCss?: Resolver
    resolveJs?: Resolver
    /** Files read by generation, plus missing resolution targets and their existing parent directories on failure so integrations can observe creation and retry. */
    onDependency?: (file: string) => void
}

/**
 * The structural slice of Tailwind's design system the configurator relies on. The real object's types hide most of this behind private fields, so the loader narrows to what is actually used; verified against tailwindcss 4.3.x and guarded by tests.
 */
export interface DesignSystemAccess {
    theme: {
        prefix: string | null
        entries(): Iterable<[string, unknown]>
    }
    utilities: {
        keys(kind: 'static' | 'functional'): string[]
        /** Suggestions retain their utility branches here; getClassList deduplicates overlapping names and omits modifiers for roots without named base values. */
        getCompletions(root: string): {
            values: (string | null)[]
            modifiers: string[]
            supportsNegative?: boolean
        }[]
    }
    /** Whether `@import 'tailwindcss' important` marks every utility declaration important. */
    important: boolean
    getClassList(): [string, { modifiers: string[] }][]
    /** Variant suggestions and selector templates, including CSS and JavaScript registrations. */
    getVariants(): {
        name: string
        values: string[]
        hasDash: boolean
        selectors(options?: { value?: string }): string[]
    }[]
    candidatesToCss(classes: string[]): (string | null)[]
}

export interface LoadDesignSystemsOptions {
    css: string
    base: string
    integration?: TailwindIntegration
}

/**
 * Loads project and vanilla systems through the same installed compiler and CSS-resolution base. The vanilla system is the reference for diffing and classifying theme-created classes; comparisons are only meaningful with an identical compiler.
 */
export async function loadDesignSystems({
    css,
    base,
    integration,
}: LoadDesignSystemsOptions): Promise<{
    project: DesignSystemAccess
    vanilla: DesignSystemAccess
}> {
    const project = (await loadDesignSystem(css, base, integration)) as unknown as DesignSystemAccess
    // The baseline mirrors the entrypoint's `important` import option: under it every project declaration is important, and the coverage checks that recognize custom utilities as aliases of built-in ones compare importance, so the vanilla exemplars must carry it too. The prefix option needs no mirroring — candidates are prefixed at the compile boundary.
    const vanilla = await loadDesignSystem(
        `@import 'tailwindcss'${project.important ? ' important' : ''};`,
        base,
        integration,
    )

    return {
        project: memoizeClassList(project),
        vanilla: memoizeClassList(vanilla as unknown as DesignSystemAccess),
    }
}

/** The node wrapper currently drops resolver hooks when loading a design system. Use its own Tailwind engine with explicit loaders for bundler integrations, without changing globals or resolving a different compiler from the project. */
async function loadDesignSystem(css: string, base: string, integration?: TailwindIntegration) {
    if (!integration) {
        return __unstable__loadDesignSystem(css, { base })
    }
    const engine = await (tailwindEngine ??= loadModule(
        'tailwindcss',
        path.dirname(fileURLToPath(import.meta.resolve('@tailwindcss/node'))),
        () => {},
    ).then<typeof TailwindEngine>(({ path: file }) => import(pathToFileURL(file).href)))
    const resolveStylesheet = createStylesheetResolver(
        integration.resolveCss,
        integration.onDependency,
        integration.onDependency,
    )
    const resolveModule = createModuleResolver(integration.resolveJs, integration.onDependency)
    return engine.__unstable__loadDesignSystem(css, {
        base,
        async loadStylesheet(id, from) {
            const file = await resolveStylesheet(id, from)
            return { path: file, base: path.dirname(file), content: await readFile(file, 'utf8') }
        },
        async loadModule(id, from) {
            const file = await resolveModule(id, from)
            try {
                // Tailwind only collects transitive dependencies and busts ESM caches for relative module requests. Aliases resolving to local configs/plugins must follow that same path.
                return await loadModule(
                    `./${path.relative(from, file)}`,
                    from,
                    integration.onDependency ?? (() => {}),
                    // Reuse the fresh resolution instead of re-entering Tailwind's cached resolver, which can still consider a newly created module missing.
                    async () => file,
                )
            } catch (error) {
                if (integration.onDependency) {
                    await trackModuleDependencies(file, integration.onDependency)
                }
                throw error
            }
        },
    })
}

let tailwindEngine: Promise<typeof TailwindEngine> | undefined

/**
 * Caches `getClassList()` on a loaded design system. Tailwind rebuilds the list on every call, and the custom-utility, augmentation, and collision passes share it. Repeated rebuilds previously dominated generation time on themes with many custom utilities. A loaded design system never changes, so caching is safe; consumers replace the object for a new theme.
 */
function memoizeClassList(designSystem: DesignSystemAccess): DesignSystemAccess {
    const original = designSystem.getClassList.bind(designSystem)
    let classList: ReturnType<DesignSystemAccess['getClassList']> | undefined
    designSystem.getClassList = () => (classList ??= original())
    return designSystem
}

/**
 * Compiles a class through Tailwind and returns its declarations, or null when the class produces no CSS. Callers pass unprefixed class names (the form `getClassList()` uses everywhere); the candidate is prefixed automatically when the theme defines a prefix, because Tailwind only compiles `tw:p-2`-style candidates there — without this, every declaration-based pass silently saw prefixed themes as producing no CSS. `@property` registrations and `@keyframes` bodies are skipped: composable utilities share the former without conflicting, and the latter describe animation frames, not what the class sets on an element. Values matter to the conflict oracle: two classes re-declaring the same property with identical text are idempotent together and carry their real state elsewhere (usually in custom properties).
 */
export function declaredDeclarations(
    designSystem: DesignSystemAccess,
    className: string,
): DeclarationEntry[] | null {
    let cache = declarationsCache.get(designSystem)
    if (!cache) {
        cache = new Map()
        declarationsCache.set(designSystem, cache)
    }

    let declarations = cache.get(className)
    if (declarations === undefined) {
        const css = designSystem.candidatesToCss([toCandidate(designSystem, className)])[0] ?? null
        declarations = css === null ? null : parseDeclarations(css)
        cache.set(className, declarations)
    }

    return declarations
}

/**
 * The context-qualified property names of a class — the signature used for class-group classification, where values and conditions don't matter but render targets do: `color` on the element and `color` on `::before` are different things to set.
 */
export function declaredProperties(
    designSystem: DesignSystemAccess,
    className: string,
): Set<string> | null {
    const declarations = declaredDeclarations(designSystem, className)
    return declarations === null
        ? null
        : new Set(declarations.map((entry) => qualifiedProperty(entry)))
}

/** Key joining render target and property name, e.g. `'::after border-color'`; base-context entries stay the bare property name. */
export function qualifiedProperty(entry: { context: string; property: string }): string {
    return entry.context === '' ? entry.property : `${entry.context} ${entry.property}`
}

/** Shared scaffolding must apply under the same guards on the same target; equal property/value text alone cannot prove that. Header order is kept conservatively rather than attempting CSS condition equivalence. */
export function sameDeclarationScope(first: DeclarationEntry, second: DeclarationEntry): boolean {
    return (
        first.context === second.context &&
        first.scope.length === second.scope.length &&
        first.scope.every((header, index) => header === second.scope[index])
    )
}

/**
 * Whether each class name compiles to CSS, checked in one `candidatesToCss` batch — the batched boolean form of the prefix-aware compilation `declaredDeclarations` does per class. Use one of the two over raw `candidatesToCss` so the answer holds for prefixed themes.
 */
export function classesCompile(designSystem: DesignSystemAccess, classNames: string[]): boolean[] {
    const candidates = classNames.map((className) => toCandidate(designSystem, className))
    return designSystem.candidatesToCss(candidates).map((compiledCss) => compiledCss !== null)
}

/** The candidate string Tailwind compiles for a class name: prefixed under a theme prefix (`tw:p-2`), the name itself otherwise. Class lists and everything downstream of them stay unprefixed, so the prefix exists only at this compilation boundary. */
function toCandidate(designSystem: DesignSystemAccess, className: string): string {
    const prefix = designSystem.theme.prefix
    return prefix === null ? className : `${prefix}:${className}`
}

const declarationsCache = new WeakMap<DesignSystemAccess, Map<string, DeclarationEntry[] | null>>()

/** Proper-subset check over property names, used to recognize classes whose declarations span multiple groups' signatures. */
export function haveProperSubset(subset: Set<string>, superset: Set<string>): boolean {
    return subset.size < superset.size && [...subset].every((property) => superset.has(property))
}

/** Set equality over property names — the strict form of "these classes set the same things". */
export function havePropertiesEqual(first: Set<string>, second: Set<string>): boolean {
    return first.size === second.size && [...first].every((property) => second.has(property))
}
