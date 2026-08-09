import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { compile } from '@tailwindcss/node'
import { generate } from 'tailwind-merge-configurator'

/** A generated runtime module ready to serve as the virtual `@tailwind-merge/vite/runtime`. */
export interface GeneratedRuntimeModule {
    /** JavaScript source of the module: the configurator's emitted module (in its `format: 'js'` shape — Vite's own esbuild transform does not reliably process virtual ids, so the served code must parse as-is) plus the runtime appendix. */
    code: string
    /** sha-256 of `code` — the dev loop's change gate: regenerations that produce identical output must not invalidate or reload anything. */
    hash: string
    /** Absolute paths of every file the generation read: the entrypoint, `@import`ed stylesheets, and `@config`/`@plugin` modules. Watching these is what triggers regeneration. */
    dependencies: Set<string>
    /** The entrypoint the module was generated from, kept for regeneration. */
    cssPath: string
}

/**
 * Generates the virtual runtime module from the project's Tailwind CSS entrypoint.
 *
 * Alongside the configurator's generation this collects the entrypoint's dependency graph with a second `compile()` pass, because `@tailwindcss/node`'s `__unstable__loadDesignSystem` hides which files it read (it hardcodes a noop `onDependency` into its loaders — see PROPOSAL.md §11.1). The extra compile roughly doubles generation time but keeps the plugin self-contained: watching works in `vite build --watch` and doesn't depend on `@tailwindcss/vite`'s internal bookkeeping.
 */
export async function generateRuntimeModule(options: {
    cssPath: string
    root: string
    cacheSize?: number
}): Promise<GeneratedRuntimeModule> {
    const css = await readFile(options.cssPath, 'utf-8')
    const base = path.dirname(options.cssPath)

    const [result, dependencies] = await Promise.all([
        generate({
            css,
            base,
            cacheSize: options.cacheSize,
            format: 'js',
            banner: `// Source: ${path.relative(options.root, options.cssPath) || options.cssPath} (served in-memory by @tailwind-merge/vite)`,
        }),
        collectCssDependencies(css, base),
    ])
    dependencies.add(options.cssPath)

    const code = result.code + RUNTIME_APPENDIX
    return {
        code,
        hash: createHash('sha256').update(code).digest('hex'),
        dependencies,
        cssPath: options.cssPath,
    }
}

/**
 * Appended to the configurator's emitted module (which exports `getConfig` and `twMerge` and already imports `createTailwindMerge` from tailwind-merge) so the virtual module's export surface mirrors runtime.ts. The `import` specifiers here resolve through the plugin's importer-scoped redirect, so the user's project needs no tailwind-merge dependency of its own. Plain JavaScript on purpose — types live in runtime.ts, which is what TypeScript resolves for the subpath.
 */
const RUNTIME_APPENDIX = `
export { createTailwindMerge, mergeConfigs, twJoin, validators } from 'tailwind-merge'
import { mergeConfigs as mergeConfigsForExtend } from 'tailwind-merge'

// Like tailwind-merge's extendTailwindMerge, but extending this project's generated config instead of the default one.
export const extendTailwindMerge = (configExtension, ...createConfig) =>
    typeof configExtension === 'function'
        ? createTailwindMerge(getConfig, configExtension, ...createConfig)
        : createTailwindMerge(() => mergeConfigsForExtend(getConfig(), configExtension), ...createConfig)
`

/**
 * Served for the virtual module when generation has never succeeded (the CSS is broken from the start, or a `@plugin` package is missing): the same default-config surface as runtime.ts, inlined so its imports go through the plugin's tailwind-merge redirect instead of resolving the subpath again. Once a generation has succeeded, later failures keep serving the last good module instead.
 */
export const FALLBACK_MODULE_CODE = `
export { createTailwindMerge, extendTailwindMerge, getDefaultConfig as getConfig, mergeConfigs, twJoin, twMerge, validators } from 'tailwind-merge'
`

/**
 * Collects the file dependencies of a Tailwind CSS entrypoint via `compile()`'s `onDependency` callback. Best-effort: `compile` validates a few things `loadDesignSystem` doesn't (e.g. that a `source(…)` path exists), so a failure here must not fail a generation that would otherwise succeed — the result is then just the entrypoint itself.
 */
async function collectCssDependencies(css: string, base: string): Promise<Set<string>> {
    const dependencies = new Set<string>()
    try {
        await compile(css, {
            base,
            onDependency: (dependencyPath) => {
                dependencies.add(dependencyPath)
            },
        })
    } catch {
        // Generation reports real problems with the CSS; dependency collection failing only means less precise watching.
    }
    return dependencies
}
