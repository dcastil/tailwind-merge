import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import {
    type EncodingMode,
    type PruneReport,
    type SourceScanner,
    type TailwindIntegration,
    createSourceScanner,
    generate,
} from '@tailwind-merge/configurator'

/** A generated runtime module ready to serve as the virtual `@tailwind-merge/vite/runtime`. */
export interface GeneratedRuntimeModule {
    /** JavaScript source of the module: the configurator's emitted module (in its `format: 'js'` shape — Vite's own esbuild transform does not reliably process virtual ids, so the served code must parse as-is) plus the runtime appendix. */
    code: string
    /** sha-256 of `code` — the dev loop's change gate: regenerations that produce identical output must not invalidate or reload anything. */
    hash: string
    /** Absolute paths of every file the generation read: the entrypoint, `@import`ed stylesheets, and `@config`/`@plugin` modules. Watching these is what triggers regeneration. */
    dependencies: Set<string>
    /** Modification times of the dependencies as generation read them, so a `vite build --watch` rebuild can tell whether the CSS graph changed without re-reading it. */
    dependencyMtimes: Map<string, number | null>
    /** The entrypoint the module was generated from, kept for regeneration. */
    cssPath: string
    /** Present when the module was pruned to the classes found in the project's sources. */
    pruning?: PruningState
    /** Set when pruning was requested but the sources could not be scanned — the module then holds the full config, and the caller decides how loudly to say so. */
    pruningError?: Error
}

/** What a pruned module was pruned with: the scanner for cheap re-scans, and the scan's fingerprint to tell real usage changes from noise. */
export interface PruningState {
    report: PruneReport
    scanner: SourceScanner
    /** Hash over the sorted class names the scan found — usage changes that matter to the config change this; edits to non-class content don't. */
    classesHash: string
    /** Files the scan read and glob entries it covers, for build-time watching. */
    files: string[]
    globs: { base: string; pattern: string }[]
}

export interface GenerateRuntimeModuleOptions {
    cssPath: string
    root: string
    cacheSize?: number
    encoding?: EncodingMode
    integration?: TailwindIntegration
    /** Prune the config to the classes found in the project's sources. `autoDetectBases` is where Tailwind's automatic source detection starts (the CSS's `source(…)`, when set, wins); `scanner` reuses an existing scanner when only the sources changed, skipping the compile that discovers them. Omit the option for the full config. */
    prune?: { autoDetectBases: string[]; scanner?: SourceScanner }
}

/**
 * Generates the virtual runtime module from the project's Tailwind CSS entrypoint.
 *
 * Always supplies dependency hooks to the configurator's loaders, even without custom resolution. The same load that generates the config therefore discovers its dependencies; a separate compile for watching is unnecessary. Reused scanners contribute their previously discovered dependencies too. Each dependency's modification time is taken when it is reported, as it is read: taken after generation, an edit landing mid-generation would be recorded as the baseline and a watch rebuild would keep the stale module.
 *
 * A failing scan (no oxide binary for the platform, sources Tailwind can't resolve) never fails the generation: the module is generated with the full config and `pruningError` carries the reason — pruning is an optimization, and falling back preserves the full generated config's behavior.
 */
