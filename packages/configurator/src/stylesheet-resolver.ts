import fs from 'node:fs'
import path from 'node:path'

import { type Resolver } from '@tailwindcss/node'
import enhancedResolve from 'enhanced-resolve'

/**
 * Resolves stylesheet requests with Tailwind's package fields and conditions after an optional bundler resolver declines. Tracking at this boundary records the file's CSS role, including .pcss and extensionless imports, without mistaking JavaScript dependencies for stylesheets.
 */
export function createStylesheetResolver(
    customResolver?: Resolver,
    onStylesheet?: (file: string) => void,
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
        const file =
            (await customResolver?.(id, base)) ||
            (await new Promise<string>((resolve, reject) => {
                resolver.resolve({}, base, id, {}, (error, result) => {
                    if (error) {
                        reject(error)
                    } else if (!result) {
                        reject(new Error(`Could not resolve stylesheet '${id}' from '${base}'`))
                    } else {
                        resolve(result)
                    }
                })
            }))
        onStylesheet?.(file)
        return file
    }
}
