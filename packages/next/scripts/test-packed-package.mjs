import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

/**
 * Release gate for the published package shape, the packed-tarball counterpart of the library's test:exports and the Vite package's gate of the same name. The vitest suite proves plugin behavior against the workspace build; this script proves the claims only the packed artifact can carry: every export target ships in the tarball, the plugin entry and the runtime subpath resolve and run from a consumer install layout, the loader file the plugin points at exists next to them, a real `next build` from that layout serves the generated module, and a consumer project type-checks against the bundled declarations plus the library's published types.
 *
 * The consumer build runs with webpack: the scratch consumer lives in the OS temp directory with its dependencies linked into the workspace, and Turbopack refuses to resolve files outside the project root it infers (the vitest suite covers Turbopack from inside the workspace). Packing runs through pnpm like the publish workflow.
 *
 * Wired as `pnpm --filter @tailwind-merge/next test:exports`. Expects this package and the library to be built first; the scratch directory is kept for inspection when a check fails.
 */

const run = promisify(execFile)

const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const workspaceRoot = path.resolve(packageDirectory, '../..')
const libraryDirectory = path.join(workspaceRoot, 'packages', 'tailwind-merge')

assertPrerequisites()

const scratchDirectory = await mkdtemp(path.join(os.tmpdir(), 'tailwind-merge-next-pack-'))
let failed = false

try {
    const tarballPath = await packPackage()
    const entries = await assertTarballLayout(tarballPath)
    await extractAndAssertManifest(tarballPath, entries)
    const consumerDirectory = await createConsumerInstall()
    await assertRuntimeImports(consumerDirectory)
    await assertGeneratedRuntime(consumerDirectory)
    await assertConsumerTypes(consumerDirectory)
    console.log(
        '[@tailwind-merge/next] Packed-package checks passed: tarball layout, exports, runtime imports, generation through next build, consumer types.',
    )
} catch (error) {
    failed = true
    console.error(
        `[@tailwind-merge/next] Packed-package checks failed. Scratch directory kept for inspection: ${scratchDirectory}`,
    )
    throw error
} finally {
    if (!failed) {
        await rm(scratchDirectory, { recursive: true, force: true })
    }
}