export async function generateRuntimeModule(
    options: GenerateRuntimeModuleOptions,
): Promise<GeneratedRuntimeModule> {
    const dependencies = new Set<string>()
    const dependencyMtimes = new Map<string, Promise<number | null>>()
    const recordDependency = (file: string) => {
        dependencies.add(file)
        if (!dependencyMtimes.has(file)) {
            dependencyMtimes.set(file, readMtime(file))
        }
    }
    recordDependency(options.cssPath)
    const css = await readFile(options.cssPath, 'utf-8')
    const base = path.dirname(options.cssPath)
    const integration: TailwindIntegration = {
        ...options.integration,
        onDependency(file: string) {
            recordDependency(file)
            options.integration?.onDependency?.(file)
        },
    }

    let scanner: SourceScanner | undefined
    let scan: ReturnType<SourceScanner['scan']> | undefined
    let pruningError: Error | undefined
    if (options.prune) {
        try {
            scanner =
                options.prune.scanner ??
                (await createSourceScanner({
                    css,
                    base,
                    autoDetectBases: options.prune.autoDetectBases,
                    integration,
                }))
            scan = scanner.scan()
        } catch (error) {
            pruningError = error instanceof Error ? error : new Error(String(error))
            scanner = undefined
        }
    }

    const result = await generate({
        css,
        base,
        integration,
        cacheSize: options.cacheSize,
        encoding: options.encoding,
        format: 'js',
        importSource: INTERNAL_TAILWIND_MERGE,
        banner: [
            `// Source: ${path.relative(options.root, options.cssPath) || options.cssPath} (served in-memory by @tailwind-merge/vite)`,
            ...(scan ? ['// Pruned to the classes found in the project\'s sources'] : []),
        ].join('\n'),
        prune: scan ? { usedClasses: scan.classes } : undefined,
    })
    for (const file of scanner?.dependencies ?? []) {
        recordDependency(file)
    }

    const code = result.code + RUNTIME_APPENDIX
    return {
        code,
        hash: createHash('sha256').update(code).digest('hex'),
        dependencies,
        dependencyMtimes: new Map(
            await Promise.all(
                [...dependencyMtimes].map(async ([file, mtime]) => [file, await mtime] as const),
            ),
        ),
        cssPath: options.cssPath,
        pruning:
            scanner && scan && result.plan.report.pruning
                ? {
                      report: result.plan.report.pruning,
                      scanner,
                      classesHash: hashClasses(scan.classes),
                      files: scan.files,
                      globs: scan.globs,
                  }
                : undefined,
        pruningError,
    }
}

/** Order-independent fingerprint of a scan's class names. */
export function hashClasses(classes: readonly string[]): string {
    return createHash('sha256').update([...classes].sort().join('\n')).digest('hex')
}

/** Whether any dependency's modification time differs from the recorded one — deleted files count as changed. */
export async function dependenciesChanged(generated: GeneratedRuntimeModule): Promise<boolean> {
    const current = await readMtimes(generated.dependencies)
    for (const [file, mtime] of generated.dependencyMtimes) {
        if (current.get(file) !== mtime) {
            return true
        }
    }
    return false
}

async function readMtimes(files: Iterable<string>): Promise<Map<string, number | null>> {
    const mtimes = new Map<string, number | null>()
    await Promise.all(
        [...files].map(async (file) => {
            mtimes.set(file, await readMtime(file))
        }),
    )
    return mtimes
}

/** A missing file reads as null, which differs from any real modification time. */
function readMtime(file: string): Promise<number | null> {
    return stat(file).then(
        (stats) => stats.mtimeMs,
        () => null,
    )
}

/**
 * Where the virtual module imports tailwind-merge's API from: this package's own re-export (src/tailwind-merge.ts). A virtual module has no filesystem location, so a bare 'tailwind-merge' would resolve from the project root and fail under strict package managers — the plugin package itself is the one specifier guaranteed resolvable from anywhere in the user's project, being their direct dependency.
 */
const INTERNAL_TAILWIND_MERGE = '@tailwind-merge/vite/tailwind-merge'

/**
 * Appended to the configurator's emitted module (which exports `getConfig` and `twMerge` and already imports `createTailwindMerge`) so the virtual module's export surface mirrors runtime.ts. Plain JavaScript on purpose — types live in runtime.ts, which is what TypeScript resolves for the subpath.
 */
const RUNTIME_APPENDIX = `
export { createTailwindMerge, mergeConfigs, twJoin, validators } from '${INTERNAL_TAILWIND_MERGE}'
import { mergeConfigs as mergeConfigsForExtend } from '${INTERNAL_TAILWIND_MERGE}'

// Like tailwind-merge's extendTailwindMerge, but extending this project's generated config instead of the default one.
export const extendTailwindMerge = (configExtension, ...createConfig) =>
    typeof configExtension === 'function'
        ? createTailwindMerge(getConfig, configExtension, ...createConfig)
        : createTailwindMerge(() => mergeConfigsForExtend(getConfig(), configExtension), ...createConfig)
`

/**
 * Served for the virtual module when generation has never succeeded (the CSS is broken from the start, or a `@plugin` package is missing): the same default-config surface as runtime.ts. Once a generation has succeeded, later failures keep serving the last good module instead.
 */
export const FALLBACK_MODULE_CODE = `
export { createTailwindMerge, extendTailwindMerge, getDefaultConfig as getConfig, mergeConfigs, twJoin, twMerge, validators } from '${INTERNAL_TAILWIND_MERGE}'
`
