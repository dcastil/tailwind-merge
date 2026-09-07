import fs from 'node:fs'
import path from 'node:path'

import { type Resolver } from '@tailwindcss/node'
import enhancedResolve, { type ResolveOptions } from 'enhanced-resolve'

/**
 * Resolves stylesheet requests with Tailwind's package fields and conditions after optional bundler resolution. An alias-expanded request may still need an extension or package lookup; finish that lookup here so failures report missing targets under the alias rather than the original specifier. Tracking at this boundary records the file's CSS role, including .pcss and extensionless imports, without mistaking JavaScript dependencies for stylesheets.
 * Each caller gets an uncached filesystem view so regeneration sees imports created or repaired after an earlier resolution attempt.
 * Failed resolution reports attempted missing paths separately from stylesheet roles, so integrations can watch for their creation without treating resolver metadata such as package.json as CSS.
 */
export function createStylesheetResolver(
    customResolver?: Resolver,
    onStylesheet?: (file: string) => void,
    onMissingDependency?: (file: string) => void,
): (id: string, base: string) => Promise<string> {
    return createResolver(
        [{ extensions: ['.css'], mainFields: ['style'], conditionNames: ['style'] }],
        customResolver,
        onStylesheet,
        onMissingDependency,
    )
}

/** Resolves JavaScript configs/plugins with Tailwind's import-then-require fallback. Report the module before loading can fail, and missing targets before rejecting, so integrations can recover from repairs and creation. An uncached filesystem also avoids retaining a missing result across the first retry. */
export function createModuleResolver(
    customResolver?: Resolver,
    onDependency?: (file: string) => void,
): (id: string, base: string) => Promise<string> {
    const extensions = ['.js', '.json', '.node', '.ts']
    return createResolver(
        [
            { extensions, conditionNames: ['node', 'import'] },
            { extensions, conditionNames: ['node', 'require'] },
        ],
        customResolver,
        onDependency,
        onDependency,
    )
}

/** Shares fresh filesystem access and dependency reporting across stylesheet and module resolution. Keep failed alternatives private until every condition set fails; a successful fallback must not turn missing package metadata into watched dependencies or stylesheet inputs. */
function createResolver(
    alternatives: Pick<ResolveOptions, 'extensions' | 'mainFields' | 'conditionNames'>[],
    customResolver?: Resolver,
    onResolved?: (file: string) => void,
    onMissingDependency?: (file: string) => void,
): (id: string, base: string) => Promise<string> {
    const resolvers = alternatives.map((options) => enhancedResolve.ResolverFactory.createResolver({
        ...options,
        fileSystem: fs,
        useSyncFileSystemCalls: true,
        modules: ['node_modules', ...(process.env.NODE_PATH?.split(path.delimiter) ?? [])],
    }))
    return async (id, base) => {
        const request = (await customResolver?.(id, base)) || id
        const missingDependencies = onMissingDependency ? new Set<string>() : undefined
        let resolutionError: unknown
        for (const resolver of resolvers) {
            let file: string
            try {
                file = await new Promise<string>((resolve, reject) => {
                    resolver.resolve({}, base, request, { missingDependencies }, (error, result) => {
                        if (error || !result) {
                            reject(error ?? new Error(`Could not resolve '${id}' from '${base}'`))
                        } else {
                            resolve(result)
                        }
                    })
                })
            } catch (error) {
                resolutionError = error
                continue
            }
            onResolved?.(file)
            return file
        }
        for (const file of missingDependencies ?? []) {
            onMissingDependency?.(file)
        }
        throw resolutionError
    }
}
