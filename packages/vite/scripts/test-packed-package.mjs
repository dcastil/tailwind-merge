import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

/**
 * Release gate for the published package shape, the packed-tarball counterpart of the library's test:exports. The vitest suite proves plugin behavior from source; this script proves the claims only the packed artifact can carry: `pnpm pack` swaps the dist exports in from publishConfig (the workspace exports point at src/ so tests stay buildless), every export target ships in the tarball, the three subpaths resolve and run from a consumer install layout, and a consumer project type-checks against the bundled declarations plus the library's published types.
 *
 * Packing runs through pnpm deliberately: applying `publishConfig.exports` at pack time is pnpm behavior that npm does not share, which also means the npm-publish workflow must publish this package with pnpm rather than `npm publish` once its release wiring lands.
 *
 * Wired as `pnpm --filter @tailwind-merge/vite test:exports`. Expects this package and the library to be built first; the scratch directory is kept for inspection when a check fails.
 */

const run = promisify(execFile)

const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const workspaceRoot = path.resolve(packageDirectory, '../..')
const libraryDirectory = path.join(workspaceRoot, 'packages', 'tailwind-merge')

assertPrerequisites()

const scratchDirectory = await mkdtemp(path.join(os.tmpdir(), 'tailwind-merge-vite-pack-'))
let failed = false

try {
    const tarballPath = await packPackage()
    const entries = await assertTarballLayout(tarballPath)
    await extractAndAssertManifest(tarballPath, entries)
    const consumerDirectory = await createConsumerInstall()
    await assertRuntimeImports(consumerDirectory)
    await assertConsumerTypes(consumerDirectory)
    console.log(
        '[@tailwind-merge/vite] Packed-package checks passed: tarball layout, dist exports, runtime imports, consumer types.',
    )
} catch (error) {
    failed = true
    console.error(
        `[@tailwind-merge/vite] Packed-package checks failed. Scratch directory kept for inspection: ${scratchDirectory}`,
    )
    throw error
} finally {
    if (!failed) {
        await rm(scratchDirectory, { recursive: true, force: true })
    }
}

/** Both builds must exist up front: the tarball ships this package's dist, and the consumer checks resolve tailwind-merge through its published shape (dist + types), not the workspace source aliases the vitest suite uses. */
function assertPrerequisites() {
    if (!existsSync(path.join(packageDirectory, 'dist', 'index.mjs'))) {
        exitWithSetupError('Build this package first: pnpm --filter @tailwind-merge/vite build')
    }
    if (
        !existsSync(path.join(libraryDirectory, 'dist', 'bundle-mjs.mjs')) ||
        !existsSync(path.join(libraryDirectory, 'dist', 'types.d.ts'))
    ) {
        exitWithSetupError(
            'Build the library first: pnpm --filter tailwind-merge build — the packed package resolves tailwind-merge through its published dist and types.',
        )
    }
}

/** Packs this package into the scratch directory and returns the tarball path derived from the manifest, so the check does not depend on pnpm's console output format. */
async function packPackage() {
    await run('pnpm', ['pack', '--pack-destination', scratchDirectory], { cwd: packageDirectory })
    const manifest = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'))
    const tarballName = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
    const tarballPath = path.join(scratchDirectory, tarballName)
    assert.ok(existsSync(tarballPath), `pnpm pack did not produce the expected tarball ${tarballName}`)
    return tarballPath
}

/** Asserts the tarball's file list: the complete dist set, the entry sources, the standard package files — and none of the development files (tests, docs, tool configs) that must stay out of the npm artifact. Returns the entry list for the manifest checks. */
async function assertTarballLayout(tarballPath) {
    const { stdout } = await run('tar', ['-tzf', tarballPath])
    const entries = stdout.split('\n').filter(Boolean).sort()

    const expectedDistFiles = [
        'index.d.mts',
        'index.d.mts.map',
        'index.mjs',
        'index.mjs.map',
        'runtime.d.mts',
        'runtime.mjs',
        'tailwind-merge.d.mts',
        'tailwind-merge.mjs',
    ]
    assert.deepEqual(
        entries.filter((entry) => entry.startsWith('package/dist/')).map((entry) => entry.slice('package/dist/'.length)),
        expectedDistFiles,
        'dist/ in the tarball must contain exactly the expected build outputs',
    )

    for (const required of [
        'package/LICENSE.md',
        'package/README.md',
        'package/package.json',
        'package/src/index.ts',
        'package/src/runtime.ts',
        'package/src/tailwind-merge.ts',
    ]) {
        assert.ok(entries.includes(required), `tarball is missing ${required}`)
    }

    const forbiddenPatterns = [
        'package/tests/',
        'package/docs/',
        'package/node_modules/',
        'package/tsconfig.json',
        'package/tsdown.config.ts',
        'package/vitest.config.mts',
        'package/eslint.config.mjs',
        'package/.npmrc',
    ]
    for (const entry of entries) {
        for (const forbidden of forbiddenPatterns) {
            assert.ok(
                !entry.startsWith(forbidden),
                `tarball must not ship development file ${entry}`,
            )
        }
    }

    return entries
}

