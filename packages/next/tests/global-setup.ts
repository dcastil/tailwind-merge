import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
const packageDirectory = path.resolve(testsDirectory, '..')
const workspaceRoot = path.resolve(packageDirectory, '../..')

/**
 * Vitest global setup, run once before any test worker starts.
 *
 * Removes the `.tmp-*` fixture copies earlier runs left behind in tests/ (a crashed or interrupted run skips the per-test cleanup). Safe here because no worker is alive yet; the directories are gitignored either way.
 *
 * Then builds what the fixtures' Next.js processes load through plain Node resolution: this package's dist/ every time (well under a second, and it keeps the tests on the current source), and the library's dist/ only when it is missing — the loader process imports tailwind-merge's unstable entry through the workspace link, and nothing in that process can alias it to the library source the way the in-process suites do. A stale library build is rare here and a `pnpm --filter tailwind-merge build` away.
 */
export async function setup(): Promise<void> {
    for (const entry of await readdir(testsDirectory)) {
        if (entry.startsWith('.tmp-')) {
            await rm(path.join(testsDirectory, entry), { recursive: true, force: true })
        }
    }

    const libraryDist = path.join(workspaceRoot, 'packages', 'tailwind-merge', 'dist')
    if (
        !existsSync(path.join(libraryDist, 'bundle-mjs.mjs')) ||
        !existsSync(path.join(libraryDist, 'unstable-mjs.mjs'))
    ) {
        console.log(
            '[@tailwind-merge/next tests] Building the tailwind-merge library, whose dist/ the fixtures resolve',
        )
        await run('pnpm', ['--filter', 'tailwind-merge', 'build'], { cwd: workspaceRoot })
    }

    const tsdownBin = path.join(
        path.dirname(createRequire(import.meta.url).resolve('tsdown/package.json')),
        'dist',
        'run.mjs',
    )
    await run(process.execPath, [tsdownBin], { cwd: packageDirectory })
}
