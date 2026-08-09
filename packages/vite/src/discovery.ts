import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

/**
 * Finds the project's Tailwind CSS entrypoint by scanning the Vite root for CSS files with Tailwind root markers.
 *
 * The scan is eager and filesystem-based on purpose: `@tailwindcss/vite` discovers roots lazily from the module graph, but the virtual runtime module can be requested before any CSS has flowed through the pipeline, so this plugin must know the root up front (PROPOSAL.md §11.4).
 *
 * When several files carry markers, files `@import`ed by another candidate are dropped — a root is the top of its own import graph (a multi-file theme's token and utility layers all contain `@theme`/`@utility` markers of their own). More than one root after that is a hard error asking for the `css` option; none found returns null and the caller falls back to default tailwind-merge behavior.
 */
export async function discoverCssRoot(root: string): Promise<string | null> {
    const candidates = new Map<string, string>()

    for (const file of await collectCssFiles(root)) {
        const content = await readFile(file, 'utf-8').catch(() => null)
        if (content !== null && ROOT_MARKER_RE.test(content)) {
            candidates.set(file, content)
        }
    }

    if (candidates.size === 0) {
        return null
    }

    const importedByCandidate = new Set<string>()
    for (const [file, content] of candidates) {
        for (const match of content.matchAll(CSS_IMPORT_RE)) {
            const target = resolveCssImport(path.dirname(file), match[1] as string)
            if (target !== null && candidates.has(target)) {
                importedByCandidate.add(target)
            }
        }
    }

    const roots = Array.from(candidates.keys()).filter((file) => !importedByCandidate.has(file))
    if (roots.length === 1) {
        return roots[0] as string
    }

    const listed = (roots.length > 1 ? roots : Array.from(candidates.keys()))
        .map((file) => `  - ${path.relative(root, file)}`)
        .join('\n')
    throw new Error(
        `[@tailwind-merge/vite] Found multiple Tailwind CSS roots and cannot decide which one configures tailwind-merge:\n${listed}\nSet the plugin's \`css\` option to the entrypoint that defines your theme.`,
    )
}

/** Matches files that can act as a Tailwind v4 root: the `tailwindcss` import (or one of its sub-imports) or Tailwind's own at-rules. */
const ROOT_MARKER_RE =
    /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']|@(?:theme|config|plugin|tailwind|utility)\b/

const CSS_IMPORT_RE = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g

/** Directories that never contain the project's own Tailwind entrypoint. Dot-directories (.git, .next, .svelte-kit, …) are skipped wholesale in the walk. */
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'public'])

async function collectCssFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
    const files: string[] = []

    await Promise.all(
        entries.map(async (entry) => {
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(entry.name)) {
                    return
                }
                files.push(...(await collectCssFiles(path.join(directory, entry.name))))
            } else if (entry.isFile() && entry.name.endsWith('.css')) {
                files.push(path.join(directory, entry.name))
            }
        }),
    )

    return files
}

/**
 * Resolves a CSS `@import` specifier to an absolute path for the candidate graph. Only path-like specifiers matter here — package imports (like `tailwindcss` itself) can never point at a project candidate — and CSS allows omitting both the leading `./` and the `.css` extension.
 */
function resolveCssImport(fromDirectory: string, specifier: string): string | null {
    if (specifier.startsWith('tailwindcss')) {
        return null
    }
    const resolved = path.resolve(fromDirectory, specifier)
    return path.extname(resolved) === '.css' ? resolved : `${resolved}.css`
}
