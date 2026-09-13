export interface TailwindMergeOptions {
    /** Path to the project's Tailwind CSS entrypoint, relative to the project directory. When omitted, the entrypoint is auto-detected within the project. Set this to disambiguate themes or select an entrypoint outside the discovery scan. */
    css?: string
    /** LRU cache size of the generated `twMerge`, passed through to the generated config. Defaults to tailwind-merge's default. */
    cacheSize?: number
    /** How theme scales are encoded in the generated config: `'compact'` (default) picks the smallest matcher even when it accepts names beyond the theme, `'exact'` enumerates finite names to avoid that overmatching, at a size cost; arbitrary-value types remain approximate. See the configurator's docs for the tradeoff. */
    encoding?: 'compact' | 'exact'
    /**
     * Prunes the generated config to the classes found in your sources — the same files Tailwind scans, found the same way — so production bundles ship only the class groups and scale values the project uses. Lists composed of scanned candidates merge exactly like with the full generated config; retained validators may also match unscanned names.
     *
     * `true` (the default): prune in `next build`, serve the full config in `next dev`. `false`: never prune — for projects whose class names reach `twMerge` from outside the scanned sources *and* get their styles from somewhere else than this Tailwind build (server-delivered markup, module federation). The object form configures the details.
     */
    prune?: boolean | PruneOptions
}

export interface PruneOptions {
    /** Prune production builds. Defaults to `true`. */
    build?: boolean
    /** Also prune in the dev server, for debugging differences between dev and build: every source edit that changes the used classes then regenerates the module. Defaults to `false`. */
    dev?: boolean
    /** Log one line per generation saying what pruning did. Defaults to `true`. */
    log?: boolean
}

/**
 * What the loader receives from the plugin through the bundler configuration. Plain data on purpose — Turbopack serializes loader options for its Rust side, so nothing here may be a function, a class instance, or `undefined` (absent keys are simply left out, see `serializableLoaderOptions`). The plugin resolves the user's options against the mode once so the loader never has to know the option surface.
 */
export type LoaderOptions = {
    /** `dev` for the dev server, `build` for `next build`: decides pruning and whether a generation failure fails the compilation (build) or falls back to the last good module (dev). */
    mode: 'dev' | 'build'
    prune: boolean
    log: boolean
    css?: string
    cacheSize?: number
    encoding?: 'compact' | 'exact'
}

/** Resolves the `prune` option's shorthand forms and defaults into the full object. */
export function resolvePruneOptions(option: TailwindMergeOptions['prune']): Required<PruneOptions> {
    if (option === false) {
        return { build: false, dev: false, log: false }
    }
    if (option === true || option === undefined) {
        return { build: true, dev: false, log: true }
    }
    return { build: option.build ?? true, dev: option.dev ?? false, log: option.log ?? true }
}

/** The loader options for one mode, with only the keys the user set — the loader applies the defaults of the underlying generator for the rest. */
export function resolveLoaderOptions(
    options: TailwindMergeOptions,
    mode: LoaderOptions['mode'],
): LoaderOptions {
    const prune = resolvePruneOptions(options.prune)
    const resolved: LoaderOptions = {
        mode,
        prune: mode === 'build' ? prune.build : prune.dev,
        log: prune.log,
    }
    if (options.css !== undefined) {
        resolved.css = options.css
    }
    if (options.cacheSize !== undefined) {
        resolved.cacheSize = options.cacheSize
    }
    if (options.encoding !== undefined) {
        resolved.encoding = options.encoding
    }
    return resolved
}

/** The same options as a value the bundler configuration types accept: Next's loader option type has no room for `undefined`, which TypeScript reads into every optional key, so the object is rebuilt from its present keys. */
export function serializableLoaderOptions(
    options: LoaderOptions,
): Record<string, string | number | boolean> {
    return Object.fromEntries(
        Object.entries(options).filter(
            (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
        ),
    )
}
