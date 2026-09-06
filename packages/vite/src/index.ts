import path from 'node:path'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

import { discoverCssRoot } from './discovery'
import { autoDetectBases, resolvePruneOptions } from './prune-options'
import { type UpdateTrigger, createUpdateScheduler } from './updates'
import {
    FALLBACK_MODULE_CODE,
    GeneratedRuntimeModule,
    dependenciesChanged,
    generateRuntimeModule,
    hashClasses,
} from './generation'

export interface TailwindMergeOptions {
    /** Path to the project's Tailwind CSS entrypoint, relative to the Vite root. When omitted, the entrypoint is auto-detected by scanning the root for CSS files with Tailwind markers — only ambiguous projects (several independent roots) need to set this. */
    css?: string
    /** LRU cache size of the generated `twMerge`, passed through to the generated config. Defaults to tailwind-merge's default. */
    cacheSize?: number
    /** How theme scales are encoded in the generated config: `'compact'` (default) picks the smallest matcher even when it accepts names beyond the theme, `'exact'` enumerates finite names to avoid that overmatching, at a size cost; arbitrary-value types remain approximate. See the configurator's docs for the tradeoff. */
    encoding?: 'compact' | 'exact'
    /**
     * Prunes the generated config to the classes found in your sources — the same files Tailwind scans, found the same way — so production bundles ship only the class groups and scale values the project uses. Lists composed of scanned candidates merge exactly like with the full generated config; retained validators may also match unscanned names.
     *
     * `true` (the default, except in library mode): prune in `vite build`, serve the full config in dev. `false`: never prune — for projects whose class names reach `twMerge` from outside the scanned sources *and* get their styles from somewhere else than this Tailwind build (server-delivered markup, module federation). The object form configures the details.
     */
    prune?: boolean | PruneOptions
}

export interface PruneOptions {
    /** Prune production builds. Defaults to `true` — except in library mode (`build.lib`), where the consuming app's classes can't be scanned and the default is `false`. */
    build?: boolean
    /** Also prune in the dev server, for debugging differences between dev and build: every source edit that changes the used classes then regenerates and reloads. Defaults to `false`. */
    dev?: boolean
    /** Log one line per generation saying what pruning did. Defaults to `true`. */
    log?: boolean
}

/**
 * What the dev server did in reaction to a file change, reported through `TailwindMergePluginApi.onUpdate` once the plugin has finished processing the change (debounce, regeneration or re-scan, invalidation).
 */
export interface PluginUpdate {
    /** Which kind of file changed: one of the CSS graph (`'config'`), or — with `prune.dev` — any other watched file, which may be a source (`'sources'`). */
    trigger: UpdateTrigger
    /** Whether a new module was generated. False when a sources change left the used classes unchanged, and when generation failed and the previous module stays in service. */
    regenerated: boolean
    /** Whether the served module changed and a full reload was sent. False when regeneration produced identical output — the stability gate. */
    reloaded: boolean
}

/**
 * The plugin's `api` object (Vite's convention for what a plugin exposes to other plugins and tooling). Lets tooling — and this package's own tests — learn when the dev server has finished reacting to an edit instead of guessing with timeouts.
 */
export interface TailwindMergePluginApi {
    /** Subscribes to the dev server's reactions to file changes. Returns the unsubscribe function. */
    onUpdate(listener: (update: PluginUpdate) => void): () => void
}

/**
 * Vite plugin that configures tailwind-merge for the project's own Tailwind CSS.
 *
 * Add it next to `@tailwindcss/vite` and import from the runtime subpath: `import { twMerge } from '@tailwind-merge/vite/runtime'`. While Vite runs, that import resolves to an in-memory module generated from the project's Tailwind theme by @tailwind-merge/configurator; outside Vite it resolves to the real runtime.ts and serves default tailwind-merge behavior. Repository integration goals and invariants live in agents/vite-plugin.md.
 *
 * The dev loop is deliberately quiet: generation reads only the CSS configuration (never which classes the app uses, unless `prune.dev` asks for it), regenerates only when a file of the CSS graph changes, and even then triggers a full reload only when the generated module actually changed — editing utility classes in app.css causes no churn. Production builds additionally prune the config to the classes found in the project's sources (`prune` option).
 */