/** Extracts the tarball and asserts the packed manifest: pnpm must have swapped the dist exports in from publishConfig (npm publish would not — the publish workflow has to use pnpm for this package), every export target must actually ship, the dependency set must be exactly the declared runtime dependencies with all workspace: protocols rewritten, and the inlined configurator must not appear as a dependency. */
async function extractAndAssertManifest(tarballPath, entries) {
    await run('tar', ['-xzf', tarballPath, '-C', scratchDirectory])
    const packed = JSON.parse(
        await readFile(path.join(scratchDirectory, 'package', 'package.json'), 'utf8'),
    )
    const source = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'))

    assert.equal(packed.name, '@tailwind-merge/vite')
    assert.equal(packed.type, 'module')
    assert.equal(packed.sideEffects, false)

    assert.deepEqual(
        packed.exports,
        source.publishConfig.exports,
        'packed exports must be the publishConfig.exports dist mapping — if they point at src/, pnpm did not apply the publish-time swap',
    )
    for (const conditions of Object.values(packed.exports)) {
        for (const target of Object.values(conditions)) {
            const entry = `package/${target.replace('./', '')}`
            assert.ok(entries.includes(entry), `exports target ${target} is not in the tarball`)
        }
    }

    assert.deepEqual(
        Object.keys(packed.dependencies).sort(),
        ['@tailwindcss/node', 'tailwind-merge'],
        'runtime dependencies must be exactly the two external packages — the configurator is inlined and must not be depended on',
    )
    assert.deepEqual(Object.keys(packed.peerDependencies).sort(), [
        '@tailwindcss/vite',
        'tailwindcss',
        'vite',
    ])
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [dependency, range] of Object.entries(packed[field] ?? {})) {
            assert.ok(
                !String(range).includes('workspace:'),
                `${field}.${dependency} still uses the workspace: protocol — pack must rewrite it to a real version`,
            )
        }
    }
}

/**
 * Lays the extracted package out as a consumer install: the real directory moves into a scratch node_modules (Node resolves a package's own imports from its real location, so the tarball content must sit inside the consumer tree, not be symlinked into it), with the workspace library and the Tailwind compiler linked next to it the way a package manager would install them. The scratch consumer lives in the OS temp directory so nothing can accidentally resolve through the workspace's node_modules — every resolution this layout serves is one the published package is entitled to.
 */
async function createConsumerInstall() {
    const consumerDirectory = path.join(scratchDirectory, 'consumer')
    const scopeDirectory = path.join(consumerDirectory, 'node_modules', '@tailwind-merge')
    await mkdir(scopeDirectory, { recursive: true })
    await rename(path.join(scratchDirectory, 'package'), path.join(scopeDirectory, 'vite'))
    await symlink(libraryDirectory, path.join(consumerDirectory, 'node_modules', 'tailwind-merge'))
    const tailwindNodeDirectory = path.join(consumerDirectory, 'node_modules', '@tailwindcss')
    await mkdir(tailwindNodeDirectory, { recursive: true })
    await symlink(
        path.join(packageDirectory, 'node_modules', '@tailwindcss', 'node'),
        path.join(tailwindNodeDirectory, 'node'),
    )
    return consumerDirectory
}

/** Imports all three subpaths from inside the consumer through ordinary package resolution — the exports map, the bundled plugin's own imports (including tailwind-merge/unstable-do-not-import against the built library), and the runtime surface all have to hold up outside the workspace. */
async function assertRuntimeImports(consumerDirectory) {
    const checkFile = path.join(consumerDirectory, 'check.mjs')
    await writeFile(
        checkFile,
        `import assert from 'node:assert/strict'

const plugin = await import('@tailwind-merge/vite')
assert.equal(typeof plugin.default, 'function')
const instance = plugin.default()
assert.equal(instance.name, '@tailwind-merge/vite')
// Without enforce: 'pre', Vite's core resolver would win over the plugin's redirect and silently serve the fallback everywhere.
assert.equal(instance.enforce, 'pre')

const runtime = await import('@tailwind-merge/vite/runtime')
assert.deepEqual(Object.keys(runtime).sort(), [
    'createTailwindMerge',
    'extendTailwindMerge',
    'getConfig',
    'mergeConfigs',
    'twJoin',
    'twMerge',
    'validators',
])
assert.equal(
    runtime.twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]'),
    'hover:bg-dark-red p-3 bg-[#B91C1C]',
)
const custom = runtime.extendTailwindMerge({ extend: { classGroups: { pixel: ['pixel'] } } })
assert.equal(custom('p-2 p-4'), 'p-4')

const internal = await import('@tailwind-merge/vite/tailwind-merge')
assert.equal(internal.twMerge('p-2 p-4'), 'p-4')
assert.equal(typeof internal.getDefaultConfig, 'function')
`,
    )
    await run(process.execPath, [checkFile], { cwd: consumerDirectory }).catch((error) => {
        throw new Error(`Runtime import checks failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
    })
}

/** The packed variant of the consumer-types fixture (same main.ts, single source of truth): type-checking resolves the subpath to the bundled .d.mts and tailwind-merge to its published types through the consumer's node_modules — no paths substitutions anywhere, unlike the in-suite fixture that runs against workspace source. */
async function assertConsumerTypes(consumerDirectory) {
    await cp(
        path.join(packageDirectory, 'tests', 'fixtures', 'consumer-types', 'main.ts'),
        path.join(consumerDirectory, 'main.ts'),
    )
    await writeFile(
        path.join(consumerDirectory, 'tsconfig.json'),
        JSON.stringify(
            {
                compilerOptions: {
                    strict: true,
                    module: 'ESNext',
                    moduleResolution: 'Bundler',
                    target: 'ESNext',
                    noEmit: true,
                },
                include: ['main.ts'],
            },
            null,
            4,
        ),
    )
    const tscBin = path.join(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc')
    await run(process.execPath, [tscBin, '-p', consumerDirectory]).catch((error) => {
        throw new Error(`Consumer type check failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
    })
}

/** A missing build is a setup problem, not a failed check: print the command to run instead of a stack trace. */
function exitWithSetupError(message) {
    console.error(`[@tailwind-merge/vite] ${message}`)
    process.exit(1)
}
