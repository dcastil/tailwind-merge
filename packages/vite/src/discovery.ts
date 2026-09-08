import { readFile, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
    type TailwindIntegration,
    createStylesheetResolver,
    cssStatements,
} from '@tailwind-merge/configurator'

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
    // Graph identities use real paths: a symlinked Vite root and resolved imports can spell the same file differently. Keep scanned paths for import resolution, the selected entrypoint, and root-relative diagnostics.
    const candidates = new Map<string, string>()
    const statementsByFile = new Map<string, string[] | null>()

    for (const file of await collectCssFiles(root)) {
        const identity = await realpath(file).catch(() => file)
        const statements = await readStatements(file)
        statementsByFile.set(identity, statements)
        if (statements?.some((statement) => ROOT_MARKER_RE.test(statement))) {
            candidates.set(identity, file)
        }
    }

    if (candidates.size === 0) {
        return null
    }

    const importedByCandidate = new Set<string>()
    const resolveImport = createStylesheetResolver(resolveCss)
    const pending = [...candidates]
    const visited = new Set<string>()
    while (pending.length > 0) {
        const [identity, file] = pending.pop()!
        if (visited.has(identity)) {
            continue
        }
        visited.add(identity)
        // Import-only intermediates are not candidates, but can lead to one. Read explicit imports outside the initial scan too, and cache misses as well as successful reads.
        if (!statementsByFile.has(identity)) {
            statementsByFile.set(identity, await readStatements(file))
        }
        const statements = statementsByFile.get(identity)
        if (statements === null || statements === undefined) {
            continue
        }
        for (const statement of statements) {
            const match = CSS_IMPORT_RE.exec(statement)
            if (!match) {
                continue
            }
            // Use generation's resolver even after alias expansion: the result may still name a directory with a package style entry. Missing imports cannot add graph edges; generation owns their errors and recovery dependencies.
            const target = await resolveImport(match[1] as string, path.dirname(file)).catch(
                () => null,
            )
            if (target !== null) {
                const targetIdentity = await realpath(target).catch(() => target)
                importedByCandidate.add(targetIdentity)
                pending.push([targetIdentity, target])
            }
        }
    }

    const roots = [...candidates]
        .filter(([identity]) => !importedByCandidate.has(identity))
        .map(([, file]) => file)
    if (roots.length === 1) {
        return roots[0] as string
    }

    const listed = (roots.length > 1 ? roots : [...candidates.values()])
        .map((file) => `  - ${path.relative(root, file)}`)
        .join('\n')
    throw new Error(
        `[@tailwind-merge/vite] Found multiple Tailwind CSS roots and cannot decide which one configures tailwind-merge:\n${listed}\nSet the plugin's \`css\` option to the entrypoint that defines your theme.`,
    )
}

/** Matches active statements that can mark a Tailwind v4 root: the `tailwindcss` import (or one of its sub-imports) or Tailwind's own at-rules, `@source` included — an app entrypoint may add nothing but source directives on top of an imported shared theme, and the pruning scanner only sees the directives of the compiled root. Anchoring excludes directive-like text inside selectors and declaration values. */
const ROOT_MARKER_RE =
    /^@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']|^@(?:theme|config|plugin|tailwind|utility|custom-variant|source)(?:\s|$)/

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
