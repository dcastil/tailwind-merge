import { statSync } from 'node:fs'
import path from 'node:path'

import {
    type GeneratedRuntimeModule,
    type GenerationSession,
    createGenerationSession,
    discoverCssRoot,
    fallbackModuleCode,
} from '@tailwind-merge/plugin-core'

import { type LoaderOptions } from './options'

/** The slice of the webpack loader API this loader uses. Turbopack's loader runner provides the same members (verified against Next.js 16.3, where `addMissingDependency` is accepted but not acted on — the recovery directories the plugin core reports cover that case as context dependencies). */
export interface LoaderContext {
    /** The Next.js project directory. */
    rootContext: string
    resourcePath: string
    getOptions(): LoaderOptions
    addDependency(file: string): void
    addContextDependency(directory: string): void
    addMissingDependency(file: string): void
}

/**
 * Replaces the content of this package's runtime module with the module generated from the project's Tailwind CSS. Registered by `withTailwindMerge` (src/index.ts) with both Turbopack and webpack; runs once per compilation environment (server components, server rendering, browser), which the per-process project state below turns into one generation.
 *
 * Every run registers the CSS configuration graph — entrypoint, imported stylesheets, `@config`/`@plugin` modules, and the directories a missing import would appear in — as dependencies, so the bundler re-runs the loader when any of them changes and `refresh()` decides whether that change regenerates the module. A regeneration with identical output changes nothing downstream: both bundlers hash module content. With pruning active (builds, or dev with `prune.dev`), the scanned source directories are context dependencies too, so a class-usage change re-prunes the retained classification, and Turbopack's persistent cache cannot serve a module pruned for other sources.
 *
 * Failure policy mirrors the Vite plugin's: a build fails on a configuration-generation failure (the loader rejects, which fails the compilation), while the dev server logs the error and keeps serving the last good module — or the default fallback before the first success. A project without a Tailwind root warns once and serves the default fallback as well. A failed source scan is not a generation failure: the module holds the full config and the warning says so.
 */
export default async function tailwindMergeLoader(this: LoaderContext): Promise<string> {
    const options = this.getOptions()
    const project = projectState(this.rootContext, options)
    const generated = await project.next()
    registerDependencies(this, project, generated)
    // Without a Tailwind root (or before the first successful generation) the served module is the same default-config surface the file on disk provides, minus the file's marker comment, which would otherwise survive minification in the app bundle.
    return generated?.code ?? fallbackModuleCode(IMPORT_SOURCE)
}

interface ProjectState {
    root: string
    session: GenerationSession
    /** The resolved entrypoint once discovery has finished: null when the project has none, undefined while unknown. */
    cssRoot: string | null | undefined
    /** Coalesces the compilation environments' concurrent runs into one generation or refresh. */
    inFlight: Promise<GeneratedRuntimeModule | null> | undefined
    started: boolean
    next(): Promise<GeneratedRuntimeModule | null>
}

/** One state per project and option set for the life of the loader process — Next.js runs webpack loaders in its own process and Turbopack loaders in a pool process it keeps alive across compilations, so the session's retained classification and dependency graph survive from one loader run to the next. */
const projects = new Map<string, ProjectState>()

