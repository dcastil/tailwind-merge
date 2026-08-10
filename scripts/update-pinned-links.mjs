// Re-pins tag-pinned GitHub file links when a package releases. Runs from a package directory as
// part of its `version` lifecycle (cwd = the package, manifest already carries the new version).
//
// Model: absolute links into this repo are pinned to release tags per the AGENTS.md link policy.
// Links that should track the latest release of a package are, by construction, pinned to that
// package's newest existing tag — this script rewrites exactly those, repo-wide, to the tag the
// running release is about to create. Links pinned to older tags are deliberately historical
// (changelogs, migration guides, old threads) and are never touched.
//
// Every rewritten link is verified against the working tree, which is what the new tag will
// contain. A path that no longer exists fails the version step loudly so a release can never
// re-pin links onto targets that do not resolve; re-pin such links to an old tag by hand (making
// them historical) or fix their paths, then rerun. Paths that lived at the repo root before the
// monorepo migration are remapped into the package directory automatically.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = process.cwd()

// Tags without a package prefix (v3.6.0 and earlier) are the pre-monorepo history and belong to tailwind-merge, mirroring the fallback in the release-commenter action.
const LEGACY_TAG_OWNER = 'tailwind-merge'

const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
const newTag = `${manifest.name}@${manifest.version}`

const previousTag = findPreviousTag(manifest.name)
if (!previousTag) {
    console.log(`[update-pinned-links] No previous release tag for ${manifest.name} — nothing to re-pin.`)
    process.exit(0)
}

console.log(`[update-pinned-links] Re-pinning links from ${previousTag} to ${newTag}`)

// Matches the pinned-link forms the repo uses: github.com blob/raw/tree URLs and raw.githubusercontent.com URLs. The path capture stops at characters that end a URL in Markdown or code; fragments and queries stay in place untouched.
const linkRegex = new RegExp(
    `(https?://(?:www\\.)?(?:github\\.com/dcastil/tailwind-merge/(?:blob|raw|tree)|raw\\.githubusercontent\\.com/dcastil/tailwind-merge))/${escapeRegex(previousTag)}/([^\\s)\\]"'\`<>*\\\\#?]*)`,
    'g',
)

const trackedFiles = findFilesMentioning(previousTag)

// Two passes so a failure leaves the working tree untouched: first compute every replacement and collect unresolvable links, then write only when the whole run is clean.
const unresolvedLinks = []
const pendingWrites = []

for (const file of trackedFiles) {
    const filePath = path.join(repoRoot, file)
    const content = fs.readFileSync(filePath, 'utf8')

    const nextContent = content.replace(linkRegex, (match, base, linkedPath) => {
        const resolvedPath = resolveLinkedPath(linkedPath)
        if (resolvedPath === null) {
            unresolvedLinks.push(`${file}: ${match}`)
            return match
        }
        return `${base}/${newTag}/${resolvedPath}`
    })

    if (nextContent !== content) {
        pendingWrites.push({ file, filePath, nextContent })
    }
}

if (unresolvedLinks.length > 0) {
    console.error(
        `[update-pinned-links] ${unresolvedLinks.length} link(s) point at paths that do not exist in the tree the new tag will contain. Fix the paths or re-pin them to an old tag by hand, then rerun:\n${unresolvedLinks.join('\n')}`,
    )
    process.exit(1)
}

for (const { file, filePath, nextContent } of pendingWrites) {
    fs.writeFileSync(filePath, nextContent)
    execFileSync('git', ['add', file], { cwd: repoRoot })
    console.log(`[update-pinned-links] Updated ${file}`)
}

console.log(
    pendingWrites.length > 0
        ? `[update-pinned-links] Re-pinned links in ${pendingWrites.length} file(s).`
        : '[update-pinned-links] No links needed re-pinning.',
)

/**
 * Lists tracked text files mentioning the previous tag, as a cheap pre-filter for the link rewrite. git grep exits 1 when nothing matches, which is a normal outcome here.
 *
 * @param {string} tag
 * @returns {string[]}
 */
function findFilesMentioning(tag) {
    try {
        return execFileSync('git', ['grep', '-lI', '--fixed-strings', `/${tag}/`], {
            cwd: repoRoot,
            encoding: 'utf8',
        })
            .split('\n')
            .filter(Boolean)
    } catch (error) {
        if (error && typeof error === 'object' && error.status === 1) return []
        throw error
    }
}

/**
 * Finds the newest existing release tag of the given package by semver, including the un-prefixed legacy tags for the package that owns the pre-monorepo history. The tag for the running release does not exist yet (npm creates it after the version scripts), so the newest existing tag is the previous release.
 *
 * @param {string} packageName
 * @returns {string | null}
 */
function findPreviousTag(packageName) {
    const allTags = execFileSync('git', ['tag', '--list'], { cwd: repoRoot, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)

    const versionByTag = new Map()
    for (const tag of allTags) {
        let versionText = null
        if (tag.startsWith(`${packageName}@`)) {
            versionText = tag.slice(packageName.length + 1)
        } else if (packageName === LEGACY_TAG_OWNER && /^v\d/.test(tag)) {
            versionText = tag.slice(1)
        }
        if (!versionText) continue

        const match = versionText.match(/^(\d+)\.(\d+)\.(\d+)$/)
        if (!match) continue

        versionByTag.set(tag, match.slice(1, 4).map(Number))
    }

    let best = null
    for (const [tag, version] of versionByTag) {
        if (!best || compareVersions(version, best.version) > 0) {
            best = { tag, version }
        }
    }

    return best?.tag ?? null
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function compareVersions(a, b) {
    for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index]) return a[index] - b[index]
    }
    return 0
}

/**
 * Validates a linked path against the working tree, remapping pre-monorepo root paths into the package directory when the file moved there. Returns null when the path resolves nowhere.
 *
 * @param {string} linkedPath
 * @returns {string | null}
 */
function resolveLinkedPath(linkedPath) {
    const normalizedPath = linkedPath.replace(/\/+$/, '')
    if (normalizedPath === '') return ''
    if (fs.existsSync(path.join(repoRoot, normalizedPath))) return normalizedPath

    const packageDirRelative = path.relative(repoRoot, packageDir)
    const remappedPath = `${packageDirRelative}/${normalizedPath}`
    if (fs.existsSync(path.join(repoRoot, remappedPath))) return remappedPath

    return null
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
