// Turns the relative links in a package README into absolute GitHub links pinned to a git ref, so the README works on the npm package page, which cannot resolve `./docs/...` or `../../agents/...` paths. The repo keeps relative links in the README because they work on GitHub and are what the AGENTS.md link policy asks for inside the repo.
//
// Two callers, two refs: `stamp-dev-version.mjs` imports `pinReadmeLinks` and pins to the commit a dev build is published from; a package's `version` lifecycle runs this file as a CLI from the package directory, which pins to the release tag `<name>@<version>` being created and stages the README so the version commit carries it. Both leave links that are already absolute alone — those are maintained by `update-pinned-links.mjs`.
//
// Every target is verified against the working tree so a stale link fails the publish instead of shipping a 404. Image links use the raw endpoint so they render on npm.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_URL = 'https://github.com/dcastil/tailwind-merge'

/**
 * Rewrites README.md in `packageDir` in place. Returns the number of rewritten links; zero means the file was left untouched (or does not exist).
 *
 * @param {{ repoRoot: string, packageDir: string, ref: string }} options
 */
export function pinReadmeLinks({ repoRoot, packageDir, ref }) {
    const readmePath = path.join(packageDir, 'README.md')
    if (!fs.existsSync(readmePath)) return 0

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
                throw new Error(
                    `README link ${relativeTarget} does not resolve inside the repository`,
                )
            }

            rewriteCount++
            const endpoint = imagePrefix ? 'raw' : 'blob'
            return `${imagePrefix}](${REPOSITORY_URL}/${endpoint}/${ref}/${repoPath}${fragment})`
        },
    )

    if (rewriteCount > 0) {
        fs.writeFileSync(readmePath, rewritten)
    }

    return rewriteCount
}

const isRunAsCli =
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isRunAsCli) {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const packageDir = process.cwd()
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
    const ref = `${manifest.name}@${manifest.version}`

    try {
        const rewriteCount = pinReadmeLinks({ repoRoot, packageDir, ref })

        if (rewriteCount > 0) {
            // The version lifecycle runs before pnpm commits, and pnpm stages only the manifest, so the README has to be staged here like the other version-time rewrites.
            execFileSync('git', ['add', path.join(packageDir, 'README.md')], { cwd: repoRoot })
        }

        console.log(`[pin-readme-links] Pinned ${rewriteCount} relative README link(s) to ${ref}`)
    } catch (error) {
        console.error(`[pin-readme-links] ${error instanceof Error ? error.message : error}`)
        process.exit(1)
    }
}