function projectState(root: string, options: LoaderOptions): ProjectState {
    const key = `${root}\0${JSON.stringify(options)}`
    let state = projects.get(key)
    if (state) {
        return state
    }

    const cssRoot: Promise<string | null> =
        options.css !== undefined
            ? Promise.resolve(path.resolve(root, options.css))
            : discoverCssRoot(root, { packageName: PACKAGE_NAME }).then((found) => {
                  if (found === null) {
                      console.warn(
                          `[${PACKAGE_NAME}] No Tailwind CSS root found — serving default tailwind-merge behavior. Set the \`css\` option to your Tailwind entrypoint if it uses another extension or is outside the scanned directories.`,
                      )
                  }
                  return found
              })

    const session = createGenerationSession({
        cssRoot,
        root,
        packageName: PACKAGE_NAME,
        importSource: IMPORT_SOURCE,
        cacheSize: options.cacheSize,
        encoding: options.encoding,
        // Tailwind's PostCSS plugin, which Next.js runs, starts automatic source detection in the working directory — the project directory in any ordinary `next dev`/`next build`.
        prune: options.prune ? { autoDetectBases: [root] } : undefined,
        onGenerated: (generated) => reportPruning(generated, options),
        onError(error, current) {
            if (options.mode === 'build') {
                throw error
            }
            console.error(
                `[${PACKAGE_NAME}] Generating the tailwind-merge config failed${current ? ' — keeping the previous one' : ''}: ${error instanceof Error ? error.message : String(error)}`,
            )
        },
    })
    state = {
        root,
        session,
        cssRoot: undefined,
        inFlight: undefined,
        started: false,
        next() {
            if (!this.inFlight) {
                // The first run is the session's eager generation; every later loader run is a refresh, which reuses the module unless the CSS graph or the used classes changed. A rejection (a build's failure policy) propagates to every waiting run.
                const attempt = this.started ? this.session.refresh() : this.session.generation
                this.started = true
                this.inFlight = attempt.finally(() => {
                    this.inFlight = undefined
                })
            }
            return this.inFlight
        },
    }
    void cssRoot.then(
        (found) => {
            state!.cssRoot = found
        },
        () => {},
    )
    projects.set(key, state)
    return state
}

/**
 * Hands the session's dependency graph to the bundler: files as file dependencies, directories (the recovery directories reported for missing imports, and a missing explicit entrypoint's nearest existing parent) as context dependencies, and nonexistent paths as missing dependencies for webpack, which acts on them. With pruning, the scanned source bases join as context dependencies.
 */
function registerDependencies(
    context: LoaderContext,
    project: ProjectState,
    generated: GeneratedRuntimeModule | null,
) {
    const dependencies = new Set(project.session.dependencies)
    if (project.cssRoot) {
        dependencies.add(project.cssRoot)
    }
    for (const dependency of dependencies) {
        const stats = statSync(dependency, { throwIfNoEntry: false })
        if (!stats) {
            context.addMissingDependency(dependency)
            if (dependency === project.cssRoot) {
                context.addContextDependency(nearestExistingDirectory(dependency))
            }
        } else if (stats.isDirectory()) {
            context.addContextDependency(dependency)
        } else {
            context.addDependency(dependency)
        }
    }
    for (const source of generated?.pruning?.scanner.sources ?? []) {
        if (!source.negated) {
            context.addContextDependency(source.base)
        }
    }
}

function nearestExistingDirectory(file: string): string {
    let directory = path.dirname(file)
    while (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
        const parent = path.dirname(directory)
        if (parent === directory) {
            break
        }
        directory = parent
    }
    return directory
}

/** One line per generation about pruning, so the behavior and its effect are visible where someone debugging a production-only merge difference would look; a failed scan is always reported, since the module then silently holds the full config. */
function reportPruning(generated: GeneratedRuntimeModule, options: LoaderOptions) {
    if (generated.pruningError) {
        console.warn(
            `[${PACKAGE_NAME}] Could not scan your sources, serving the full tailwind-merge config instead: ${generated.pruningError.message}`,
        )
    } else if (generated.pruning && options.log) {
        const { classGroupsAfter, classGroupsBefore, classifiedClassCount } =
            generated.pruning.report
        console.log(
            `[${PACKAGE_NAME}] Pruned the tailwind-merge config to ${classGroupsAfter} of ${classGroupsBefore} class groups from the ${classifiedClassCount} classes found in your sources`,
        )
    }
}

const PACKAGE_NAME = '@tailwind-merge/next'

/** The generated module replaces a real file inside this package, so it can import tailwind-merge the ordinary way: resolution starts in the package's own directory, where its dependency is installed under any package manager. */
const IMPORT_SOURCE = 'tailwind-merge'
