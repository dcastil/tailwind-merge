import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { type TailwindIntegration, cssStatements } from '@tailwind-merge/configurator'

/**
 * Finds the project's Tailwind CSS entrypoint by scanning the Vite root for CSS files with Tailwind root markers.
 *
 * The scan is eager and filesystem-based on purpose: `@tailwindcss/vite` discovers roots lazily from the module graph, but the virtual runtime module can be requested before any CSS has flowed through the pipeline, so this plugin must know the root up front.
 *
 * When several files carry markers, files transitively `@import`ed by another candidate are dropped — a root is the top of its own import graph (a multi-file theme's token and utility layers all contain `@theme`/`@utility` markers of their own). Follow import-only intermediates, including explicit paths outside the scan root, and visit each file once to bound shared dependencies and cycles. More than one root after that is a hard error asking for the `css` option; none found returns null and the caller falls back to default tailwind-merge behavior.
 */
export async function discoverCssRoot(
    root: string,
    resolveCss?: TailwindIntegration['resolveCss'],
): Promise<string | null> {
    const candidates = new Set<string>()
    const statementsByFile = new Map<string, string[] | null>()

    for (const file of await collectCssFiles(root)) {
        const statements = await readStatements(file)
        statementsByFile.set(file, statements)
        if (statements?.some((statement) => ROOT_MARKER_RE.test(statement))) {
            candidates.add(file)
        }
    }

    if (candidates.size === 0) {
        return null
    }

    const importedByCandidate = new Set<string>()
    const pending = [...candidates]
    const visited = new Set<string>()
    while (pending.length > 0) {
        const file = pending.pop()!
        if (visited.has(file)) {
            continue
        }
        visited.add(file)
        // Import-only intermediates are not candidates, but can lead to one. Read explicit imports outside the initial scan too, and cache misses as well as successful reads.
        if (!statementsByFile.has(file)) {
            statementsByFile.set(file, await readStatements(file))
        }
        const statements = statementsByFile.get(file)
        if (statements === null || statements === undefined) {
            continue
        }
        for (const statement of statements) {
            const match = CSS_IMPORT_RE.exec(statement)
            if (!match) {
                continue
            }
            const base = path.dirname(file)
            const specifier = match[1] as string
            const target = await resolveCssImport(base, (await resolveCss?.(specifier, base)) || specifier)
            if (target !== null) {
                importedByCandidate.add(target)
                pending.push(target)
            }
        }
    }

    const roots = [...candidates].filter((file) => !importedByCandidate.has(file))
    if (roots.length === 1) {
        return roots[0] as string
    }

    const listed = (roots.length > 1 ? roots : [...candidates])
        .map((file) => `  - ${path.relative(root, file)}`)
        .join('\n')
    throw new Error(
        `[@tailwind-merge/vite] Found multiple Tailwind CSS roots and cannot decide which one configures tailwind-merge:\n${listed}\nSet the plugin's \`css\` option to the entrypoint that defines your theme.`,
    )
}

/** Matches active statements that can mark a Tailwind v4 root: the `tailwindcss` import (or one of its sub-imports) or Tailwind's own at-rules. Anchoring excludes directive-like text inside selectors and declaration values. */
const ROOT_MARKER_RE =
    /^@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']|^@(?:theme|config|plugin|tailwind|utility|custom-variant)(?:\s|$)/

const CSS_IMPORT_RE = /^@import\s+(?:url\(\s*)?["']([^"']+)["']/

/** Tokenize each stylesheet once so marker detection and import traversal share the same comment/string boundaries. Missing or unreadable files cannot contribute discovery candidates. */
async function readStatements(file: string): Promise<string[] | null> {
    const content = await readFile(file, 'utf-8').catch(() => null)
    return content === null ? null : [...cssStatements(content)]
}

/** Directories that never contain the project's own Tailwind entrypoint. Dot-directories (.git, .next, .svelte-kit, …) are skipped wholesale in the walk. */
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'public'])

const CSS_EXTENSIONS = new Set(['.css', '.pcss', '.postcss'])

/** Limit the eager scan to plain-CSS filenames supported by Vite. Following explicit imports is separate and does not impose an extension requirement. */
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
            } else if (entry.isFile() && CSS_EXTENSIONS.has(path.extname(entry.name))) {
                files.push(path.join(directory, entry.name))
            }
        }),
    )

    return files
}

/**
 * Resolves a local CSS `@import` for the candidate graph when the integration resolver declines. Prefer an existing file regardless of extension, then try Tailwind's implicit `.css` suffix; otherwise mixed-extension and extensionless intermediates disconnect imported candidates from their root.
 */
async function resolveCssImport(fromDirectory: string, specifier: string): Promise<string | null> {
    if (specifier.startsWith('tailwindcss')) {
        return null
    }
    const resolved = path.resolve(fromDirectory, specifier)
    const exists = await stat(resolved).then((entry) => entry.isFile()).catch(() => false)
    return exists ? resolved : `${resolved}.css`
}