export default function tailwindMerge(
    options: TailwindMergeOptions = {},
): Plugin & { api: TailwindMergePluginApi } {
    let config: ResolvedConfig
    let devServer: ViteDevServer | undefined
    /** Resolves to the discovered (or configured) CSS entrypoint, null when the project has none; rejects on ambiguity. Resolved before the runtime subpath resolves, so redirect vs. fallback is decided exactly once. */
    let cssRoot: Promise<string | null>
    /** The in-flight or settled generation the virtual module's `load` awaits. */
    let generation: Promise<GeneratedRuntimeModule | null> | undefined
    /** Last successfully generated module — kept as the serving state across failed regenerations. */
    let current: GeneratedRuntimeModule | null = null
    /** Whether this run prunes: the `prune` option resolved against the command (build vs. serve) and library mode. */
    let pruneActive = false
    let pruneLog = true
    let buildStarts = 0
    const updateListeners = new Set<(update: PluginUpdate) => void>()
    let updates: ReturnType<typeof createUpdateScheduler> | undefined

    async function locateCssRoot(): Promise<string | null> {
        if (options.css !== undefined) {
            return path.resolve(config.root, options.css)
        }
        const discovered = await discoverCssRoot(config.root)
        if (discovered === null) {
            config.logger.warn(
                '[@tailwind-merge/vite] No Tailwind CSS root found — serving default tailwind-merge behavior. Set the `css` option if your entrypoint lives outside the Vite root.',
            )
        }
        return discovered
    }

    /** Regenerates the runtime module. Builds propagate generation errors so they cannot ship a default or stale config; dev keeps the last good module and logs the error. `reuseScanner` keeps the previous scan setup when only the sources changed. */
    async function regenerate(
        cssPath: string,
        { reuseScanner = false }: { reuseScanner?: boolean } = {},
    ): Promise<GeneratedRuntimeModule | null> {
        try {
            const generated = await generateRuntimeModule({
                cssPath,
                root: config.root,
                cacheSize: options.cacheSize,
                encoding: options.encoding,
                prune: pruneActive
                    ? {
                          autoDetectBases: autoDetectBases(config),
                          scanner: reuseScanner ? current?.pruning?.scanner : undefined,
                      }
                    : undefined,
            })
            reportPruning(generated)
            current = generated
        } catch (error) {
            if (config.command === 'build') {
                throw error
            }
            config.logger.error(
                `[@tailwind-merge/vite] Generating the tailwind-merge config failed${current ? ' — keeping the previous one' : ''}: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
        return current
    }

    /** One line per generation about pruning, so the behavior and its effect are visible where someone debugging a production-only merge difference would look; a failed scan is always reported, since the module then silently holds the full config. */
    function reportPruning(generated: GeneratedRuntimeModule) {
        if (generated.pruningError) {
            config.logger.warn(
                `[@tailwind-merge/vite] Could not scan your sources, serving the full tailwind-merge config instead: ${generated.pruningError.message}`,
            )
        } else if (generated.pruning && pruneLog) {
            const { classGroupsAfter, classGroupsBefore, classifiedClassCount } =
                generated.pruning.report
            config.logger.info(
                `[@tailwind-merge/vite] Pruned the tailwind-merge config to ${classGroupsAfter} of ${classGroupsBefore} class groups from the ${classifiedClassCount} classes found in your sources`,
                { timestamp: config.command === 'serve' },
            )
        }
    }

    /** Dependencies and source directories outside the Vite root (a monorepo's shared theme or UI package) are invisible to the dev watcher unless added explicitly. */
    function watchOutOfRootPaths(generated: GeneratedRuntimeModule) {
        if (!devServer) {
            return
        }
        const outOfRoot = (filePath: string) => path.relative(config.root, filePath).startsWith('..')
        for (const dependency of generated.dependencies) {
            if (outOfRoot(dependency)) {
                devServer.watcher.add(dependency)
            }
        }
        for (const source of generated.pruning?.scanner.sources ?? []) {
            if (!source.negated && outOfRoot(source.base)) {
                devServer.watcher.add(source.base)
            }
        }
    }

    /** Swaps the served module in after a regeneration that produced a real change: invalidates it in every environment and asks the browser to reload. Returns whether that happened. */
    function reloadIfChanged(
        generated: GeneratedRuntimeModule | null,
        previousHash: string,
    ): boolean {
        if (!generated || !devServer) {
            return false
        }
        watchOutOfRootPaths(generated)
        if (generated.hash === previousHash) {
            // The stability gate: something changed on disk but the generated config didn't (utility edits, comments, formatting, class usage that the config already covers) — nothing to invalidate, no reload.
            return false
        }
        for (const environment of Object.values(devServer.environments)) {
            const module = environment.moduleGraph.getModuleById(VIRTUAL_MODULE_ID)
            if (module) {
                environment.moduleGraph.invalidateModule(module)
            }
        }
        // Full reload instead of HMR propagation: merged class strings are baked into the rendered DOM, so a hot-swapped twMerge cannot fix what is already on screen — the same reasoning as @tailwindcss/vite's full reloads for scanned files.
        try {
            devServer.ws.send({ type: 'full-reload' })
        } catch {
            // HMR can be disabled (tests, middleware mode setups); the module-graph invalidation above is what matters then.
        }
        config.logger.info('[@tailwind-merge/vite] tailwind-merge config changed — reloading', {
            timestamp: true,
        })
        return true
    }

    function notifyUpdate(update: PluginUpdate) {
        for (const listener of updateListeners) {
            listener(update)
        }
    }

    /** Runs both kinds of dev update through one generation/invalidation path; source-only edits may reuse the scanner, while CSS edits always rebuild it. The scheduler keeps this path serial. */
    async function updateAndReload(trigger: UpdateTrigger) {
        const previous = await generation
        if (!previous) {
            return
        }
        if (trigger === 'sources') {
            const pruning = previous.pruning
            if (!pruning) {
                return
            }
            let classesHash: string
            try {
                classesHash = hashClasses(pruning.scanner.scan().classes)
            } catch (error) {
                config.logger.warn(
                    `[@tailwind-merge/vite] Re-scanning your sources failed, keeping the current tailwind-merge config: ${error instanceof Error ? error.message : String(error)}`,
                )
                notifyUpdate({ trigger, regenerated: false, reloaded: false })
                return
            }
            if (classesHash === pruning.classesHash) {
                notifyUpdate({ trigger, regenerated: false, reloaded: false })
                return
            }
        }

        const next = regenerate(previous.cssPath, { reuseScanner: trigger === 'sources' })
        generation = next
        const generated = await next
        notifyUpdate({
            trigger,
            regenerated: generated !== previous,
            reloaded: reloadIfChanged(generated, previous.hash),
        })
    }

    return {
        name: '@tailwind-merge/vite',
        // The runtime subpath is a real, installable package path, so Vite's own resolver can resolve it. Interception must therefore run before the core plugins — without this, vite:resolve wins and the fallback file gets served everywhere.
        enforce: 'pre',

        api: {
            onUpdate(listener) {
                updateListeners.add(listener)
                return () => {
                    updateListeners.delete(listener)
                }
            },
        },

        config: () => ({
            // The dep optimizer must not prebundle the runtime subpath, or dev would freeze the on-disk fallback before resolveId can redirect it.
            optimizeDeps: { exclude: [RUNTIME_SPECIFIER] },
            // SSR must see the redirect too, or server and client would merge classes differently and produce hydration-visible class drift.
            ssr: { noExternal: ['@tailwind-merge/vite'] },
        }),

        async configResolved(resolvedConfig) {
            // Programmatic restarts may reuse this plugin object. Finish the previous run before its mutable generation state is replaced.
            devServer = undefined
            await updates?.dispose()
            await generation?.catch(() => {})
            config = resolvedConfig
            current = null
            buildStarts = 0
            const prune = resolvePruneOptions(options.prune, config)
            pruneActive = config.command === 'build' ? prune.build : prune.dev
            pruneLog = prune.log
            if (prune.libraryDefault && pruneLog) {
                config.logger.info(
                    '[@tailwind-merge/vite] Library build: serving the full tailwind-merge config, since the classes a consuming app passes in cannot be scanned here',
                )
            }

            cssRoot = locateCssRoot()
            generation = cssRoot.then((cssPath) => (cssPath === null ? null : regenerate(cssPath)))
            // Observe eager discovery/generation failures before buildStart or a runtime import awaits them, so they cannot become unhandled rejections.
            generation.catch((error: unknown) =>
                config.logger.error(error instanceof Error ? error.message : String(error)),
            )
        },

        configureServer(server) {
            devServer = server
            updates = createUpdateScheduler(updateAndReload, (error) => {
                config.logger.error(
                    `[@tailwind-merge/vite] Updating the tailwind-merge config failed: ${error instanceof Error ? error.message : String(error)}`,
                )
            })
            void generation?.then((generated) => {
                if (generated) {
                    watchOutOfRootPaths(generated)
                }
            })
        },

        async buildStart() {
            // The first build uses the generation started at configResolved. Later buildStarts are `vite build --watch` rebuilds (or further environments of one build): refresh only when the CSS graph or the used classes changed, so unchanged rebuilds keep the module and stay quiet.
            if (config.command !== 'build') {
                return
            }
            if (buildStarts++ > 0 && current) {
                const settled = current
                generation = (async () => {
                    if (await dependenciesChanged(settled)) {
                        return regenerate(settled.cssPath)
                    }
                    if (
                        settled.pruning &&
                        hashClasses(settled.pruning.scanner.scan().classes) !==
                            settled.pruning.classesHash
                    ) {
                        return regenerate(settled.cssPath, { reuseScanner: true })
                    }
                    return settled
                })()
            }
            // Await even the initial generation: failures must fail the build regardless of whether any module imports the runtime subpath.
            await generation
        },

        async resolveId(source) {
            // Only the bare specifier is intercepted. If the user aliases the subpath elsewhere, that's their path to use — the plugin doesn't chase it. The generated module's own imports need no interception either: they go through this package's real tailwind-merge re-export, resolvable from anywhere because the plugin package is the user's direct dependency.
            if (source === RUNTIME_SPECIFIER) {
                return (await cssRoot) === null ? null : VIRTUAL_MODULE_ID
            }
        },

        async load(id) {
            if (id !== VIRTUAL_MODULE_ID) {
                return
            }
            const generated = await generation
            if (!generated) {
                return FALLBACK_MODULE_CODE
            }
            if (config.command === 'build') {
                // In `vite build --watch`, Rollup owns the watching — register the CSS graph so config changes rebuild, and with pruning the scanned files and source globs too (as @tailwindcss/vite does), so class-usage changes in files outside the module graph rebuild as well. The dev server intentionally doesn't do this: its watching runs through hotUpdate with the hash gate, and a watch-file link here would full-reload on every edit.
                for (const dependency of generated.dependencies) {
                    this.addWatchFile(dependency)
                }
                if (generated.pruning) {
                    for (const file of generated.pruning.files) {
                        this.addWatchFile(file)
                    }
                    for (const glob of generated.pruning.globs) {
                        this.addWatchFile(path.join(glob.base, glob.pattern))
                    }
                }
            }
            return generated.code
        },

        async closeBundle() {
            // Vite can configure the replacement server before closing the old one's environments. An old close must not dispose the new server's queue.
            if (devServer?.environments[this.environment.name] !== this.environment) {
                return
            }
            devServer = undefined
            await updates?.dispose()
        },

        hotUpdate({ file }) {
            // Runs once per environment; the work below spans all environments, so let the client run own it.
            if (this.environment.name !== 'client' || !current) {
                return
            }
            if (current.dependencies.has(file)) {
                updates?.schedule('config')
            } else if (current.pruning) {
                // Any other file may be a source: the re-scan itself decides whether the used classes changed (a new file, a deleted one, an edit).
                updates?.schedule('sources')
            }
        },
    }
}

const RUNTIME_SPECIFIER = '@tailwind-merge/vite/runtime'

/** The \0 prefix marks the module as virtual for other plugins. The served code is already plain JavaScript (the configurator emits `format: 'js'`), so no extension is needed to route it through further transforms. */
const VIRTUAL_MODULE_ID = '\0@tailwind-merge/vite/runtime'