/** Both builds must exist up front: the tarball ships this package's dist, and the consumer checks resolve tailwind-merge through its published shape (dist + types). */
function assertPrerequisites() {
    if (!existsSync(path.join(packageDirectory, 'dist', 'index.mjs'))) {
        exitWithSetupError('Build this package first: pnpm --filter @tailwind-merge/next build')
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
    assert.ok(
        existsSync(tarballPath),
        `pnpm pack did not produce the expected tarball ${tarballName}`,
    )
    return tarballPath
}

/** Asserts the tarball's file list: the complete dist set, the entry sources, the standard package files — and none of the development files (tests, docs, tool configs) that must stay out of the npm artifact. Returns the entry list for the manifest checks. */
async function assertTarballLayout(tarballPath) {
    const { stdout } = await run('tar', ['-tzf', tarballPath])
    const entries = stdout.split('\n').filter(Boolean).sort()

    // The declaration chunk shared by the plugin entry and the loader (both reference the option types) carries a content hash; the set of files is what matters.
    const distFiles = entries
        .filter((entry) => entry.startsWith('package/dist/'))
        .map((entry) =>
            entry
                .slice('package/dist/'.length)
                .replace(/^options-[\w-]+\.d\.mts/, 'options-[hash].d.mts'),
        )
    assert.deepEqual(
        distFiles,
        [
            'index.d.mts',
            'index.d.mts.map',
            'index.mjs',
            'index.mjs.map',
            'loader.d.mts',
            'loader.d.mts.map',
            'loader.mjs',
            'loader.mjs.map',
            'options-[hash].d.mts',
            'options-[hash].d.mts.map',
            'runtime.d.mts',
            'runtime.mjs',
            'runtime.mjs.map',
        ],
        'dist/ in the tarball must contain exactly the expected build outputs',
    )

    for (const required of [
        'package/LICENSE.md',
        'package/README.md',
        'package/package.json',
        'package/src/index.ts',
        'package/src/loader.ts',
        'package/src/options.ts',
        'package/src/runtime.ts',
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

/** Extracts the tarball and asserts the packed manifest: the exports map is the dist mapping the workspace already uses (no publish-time swap for this package), every export target ships, the runtime file is the one file marked side-effectful (Turbopack would otherwise skip a pure re-export module), the dependency set is exactly the declared runtime dependencies with all workspace: protocols rewritten, and the inlined plugin core and configurator do not appear as dependencies. */
async function extractAndAssertManifest(tarballPath, entries) {
    await run('tar', ['-xzf', tarballPath, '-C', scratchDirectory])
    const packed = JSON.parse(
        await readFile(path.join(scratchDirectory, 'package', 'package.json'), 'utf8'),
    )
    const source = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'))

    assert.equal(packed.name, '@tailwind-merge/next')
    assert.equal(packed.type, 'module')
    assert.deepEqual(packed.sideEffects, ['./dist/runtime.mjs'])

    assert.deepEqual(
        packed.exports,
        source.exports,
        'packed exports must equal the workspace exports (they already point at dist/)',
    )
    for (const conditions of Object.values(packed.exports)) {
        for (const target of Object.values(conditions)) {
            const entry = `package/${target.replace('./', '')}`
            assert.ok(entries.includes(entry), `exports target ${target} is not in the tarball`)
        }
    }
    // Not exported, but load-bearing: the plugin points both bundlers at this file by absolute path.
    assert.ok(entries.includes('package/dist/loader.mjs'), 'the loader must ship')

    assert.deepEqual(
        Object.keys(packed.dependencies).sort(),
        [
            '@tailwindcss/node',
            '@tailwindcss/oxide',
            'enhanced-resolve',
            'postcss',
            'tailwind-merge',
        ],
        'runtime dependencies must be exactly the declared external packages — the plugin core and configurator are inlined and must not be depended on',
    )
    assert.deepEqual(Object.keys(packed.peerDependencies).sort(), [
        '@tailwindcss/postcss',
        'next',
        'tailwindcss',
    ])
    for (const field of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
    ]) {
        for (const [dependency, range] of Object.entries(packed[field] ?? {})) {
            assert.ok(
                !String(range).includes('workspace:'),
                `${field}.${dependency} still uses the workspace: protocol — pack must rewrite it to a real version`,
            )
        }
    }
}

/**
 * Lays the extracted package out as a consumer install: the real directory moves into a scratch node_modules (Node resolves a package's own imports from its real location, so the tarball content must sit inside the consumer tree, not be symlinked into it), with the workspace library, the Tailwind packages, Next.js, and React linked next to it the way a package manager would install them. The scratch consumer lives in the OS temp directory so nothing can accidentally resolve through the workspace's node_modules — every resolution this layout serves is one the published package is entitled to.
 */
async function createConsumerInstall() {
    const consumerDirectory = path.join(scratchDirectory, 'consumer')
    const scopeDirectory = path.join(consumerDirectory, 'node_modules', '@tailwind-merge')
    await mkdir(scopeDirectory, { recursive: true })
    await rename(path.join(scratchDirectory, 'package'), path.join(scopeDirectory, 'next'))
    await symlink(libraryDirectory, path.join(consumerDirectory, 'node_modules', 'tailwind-merge'))
    const tailwindScopeDirectory = path.join(consumerDirectory, 'node_modules', '@tailwindcss')
    await mkdir(tailwindScopeDirectory, { recursive: true })
    for (const tailwindPackage of ['node', 'oxide', 'postcss']) {
        await symlink(
            path.join(packageDirectory, 'node_modules', '@tailwindcss', tailwindPackage),
            path.join(tailwindScopeDirectory, tailwindPackage),
        )
    }
    for (const dependency of [
        'enhanced-resolve',
        'postcss',
        'tailwindcss',
        'next',
        'react',
        'react-dom',
    ]) {
        await symlink(
            path.join(packageDirectory, 'node_modules', dependency),
            path.join(consumerDirectory, 'node_modules', dependency),
        )
    }
    return consumerDirectory
}

/** Imports both subpaths from inside the consumer through ordinary package resolution — the exports map, the config the plugin produces (pointing at a loader file that exists next to it), and the runtime surface all have to hold up outside the workspace. */
async function assertRuntimeImports(consumerDirectory) {
    const checkFile = path.join(consumerDirectory, 'check.mjs')
    await writeFile(
        checkFile,
        `import assert from 'node:assert/strict'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

const plugin = await import('@tailwind-merge/next')
assert.equal(typeof plugin.withTailwindMerge, 'function')
const config = plugin.withTailwindMerge({ reactStrictMode: true }, { prune: { log: false } })
assert.equal(config.reactStrictMode, true)
assert.deepEqual(config.transpilePackages, ['@tailwind-merge/next'])
const rules = config.turbopack.rules['*.mjs']
assert.equal(rules.length, 2)
const packageRoot = path.resolve('node_modules/@tailwind-merge/next')
for (const rule of rules) {
    const [{ loader, options }] = rule.loaders
    assert.equal(loader, path.join(packageRoot, 'dist', 'loader.mjs'))
    assert.ok(existsSync(loader), 'the loader must exist where the plugin points')
    assert.equal(options.log, false)
}
const webpackConfig = { module: { rules: [] } }
config.webpack(webpackConfig, { dev: false })
const [rule] = webpackConfig.module.rules
assert.ok(rule.test(realpathSync(path.join(packageRoot, 'dist', 'runtime.mjs'))), 'the webpack rule must match the installed runtime file')
assert.equal(rule.use[0].options.mode, 'build')

const runtime = await import('@tailwind-merge/next/runtime')
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
`,
    )
    await run(process.execPath, [checkFile], { cwd: consumerDirectory }).catch((error) => {
        throw new Error(`Runtime import checks failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
    })
}

/** Exercises generation from the packed plugin through a real `next build`: the loader runs in Next's own loader process, imports the compiler and scanner lazily from the consumer layout, and the prerendered page shows the theme-aware merge and the pruning to the inline safelist. */
async function assertGeneratedRuntime(consumerDirectory) {
    const app = path.join(consumerDirectory, 'app-fixture')
    await mkdir(path.join(app, 'app'), { recursive: true })
    await writeFile(
        path.join(app, 'package.json'),
        '{ "name": "packed-consumer", "private": true }\n',
    )
    // Turbopack applies loader rules to installed packages only with a tsconfig or jsconfig present; kept here for parity with real projects even though this build runs with webpack.
    await writeFile(path.join(app, 'jsconfig.json'), '{}\n')
    await writeFile(
        path.join(app, 'next.config.mjs'),
        "import { withTailwindMerge } from '@tailwind-merge/next'\n\nexport default withTailwindMerge({ agentRules: false })\n",
    )
    await writeFile(
        path.join(app, 'postcss.config.mjs'),
        "export default { plugins: { '@tailwindcss/postcss': {} } }\n",
    )
    await writeFile(
        path.join(app, 'app', 'globals.css'),
        "@import 'tailwindcss' source(none);\n@theme { --text-huge: 2.5rem; }\n@source inline('text-huge text-sm');\n",
    )
    await writeFile(
        path.join(app, 'app', 'layout.jsx'),
        'import \'./globals.css\'\n\nexport default function RootLayout({ children }) {\n    return <html lang="en"><body>{children}</body></html>\n}\n',
    )
    await writeFile(
        path.join(app, 'app', 'page.jsx'),
        "import { twMerge } from '@tailwind-merge/next/runtime'\n\nexport default function Page() {\n    return <p id=\"page\" data-merged={twMerge('text-huge text-sm')} data-padding={twMerge(['p', 2].join('-'), ['p', 4].join('-'))}>packed</p>\n}\n",
    )
    const nextBin = path.join(consumerDirectory, 'node_modules', 'next', 'dist', 'bin', 'next')
    const { stdout, stderr } = await run(process.execPath, [nextBin, 'build', '--webpack'], {
        cwd: app,
        env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
    }).catch((error) => {
        throw new Error(`next build failed:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
    })
    const output = `${stdout}${stderr}`
    assert.match(
        output,
        /Pruned the tailwind-merge config to \d+ of \d+ class groups/,
        'the build must report pruning',
    )
    const html = await readFile(path.join(app, '.next', 'server', 'app', 'index.html'), 'utf8')
    assert.match(html, /id="page"[^>]*data-merged="text-sm"/, 'the theme must configure merging')
    assert.match(
        html,
        /id="page"[^>]*data-padding="p-2 p-4"/,
        'only the inline safelist must survive pruning',
    )
}

/** The packed variant of the consumer-types fixture (same main.ts, single source of truth): type-checking resolves the plugin entry and the runtime subpath to the bundled .d.mts files and tailwind-merge to its published types through the consumer's node_modules — no paths substitutions anywhere, unlike the in-suite fixture that runs against workspace source. */
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
                    skipLibCheck: true,
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
    console.error(`[@tailwind-merge/next] ${message}`)
    process.exit(1)
}
