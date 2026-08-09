import path from 'node:path'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

import { discoverCssRoot } from './discovery'
import { FALLBACK_MODULE_CODE, GeneratedRuntimeModule, generateRuntimeModule } from './generation'

export interface TailwindMergeOptions {
    /** Path to the project's Tailwind CSS entrypoint, relative to the Vite root. When omitted, the entrypoint is auto-detected by scanning the root for CSS files with Tailwind markers — only ambiguous projects (several independent roots) need to set this. */
    css?: string
    /** LRU cache size of the generated `twMerge`, passed through to the generated config. Defaults to tailwind-merge's default. */
    cacheSize?: number
}

/**
 * Vite plugin that configures tailwind-merge for the project's own Tailwind CSS.
 *
 * Add it next to `@tailwindcss/vite` and import from the runtime subpath: `import { twMerge } from '@tailwind-merge/vite/runtime'`. While Vite runs, that import resolves to an in-memory module generated from the project's Tailwind theme by tailwind-merge-configurator; outside Vite it resolves to the real runtime.ts and serves default tailwind-merge behavior. Design and rationale live in ../configurator/PROPOSAL.md §11.
 *
 * The dev loop is deliberately quiet: generation reads only the CSS configuration (never which classes the app uses), regenerates only when a file of the CSS graph changes, and even then triggers a full reload only when the generated module actually changed — editing utility classes in app.css causes no churn.
 */
export default function tailwindMerge(options: TailwindMergeOptions = {}): Plugin {
    let config: ResolvedConfig
    let devServer: ViteDevServer | undefined
    /** Resolves to the discovered (or configured) CSS entrypoint, null when the project has none; rejects on ambiguity. Resolved before the runtime subpath resolves, so redirect vs. fallback is decided exactly once. */
    let cssRoot: Promise<string | null>
    /** The in-flight or settled generation the virtual module's `load` awaits. */
    let generation: Promise<GeneratedRuntimeModule | null> | undefined
    /** Last successfully generated module — kept as the serving state across failed regenerations. */
    let current: GeneratedRuntimeModule | null = null
    let regenerateTimer: ReturnType<typeof setTimeout> | undefined

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

    /** Regenerates the runtime module, keeping the last good module (already logged) when generation fails. */
    async function regenerate(cssPath: string): Promise<GeneratedRuntimeModule | null> {
        try {
            current = await generateRuntimeModule({
                cssPath,
                root: config.root,
                cacheSize: options.cacheSize,
            })
        } catch (error) {
            config.logger.error(
                `[@tailwind-merge/vite] Generating the tailwind-merge config failed${current ? ' — keeping the previous one' : ''}: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
        return current
    }

    /** Dependencies outside the Vite root (a monorepo's shared theme package) are invisible to the dev watcher unless added explicitly. */
    function watchOutOfRootDependencies(generated: GeneratedRuntimeModule) {
        if (!devServer) {
            return
        }
        for (const dependency of generated.dependencies) {
            if (path.relative(config.root, dependency).startsWith('..')) {
                devServer.watcher.add(dependency)
            }
        }
    }

    async function regenerateAndReload() {
        if (!current || !devServer) {
            return
        }
        const previousHash = current.hash
        generation = regenerate(current.cssPath)
        const next = await generation
        if (!next) {
            return
        }
        watchOutOfRootDependencies(next)
        if (next.hash === previousHash) {
            // The stability gate: the CSS graph changed but the generated config didn't (utility edits, comments, formatting) — nothing to invalidate, no reload.
            return
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
    }

    return {
        name: '@tailwind-merge/vite',
        // The runtime subpath is a real, installable package path, so Vite's own resolver can resolve it. Interception must therefore run before the core plugins — without this, vite:resolve wins and the fallback file gets served everywhere.
        enforce: 'pre',

        config: () => ({
            // The dep optimizer must not prebundle the runtime subpath, or dev would freeze the on-disk fallback before resolveId can redirect it.
            optimizeDeps: { exclude: [RUNTIME_SPECIFIER] },
            // SSR must see the redirect too, or server and client would merge classes differently and produce hydration-visible class drift.
            ssr: { noExternal: ['@tailwind-merge/vite'] },
        }),

        configResolved(resolvedConfig) {
            config = resolvedConfig
            cssRoot = locateCssRoot()
            generation = cssRoot.then((cssPath) => (cssPath === null ? null : regenerate(cssPath)))
            // Ambiguity errors also surface on the first runtime import; log right away so they are visible even before that.
            generation.catch((error: unknown) =>
                config.logger.error(error instanceof Error ? error.message : String(error)),
            )
        },

        configureServer(server) {
            devServer = server
            void generation?.then((generated) => {
                if (generated) {
                    watchOutOfRootDependencies(generated)
                }
            })
        },

        async resolveId(source) {
            // Only the bare specifier is intercepted. If the user aliases the subpath elsewhere, that's their path to use — the plugin doesn't chase it. The generated module's own imports need no interception either: they go through this package's real tailwind-merge re-export, resolvable from anywhere because the plugin package is the user's direct dependency (PROPOSAL.md §11.3).
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
                // In `vite build --watch`, Rollup owns the watching — register the CSS graph so config changes rebuild. The dev server intentionally doesn't do this: its watching runs through hotUpdate with the hash gate, and a watch-file link here would full-reload on every CSS edit.
                for (const dependency of generated.dependencies) {
                    this.addWatchFile(dependency)
                }
            }
            return generated.code
        },

        hotUpdate({ file }) {
            // Runs once per environment; the work below spans all environments, so let the client run own it.
            if (this.environment.name !== 'client') {
                return
            }
            if (!current?.dependencies.has(file)) {
                return
            }
            // Debounced: editors fire several events per save, and one theme edit can touch multiple files of the CSS graph.
            clearTimeout(regenerateTimer)
            regenerateTimer = setTimeout(() => void regenerateAndReload(), 100)
        },
    }
}

const RUNTIME_SPECIFIER = '@tailwind-merge/vite/runtime'

/** The \0 prefix marks the module as virtual for other plugins. The served code is already plain JavaScript (the configurator emits `format: 'js'`), so no extension is needed to route it through further transforms. */
const VIRTUAL_MODULE_ID = '\0@tailwind-merge/vite/runtime'
