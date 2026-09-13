import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

import {
    type TailwindMergeOptions,
    resolveLoaderOptions,
    serializableLoaderOptions,
} from './options'

export type { PruneOptions, TailwindMergeOptions } from './options'

/** The function form of `next.config`, which Next.js calls with the current phase (see `next/constants`) and its default config. */
export type NextConfigFunction = (
    phase: string,
    context: { defaultConfig: NextConfig },
) => NextConfig | Promise<NextConfig>

/**
 * Configures tailwind-merge for the project's own Tailwind CSS in a Next.js app.
 *
 * Wrap the Next.js config with it and import from the runtime subpath: `import { twMerge } from '@tailwind-merge/next/runtime'`. While Next.js compiles the app, that import resolves to the module generated from the project's Tailwind theme by the inlined plugin core and configurator; outside Next.js it resolves to the real runtime.ts and serves default tailwind-merge behavior. Repository integration goals and invariants live in agents/next-plugin.md.
 *
 * Mechanics: neither Turbopack nor webpack offers virtual modules through the Next.js config, but both run webpack-style loaders, so the plugin registers a loader rule for this package's own `runtime.mjs` with both bundlers and lets the loader (src/loader.ts) replace the file's content with the generated module. The rules are keyed on the file name plus the legal comment inside the file, not on a path in node_modules, because Turbopack matches real paths — a symlinked install (`pnpm link`, a workspace) would otherwise fall through to the default config unnoticed. Dev and build get separate Turbopack rules through the built-in `development`/`production` conditions; the webpack hook reads the mode from its context. `transpilePackages` keeps the Pages Router's server bundle from externalizing the package: an externalized runtime would `require()` the on-disk fallback at request time while the client bundle carries the generated module, and the two would merge classes differently.
 *
 * The dev loop is deliberately quiet: the loader registers the files of the CSS configuration graph as dependencies (never the app's sources, unless `prune.dev` asks for it), so Next.js re-runs it only when one of those changes, and a regeneration that produces identical code leaves the bundlers' module hashes unchanged. Production builds additionally prune the config to the classes found in the project's sources (`prune` option).
 */
export function withTailwindMerge(
    nextConfig: NextConfigFunction,
    options?: TailwindMergeOptions,
): NextConfigFunction
export function withTailwindMerge(
    nextConfig?: NextConfig,
    options?: TailwindMergeOptions,
): NextConfig
export function withTailwindMerge(
    nextConfig: NextConfig | NextConfigFunction = {},
    options: TailwindMergeOptions = {},
): NextConfig | NextConfigFunction {
    if (typeof nextConfig === 'function') {
        return async (phase, context) => applyToConfig(await nextConfig(phase, context), options)
    }
    return applyToConfig(nextConfig, options)
}

type TurbopackRules = NonNullable<NonNullable<NextConfig['turbopack']>['rules']>
type TurbopackRuleCollection = TurbopackRules[string]
type TurbopackRuleItem = Exclude<TurbopackRuleCollection, readonly unknown[]>

function applyToConfig(config: NextConfig, options: TailwindMergeOptions): NextConfig {
    warnWithoutCompilerConfig()
    const rules = config.turbopack?.rules ?? {}
    const existing = rules[RULE_GLOB]
    const existingItems =
        existing === undefined ? [] : Array.isArray(existing) ? existing : [existing]
    const transpilePackages = config.transpilePackages ?? []

    return {
        ...config,
        transpilePackages: transpilePackages.includes(PACKAGE_NAME)
            ? transpilePackages
            : [...transpilePackages, PACKAGE_NAME],
        turbopack: {
            ...config.turbopack,
            rules: {
                ...rules,
                // A user rule on the same glob keeps running; rules are evaluated in order, so the plugin's come last.
                [RULE_GLOB]: [...existingItems, ...turbopackRules(options)],
            },
        },
        webpack(webpackConfig, context) {
            webpackConfig.module.rules.push({
                test: isRuntimeModule,
                use: [
                    {
                        loader: LOADER_PATH,
                        options: serializableLoaderOptions(
                            resolveLoaderOptions(options, context.dev ? 'dev' : 'build'),
                        ),
                    },
                ],
            })
            return config.webpack ? config.webpack(webpackConfig, context) : webpackConfig
        },
    }
}

