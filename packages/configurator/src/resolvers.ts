import fs from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
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

/**
 * Retains local transitive dependencies after module execution fails. Tailwind reports its own import walk only after a successful load, leaving a broken child (or a missing grandchild) invisible to watchers. Recognize its literal-import forms without a JavaScript parser so syntax errors cannot stop the walk. Matches only add watches: they never execute code or decide how Tailwind loads a module.
 * This recovery-only walk uses fresh resolution, reports missing alternatives, follows cycles once, and leaves the original loader responsible for errors. Bare package imports stay outside the local graph, as in Tailwind's dependency collector.
 */
export async function trackModuleDependencies(file: string, onDependency: (file: string) => void) {
    const visited = new Set<string>()
    // Match Tailwind's JS/TS extension preference, with JSON and native modules retained as leaf dependencies. Directory imports also honor package.json's main field through the shared resolver.
    const jsExtensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts', '.jsx', '.tsx', '.json', '.node']
    const tsExtensions = ['.ts', '.cts', '.mts', '.tsx', '.js', '.cjs', '.mjs', '.jsx', '.json', '.node']
    const resolveJs = createResolver(
        [{ extensions: jsExtensions, conditionNames: ['node', 'import', 'require'] }],
        undefined, undefined, onDependency,
    )
    const resolveTs = createResolver(
        [{ extensions: tsExtensions, conditionNames: ['node', 'import', 'require'] }],
        undefined, undefined, onDependency,
    )
    await visit(file)

    async function visit(file: string): Promise<void> {
        if (visited.has(file)) {
            return
        }
        visited.add(file)
        onDependency(file)
        const extension = path.extname(file)
        if (extension === '.json' || extension === '.node') {
            return
        }
        const source = await readFile(file, 'utf8').catch(() => null)
        if (source === null) {
            return
        }
        const imports = new Set<string>()
        for (const pattern of MODULE_IMPORT_PATTERNS) {
            for (const match of source.matchAll(pattern)) {
                if (match[1]!.startsWith('.')) {
                    imports.add(match[1]!)
                }
            }
        }
        const resolve = ['.js', '.cjs', '.mjs'].includes(extension) ? resolveJs : resolveTs
        await Promise.all([...imports].map(async (id) => {
            const dependency = await resolve(id, path.dirname(file)).catch(() => undefined)
            if (dependency) {
                await visit(dependency)
            }
        }))
    }
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
        // Rollup's watcher can miss creation when several unresolved filenames share a directory. Watch the nearest existing parent of the actual local request too; resolver metadata such as ancestor package.json attempts must not widen this to unrelated directories.
        if (onMissingDependency && (request.startsWith('.') || path.isAbsolute(request))) {
            const directory = await existingParentDirectory(path.resolve(base, request))
            if (directory) {
                onMissingDependency(directory)
            }
        }
        throw resolutionError
    }
}

/** A missing nested directory cannot be watched yet; its closest existing ancestor observes creation of the remaining path. Only failed local requests use this recovery watch, which drops out after successful resolution. */
async function existingParentDirectory(file: string): Promise<string | undefined> {
    let directory = path.dirname(file)
    while (!(await stat(directory).catch(() => null))?.isDirectory()) {
        const parent = path.dirname(directory)
        if (parent === directory) {
            return undefined
        }
        directory = parent
    }
    return directory
}

/** Recognize local static imports, re-exports, dynamic imports, and requires even in incomplete source. Do not greedily span later statements' `from` clauses; extra matches in comments or strings only broaden failure-recovery watches. */
const MODULE_IMPORT_PATTERNS = [
    /\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    /\b(?:require|import)\s*\(\s*['"`]([^'"`]+)['"`]/g,
]
