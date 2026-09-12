// Prepares a workspace package for a dev publish. Runs from the package directory (cwd = the package), like update-pinned-links.mjs, and rewrites files in place: the caller publishes the stamped package afterwards and discards the changes (CI checkouts are disposable; locally, restore the files from git).
//
// What it changes and why:
// - `version` becomes `<version>-dev.<sha>`: the manifest version is the last release the dev build corresponds to, the SHA identifies the exact commit, as documented in the library's versioning docs.
// - Runtime dependencies on workspace packages (`workspace:` protocol) are pinned to the exact same-SHA dev version of that package instead of the caret range pnpm would derive from the manifest version. A dev build of the vite plugin bundles the configurator, which imports tailwind-merge's unstable entry point; resolving that to a registry release could hand it a library lacking the internals the same commit changed. An exact pin keeps every dev build self-consistent, at the cost of a second library copy next to an app's own stable one.
// - Relative links in README.md become absolute GitHub links pinned to the commit, so the npm package page can resolve them. The repo README keeps relative links, which work on GitHub and are what the AGENTS.md link policy asks for inside the repo.
//
// `--check-registry` additionally verifies that every pinned dependency version exists on the registry. Use it for a local publish: the library's dev release for the same commit must already be on npm, which only happens after the commit was pushed to main and the publish workflow ran. CI publishes the library moments before the plugin in the same job and skips the check.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = process.cwd()
const checkRegistry = process.argv.includes('--check-registry')

const REPOSITORY_URL = 'https://github.com/dcastil/tailwind-merge'
const REGISTRY_URL = 'https://registry.npmjs.org'

const sha = resolveSha()
const manifestPath = path.join(packageDir, 'package.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const devVersion = `${manifest.version}-dev.${sha}`

log(`Stamping ${manifest.name}@${devVersion}`)

manifest.version = devVersion

const workspaceVersions = readWorkspacePackageVersions()
const pinnedDependencies = []

for (const [dependencyName, range] of Object.entries(manifest.dependencies ?? {})) {
    if (!String(range).startsWith('workspace:')) continue

    const dependencyVersion = workspaceVersions.get(dependencyName)
    if (!dependencyVersion) {
        fail(`${dependencyName} uses the workspace protocol but is not a workspace package`)
    }

    const pinnedVersion = `${dependencyVersion}-dev.${sha}`
    manifest.dependencies[dependencyName] = pinnedVersion
    pinnedDependencies.push({ name: dependencyName, version: pinnedVersion })
    log(`Pinned ${dependencyName} to ${pinnedVersion}`)
}

if (checkRegistry) {
    for (const dependency of pinnedDependencies) {
        await assertPublished(dependency.name, dependency.version)
    }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)

rewriteReadmeLinks()

/**
 * The commit the dev build is published for: the workflow's SHA in CI, HEAD locally. A local publish must run on the pushed commit, otherwise the pinned library dev version and the README links point at a commit npm and GitHub never saw.
 */
function resolveSha() {
    const candidate =
        process.env.GITHUB_SHA ||
        execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()

    if (!/^[0-9a-f]{40}$/.test(candidate)) {
        fail(`Expected a full commit SHA, got ${JSON.stringify(candidate)}`)
    }

    return candidate
}

/** Maps every workspace package name under packages/ to its manifest version. */
function readWorkspacePackageVersions() {
    const packagesDir = path.join(repoRoot, 'packages')
    const versions = new Map()

    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue

        const packageManifestPath = path.join(packagesDir, entry.name, 'package.json')
        if (!fs.existsSync(packageManifestPath)) continue

        const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf8'))
        versions.set(packageManifest.name, packageManifest.version)
    }

    return versions
}

async function assertPublished(name, version) {
    const response = await fetch(`${REGISTRY_URL}/${name}/${version}`)

    if (response.status === 404) {
        fail(
            `${name}@${version} is not on the registry. A local dev publish needs the same-commit dev release of every pinned workspace dependency; push the commit, let the publish workflow finish, then rerun.`,
        )
    }

    if (!response.ok) {
        fail(`Registry lookup for ${name}@${version} failed with status ${response.status}`)
    }

    log(`Verified ${name}@${version} exists on the registry`)
}

/**
 * Turns `](./docs/x.md)` and `](../../agents/x.md)` style links into absolute links pinned to the commit. Every target is verified against the working tree so a stale link fails the publish instead of shipping a 404. Image links use the raw endpoint so they render on npm.
 */
function rewriteReadmeLinks() {
    const readmePath = path.join(packageDir, 'README.md')
    if (!fs.existsSync(readmePath)) return

    const packageRelativeDir = path.relative(repoRoot, packageDir).split(path.sep).join('/')
    const original = fs.readFileSync(readmePath, 'utf8')
    let rewriteCount = 0

    const rewritten = original.replace(
        /(!?)\]\((\.{1,2}\/[^)#\s]+)(#[^)\s]*)?\)/g,
        (match, imagePrefix, relativeTarget, fragment = '') => {
            const repoPath = path.posix.normalize(
                path.posix.join(packageRelativeDir, relativeTarget),
            )

            if (repoPath.startsWith('..') || !fs.existsSync(path.join(repoRoot, repoPath))) {
                fail(`README link ${relativeTarget} does not resolve inside the repository`)
            }

            rewriteCount++
            const endpoint = imagePrefix ? 'raw' : 'blob'
            return `${imagePrefix}](${REPOSITORY_URL}/${endpoint}/${sha}/${repoPath}${fragment})`
        },
    )

    if (rewriteCount > 0) {
        fs.writeFileSync(readmePath, rewritten)
        log(`Rewrote ${rewriteCount} relative README link(s) to commit-pinned links`)
    }
}

function log(message) {
    console.log(`[stamp-dev-version] ${message}`)
}

function fail(message) {
    console.error(`[stamp-dev-version] ${message}`)
    process.exit(1)
}
