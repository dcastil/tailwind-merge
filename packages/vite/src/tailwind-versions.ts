import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Warns when this package's Tailwind engine can drift from the project's CSS build.
 *
 * The plugin reads the design system with its own `@tailwindcss/node` dependency, while the project's CSS is compiled by whatever `@tailwindcss/vite` pins. On fresh installs both resolve to the newest version in range and dedupe to one copy; a stale lockfile after a `@tailwindcss/vite` upgrade is the case where they diverge, and a generated config from an older engine could silently disagree with the real build. Cheap detection beats silent wrongness — resolving through the user's `@tailwindcss/vite` at runtime (zero drift by construction) stays the fallback plan if this warning ever fires a lot in practice.
 *
 * Returns the warning message, or null when versions align, comparison is impossible (no `@tailwindcss/vite` installed — the plugin works without it), or resolution fails for any reason.
 */
export function tailwindVersionSkewWarning(projectRoot: string): string | null {
    const engineVersion = resolvePackageVersion('@tailwindcss/node', import.meta.url)
    const buildVersion = resolvePackageVersion(
        '@tailwindcss/vite',
        path.join(projectRoot, 'noop.js'),
    )
    if (engineVersion === null || buildVersion === null) {
        return null
    }
    return describeTailwindSkew(engineVersion, buildVersion)
}

/**
 * The pure comparison: same major.minor means the theme semantics match and any patch difference is irrelevant; a minor or major gap means the engine may resolve the theme differently than the build does.
 */
export function describeTailwindSkew(engineVersion: string, buildVersion: string): string | null {
    const engine = majorMinor(engineVersion)
    const build = majorMinor(buildVersion)
    if (engine === null || build === null || engine === build) {
        return null
    }
    return `[@tailwind-merge/vite] This package reads your theme with Tailwind ${engineVersion}, but your CSS is built by @tailwindcss/vite ${buildVersion}. The generated twMerge may not match your build — update ${engine < build ? '@tailwind-merge/vite (or refresh your lockfile) so both use Tailwind' : '@tailwindcss/vite to Tailwind'} ${engine < build ? build : engine}.x.`
}

function majorMinor(version: string): string | null {
    const match = /^(\d+)\.(\d+)\./.exec(version)
    return match === null ? null : `${match[1]}.${match[2]}`
}

/** Resolves the version of an installed package by finding its entry from `fromFile`'s resolution context and walking up to its package.json — `require.resolve('<name>/package.json')` is blocked by exports encapsulation for the Tailwind packages. */
function resolvePackageVersion(packageName: string, fromFile: string): string | null {
    try {
        const entryPath = createRequire(fromFile).resolve(packageName)
        let directory = path.dirname(entryPath)
        while (true) {
            try {
                const manifest = JSON.parse(
                    readFileSync(path.join(directory, 'package.json'), 'utf8'),
                ) as { name?: string; version?: string }
                if (manifest.name === packageName && typeof manifest.version === 'string') {
                    return manifest.version
                }
            } catch {
                // No package.json at this level — keep walking up.
            }
            const parent = path.dirname(directory)
            if (parent === directory) {
                return null
            }
            directory = parent
        }
    } catch {
        return null
    }
}
