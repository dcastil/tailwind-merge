import fs from 'node:fs'
import path from 'node:path'

import { type Resolver } from '@tailwindcss/node'
import enhancedResolve from 'enhanced-resolve'

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
    const resolver = enhancedResolve.ResolverFactory.createResolver({
        fileSystem: fs,
        useSyncFileSystemCalls: true,
        extensions: ['.css'],
        mainFields: ['style'],
        conditionNames: ['style'],
        modules: ['node_modules', ...(process.env.NODE_PATH?.split(path.delimiter) ?? [])],
    })
    return async (id, base) => {
        const request = (await customResolver?.(id, base)) || id
        const file = await new Promise<string>((resolve, reject) => {
            const missingDependencies = onMissingDependency ? new Set<string>() : undefined
            resolver.resolve({}, base, request, { missingDependencies }, (error, result) => {
                if (error || !result) {
                    for (const file of missingDependencies ?? []) {
                        onMissingDependency?.(file)
                    }
                    reject(error ?? new Error(`Could not resolve stylesheet '${id}' from '${base}'`))
                } else {
                    resolve(result)
                }
            })
        })
        onStylesheet?.(file)
        return file
    }
}
