import { clearRequireCache } from '@tailwindcss/node/require-cache'

import {
    type GeneratedRuntimeModule,
    type GenerateRuntimeModuleOptions,
    dependenciesChanged,
    generateRuntimeModule,
    hashClasses,
} from './generation'

interface GenerationSessionOptions extends Omit<GenerateRuntimeModuleOptions, 'cssPath'> {
    cssRoot: Promise<string | null>
    onGenerated: (generated: GeneratedRuntimeModule) => void
    /** Dev logs the error and retains the last good module; builds throw to reject the attempt. Discovery errors always propagate. */
    onError: (error: unknown, current: GeneratedRuntimeModule | null) => void
}

/** Owns generation for one resolved Vite configuration. Failed attempts retain their dependency discoveries alongside the last good graph; only a success replaces serving state and dependencies. Both dev updates and build-watch use this lifecycle. */
export function createGenerationSession(options: GenerationSessionOptions) {
    const { cssRoot, onGenerated, onError, ...generationOptions } = options
    let current: GeneratedRuntimeModule | null = null
    let dependencies = new Set<string>()
    let generation = run()

    return {
        get current() {
            return current
        },
        get dependencies(): ReadonlySet<string> {
            return dependencies
        },
        get generation() {
            return generation
        },

        /** Schedule after the previous attempt, including a rejection. Source-only changes can reuse the scanner and module cache. */
        regenerate(reuseScanner = false) {
            generation = generation.catch(() => null).then(() => run(reuseScanner))
            return generation
        },

        /** Watch builds reuse unchanged successes but always retry failures, even before the first successful generation. */
        refresh() {
            generation = generation.catch(() => null).then(async (previous) => {
                if (!previous || (await dependenciesChanged(previous))) {
                    return run()
                }
                if (
                    previous.pruning &&
                    hashClasses(previous.pruning.scanner.scan().classes) !== previous.pruning.classesHash
                ) {
                    return run(true)
                }
                return previous
            })
            return generation
        },

        /** Programmatic restarts may reuse the plugin object. Drain its old attempt before clearing cached modules and replacing this session. */
        async dispose() {
            await generation.catch(() => {})
            clearRequireCache([...dependencies])
        },
    }

    async function run(reuseScanner = false): Promise<GeneratedRuntimeModule | null> {
        const cssPath = await cssRoot
        if (cssPath === null) {
            return null
        }
        try {
            // Tailwind refreshes ESM itself; CommonJS modules and parents holding their exports need invalidation before either scanning or design-system loading.
            if (!reuseScanner) {
                clearRequireCache([...dependencies])
            }
            trackDependency(cssPath)
            const generated = await generateRuntimeModule({
                ...generationOptions,
                cssPath,
                integration: { ...generationOptions.integration, onDependency: trackDependency },
                prune: generationOptions.prune && {
                    ...generationOptions.prune,
                    scanner: reuseScanner ? current?.pruning?.scanner : undefined,
                },
            })
            current = generated
            dependencies = new Set(generated.dependencies)
            onGenerated(generated)
        } catch (error) {
            onError(error, current)
        }
        return current
    }

    /** Observe files, missing targets, and recovery directories before an attempt can fail. The caller registers its watcher immediately or drains the accumulated set when the watcher starts. */
    function trackDependency(file: string) {
        if (!dependencies.has(file)) {
            dependencies.add(file)
            generationOptions.integration?.onDependency?.(file)
        }
    }
}
