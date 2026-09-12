// Release gate for the plugin's tailwind-merge dependency. The packed-tarball gate (test-packed-package.mjs) links the workspace library, so it cannot tell whether the tailwind-merge release a consumer will actually install ships the internals the bundled configurator imports from `tailwind-merge/unstable-do-not-import`: the workspace source can carry unreleased APIs while the manifest still names an older version, and `workspace:^` then packs to a caret range starting at that version. Dev builds sidestep the problem by pinning the same-commit dev library (stamp-dev-version.mjs); a stable release cannot, so this script resolves the range's lowest version, downloads that release from the registry, and checks every imported value and type against it.
//
// Runs in the release build job for plugin releases (`pnpm --filter @tailwind-merge/vite test:library-release`) and needs network access. `--library-version <version>` checks a specific release instead of the manifest-derived minimum, e.g. to confirm an older release really lacks something.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(packageDirectory, '..', '..')
const libraryDirectory = path.join(repoRoot, 'packages', 'tailwind-merge')
const configuratorDirectory = path.join(repoRoot, 'packages', 'configurator')

const LIBRARY_NAME = 'tailwind-merge'
const UNSTABLE_SUBPATH = './unstable-do-not-import'
const UNSTABLE_SPECIFIER = `${LIBRARY_NAME}/unstable-do-not-import`
const REGISTRY_URL = 'https://registry.npmjs.org'

const libraryVersion = readLibraryVersionArgument() ?? resolveMinimumLibraryVersion()
const requiredImports = collectUnstableImports([
    path.join(configuratorDirectory, 'src'),
    path.join(packageDirectory, 'src'),
])

log(
    `Checking ${LIBRARY_NAME}@${libraryVersion} for ${requiredImports.values.size} value import(s) and ${requiredImports.types.size} type import(s) from ${UNSTABLE_SPECIFIER}`,
)

const releaseManifest = await fetchReleaseManifest(libraryVersion)
const unstableExport = releaseManifest.exports?.[UNSTABLE_SUBPATH]
if (!unstableExport) {
    fail(`${LIBRARY_NAME}@${libraryVersion} does not export ${UNSTABLE_SUBPATH}`)
}

const scratchDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'twm-library-release-'))
const extractedPackage = await downloadAndExtract(releaseManifest.dist.tarball, scratchDirectory)
const missing = await findMissingImports(extractedPackage, unstableExport, requiredImports)
fs.rmSync(scratchDirectory, { recursive: true, force: true })

if (missing.length > 0) {
    fail(
        `${LIBRARY_NAME}@${libraryVersion} lacks: ${missing.join(', ')}. Release a library version that ships them before releasing the plugin, then bump the plugin's dependency range to it.`,
    )
}

log(
    `${LIBRARY_NAME}@${libraryVersion} ships everything the plugin imports from ${UNSTABLE_SPECIFIER}`,
)

function readLibraryVersionArgument() {
    const index = process.argv.indexOf('--library-version')
    if (index === -1) return null

    const version = process.argv[index + 1]
    if (!version) fail('--library-version needs a version argument')
    return version
}

/**
 * The lowest version a consumer can end up with. pnpm rewrites `workspace:^` / `workspace:~` / `workspace:*` to a range or exact version based on the linked manifest's version, so that version is the floor in every case; an explicit range in the manifest is supported for the common caret/tilde/exact spellings only.
 */
function resolveMinimumLibraryVersion() {
    const manifest = readJson(path.join(packageDirectory, 'package.json'))
    const range = manifest.dependencies?.[LIBRARY_NAME]
    if (!range) fail(`${LIBRARY_NAME} is not a dependency of ${manifest.name}`)

    if (range.startsWith('workspace:')) {
        return readJson(path.join(libraryDirectory, 'package.json')).version
    }

    const exact = range.replace(/^[\^~=]/, '')
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(exact)) {
        fail(`Cannot derive a minimum version from the dependency range ${JSON.stringify(range)}`)
    }
    return exact
}

/**
 * Collects the names imported from the unstable entry point across the given source trees, split into runtime values and type-only names, which are checked differently against the release.
 */
function collectUnstableImports(sourceDirectories) {
    const values = new Set()
    const types = new Set()
    const importPattern = new RegExp(
        `import\\s+(type\\s+)?\\{([^}]*)\\}\\s+from\\s+['"]${escapeRegex(UNSTABLE_SPECIFIER)}['"]`,
        'g',
    )

    for (const file of sourceDirectories.flatMap(listTypeScriptFiles)) {
        const source = fs.readFileSync(file, 'utf8')
        for (const match of source.matchAll(importPattern)) {
            const wholeImportIsTypeOnly = Boolean(match[1])
            for (const rawSpecifier of match[2].split(',')) {
                const specifier = rawSpecifier.trim()
                if (!specifier) continue

                const isTypeOnly = wholeImportIsTypeOnly || specifier.startsWith('type ')
                const importedName = specifier.replace(/^type\s+/, '').split(/\s+as\s+/)[0]
                ;(isTypeOnly ? types : values).add(importedName)
            }
        }
    }

    if (values.size === 0 && types.size === 0) {
        fail(`Found no imports from ${UNSTABLE_SPECIFIER}; the scan is looking in the wrong place`)
    }

    return { values, types }
}

function listTypeScriptFiles(directory) {
    return fs
        .readdirSync(directory, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && /\.(ts|mts)$/.test(entry.name))
        .map((entry) => path.join(entry.parentPath, entry.name))
}

async function fetchReleaseManifest(version) {
    const response = await fetch(`${REGISTRY_URL}/${LIBRARY_NAME}/${version}`)

    if (response.status === 404) {
        fail(
            `${LIBRARY_NAME}@${version} is not on the registry. The plugin's dependency range starts at a version that has not been released; release the library first.`,
        )
    }
    if (!response.ok) {
        fail(`Registry lookup for ${LIBRARY_NAME}@${version} failed with status ${response.status}`)
    }

    return response.json()
}

async function downloadAndExtract(tarballUrl, scratchDirectory) {
    const response = await fetch(tarballUrl)
    if (!response.ok) {
        fail(`Downloading ${tarballUrl} failed with status ${response.status}`)
    }

    const tarballPath = path.join(scratchDirectory, 'package.tgz')
    fs.writeFileSync(tarballPath, Buffer.from(await response.arrayBuffer()))
    execFileSync('tar', ['-xzf', tarballPath, '-C', scratchDirectory])

    return path.join(scratchDirectory, 'package')
}

/**
 * Values are checked by importing the released entry point, types by looking for their declaration in the shipped declaration file — the only check available without a compiler.
 */
async function findMissingImports(extractedPackage, unstableExport, requiredImports) {
    const missing = []

    const runtimeTarget = unstableExport.import ?? unstableExport.default
    const runtimeModule = await import(
        pathToFileURL(path.join(extractedPackage, runtimeTarget)).href
    )
    for (const name of requiredImports.values) {
        if (!(name in runtimeModule)) missing.push(name)
    }

    const declarations = fs.readFileSync(path.join(extractedPackage, unstableExport.types), 'utf8')
    for (const name of requiredImports.types) {
        if (!new RegExp(`\\b(type|interface)\\s+${escapeRegex(name)}\\b`).test(declarations)) {
            missing.push(`type ${name}`)
        }
    }

    return missing
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

function log(message) {
    console.log(`[check-library-release] ${message}`)
}

function fail(message) {
    console.error(`[check-library-release] ${message}`)
    process.exit(1)
}