let warnedWithoutCompilerConfig = false

/**
 * Turbopack applies loader rules to code in node_modules only when the project has a `tsconfig.json` or `jsconfig.json` — even an empty one; the content does not matter (observed with Next.js 16.3, reproduced with a bare `*.mjs` rule). Without one, the runtime subpath would silently keep tailwind-merge's default behavior under Turbopack, so say so once per process. create-next-app writes one of the two files for every project, which keeps this rare. The working directory stands in for the project directory, which the config API does not expose.
 */
function warnWithoutCompilerConfig() {
    if (warnedWithoutCompilerConfig) {
        return
    }
    warnedWithoutCompilerConfig = true
    const directory = process.cwd()
    if (
        !['tsconfig.json', 'jsconfig.json'].some((file) => existsSync(path.join(directory, file)))
    ) {
        console.warn(
            `[${PACKAGE_NAME}] No tsconfig.json or jsconfig.json found in ${directory}. Turbopack only applies the plugin's loader to installed packages when the project has one, so without it the runtime import keeps tailwind-merge's default configuration. Add an empty jsconfig.json if the project has no TypeScript configuration.`,
        )
    }
}

/** One rule per mode: Turbopack evaluates the plugin's config once for `next dev` and `next build` alike, so the mode has to be a rule condition rather than a value computed at config time. */
function turbopackRules(options: TailwindMergeOptions): TurbopackRuleItem[] {
    return (['dev', 'build'] as const).map((mode) => ({
        condition: {
            all: [
                { path: RUNTIME_PATH_PATTERN },
                { content: RUNTIME_MARKER_PATTERN },
                mode === 'dev' ? 'development' : 'production',
            ],
        },
        loaders: [
            {
                loader: LOADER_PATH,
                options: serializableLoaderOptions(resolveLoaderOptions(options, mode)),
            },
        ],
    }))
}

/** webpack hands rules the resolved resource path, with symlinks resolved by default: compare against both spellings of this package's runtime file. */
function isRuntimeModule(file: string): boolean {
    return file === RUNTIME_PATH || file === runtimeRealPath()
}

let resolvedRuntimeRealPath: string | undefined

function runtimeRealPath(): string {
    if (resolvedRuntimeRealPath === undefined) {
        try {
            resolvedRuntimeRealPath = realpathSync(RUNTIME_PATH)
        } catch {
            // The package's own runtime file is missing only in unbuilt source checkouts; the unresolved path keeps the comparison meaningful.
            resolvedRuntimeRealPath = RUNTIME_PATH
        }
    }
    return resolvedRuntimeRealPath
}

const PACKAGE_NAME = '@tailwind-merge/next'

/** Turbopack rule keys are file-name globs; the conditions below narrow the rule to this package's runtime file. */
const RULE_GLOB = '*.mjs'

/** Turbopack matches project-relative real paths with forward slashes; only the file name is fixed across install layouts. */
const RUNTIME_PATH_PATTERN = /(^|\/)runtime\.mjs$/

/** The legal comment at the top of src/runtime.ts, which the build preserves — the one part of the runtime file's content the rule can rely on across install layouts. */
const RUNTIME_MARKER_PATTERN = /@tailwind-merge\/next runtime fallback/

/** Both bundlers accept a loader as an absolute file path, which sidesteps loader-name resolution and the exports map. Built and source layouts agree on the relative location. */
const LOADER_PATH = fileURLToPath(new URL('./loader.mjs', import.meta.url))

const RUNTIME_PATH = fileURLToPath(new URL('./runtime.mjs', import.meta.url))
