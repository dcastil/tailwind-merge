import path from 'node:path'

import type { ResolvedConfig } from 'vite'

import type { TailwindMergeOptions } from './index'

/**
 * Resolves the `prune` option against the build context. `libraryDefault` flags the one implicit decision worth a log line: a library build (`build.lib`) is not pruned unless asked, because the library's `twMerge` calls receive class strings from the consuming app's code, which no scan from inside the library can see.
 */
export function resolvePruneOptions(
    option: TailwindMergeOptions['prune'],
    config: ResolvedConfig,
): { build: boolean; dev: boolean; log: boolean; libraryDefault: boolean } {
    const isLibrary = Boolean(config.build.lib)
    if (option === false) {
        return { build: false, dev: false, log: false, libraryDefault: false }
    }
    if (option === true) {
        return { build: true, dev: false, log: true, libraryDefault: false }
    }
    const build = option?.build ?? !isLibrary
    return {
        build,
        dev: option?.dev ?? false,
        log: option?.log ?? true,
        libraryDefault: isLibrary && option?.build === undefined && config.command === 'build',
    }
}

/**
 * Where Tailwind's automatic source detection starts for this project, mirroring the Tailwind integration in use: `@tailwindcss/vite` scans from the Vite root, while the PostCSS plugin defaults to the working directory. When the Vite plugin isn't in the plugin list, both directories are scanned (nested ones collapse into the outer), which is always a superset of what Tailwind scans — a wider scan only prunes less.
 */
export function autoDetectBases(config: Pick<ResolvedConfig, 'root' | 'plugins'>): string[] {
    const usesTailwindVitePlugin = config.plugins.some((plugin) =>
        plugin.name.startsWith('@tailwindcss/vite'),
    )
    if (usesTailwindVitePlugin) {
        return [config.root]
    }
    const candidates = [...new Set([config.root, process.cwd()].map((directory) => path.resolve(directory)))]
    return candidates.filter((directory) => !candidates.some((other) => other !== directory && isInside(directory, other)))
}

function isInside(directory: string, ancestor: string): boolean {
    const relative = path.relative(ancestor, directory)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}
