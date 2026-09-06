import { rm, utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Rollup, build } from 'vite'
import { expect, test } from 'vitest'

import tailwindMerge from '../src/index'
import { dependenciesChanged, generateRuntimeModule } from '../src/generation'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    libraryAliases,
    setupPluginTests,
    updateAfter,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

const GOOD_CSS = "@import 'tailwindcss';\n\n@theme {\n    --text-huge: 2.5rem;\n}\n"
// A plugin Tailwind cannot resolve fails the design-system load — the shape of a broken CSS root the plugin must survive.
const BROKEN_CSS = "@import 'tailwindcss';\n@plugin './missing-plugin.js';\n"

test.each([true, false])('a build fails on a missing CSS entrypoint (runtime imported: %s)', async (importsRuntime) => {
    const root = await copyFixture('app')
    if (!importsRuntime) {
        await writeFile(path.join(root, 'main.ts'), 'document.body.textContent = "No runtime import"\n')
    }

    await expect(buildFixture(root, { options: { css: 'missing.css' } }).then(() => undefined)).rejects.toThrow('missing.css')
})

test('a build fails when its CSS configuration cannot be loaded', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), BROKEN_CSS)

    // No Tailwind Vite plugin: this must fail because merge-config generation rejected the CSS, not because Tailwind's own build failed first.
    await expect(buildFixture(root).then(() => undefined)).rejects.toThrow('missing-plugin.js')
})

test('a watch rebuild fails on generation errors and recovers after the CSS is fixed', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const watcher = await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [tailwindMerge({ prune: false })],
        resolve: { alias: libraryAliases },
        // A failed generation can finish before Chokidar's native-event throttle expires, swallowing an immediate repair on Linux. Polling keeps these deliberately back-to-back edits observable without sleeps or longer test timeouts.
        build: { write: false, watch: { chokidar: { usePolling: true } } },
    }) as Rollup.RollupWatcher

    try {
        await nextWatchBuild(watcher)
        await expect(nextWatchBuild(watcher, () => writeFile(cssPath, BROKEN_CSS))).rejects.toThrow('missing-plugin.js')
        await expect(nextWatchBuild(watcher, () => writeFile(cssPath, GOOD_CSS))).resolves.toBeUndefined()
    } finally {
        await watcher.close()
    }
})

test('a CSS root that fails at startup serves default behavior and logs the error', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), BROKEN_CSS)
    const logs: string[] = []
    const { server } = await startServer(root, { logs })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)

    // The fallback module: tailwind-merge's default behavior under the same export surface.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(runtime.twMerge('p-2 p-4')).toBe('p-4')
    expect(Object.keys(runtime.getConfig().classGroups)).toContain('sr')
    expect(logs).toEqual([
        expect.stringContaining('Generating the tailwind-merge config failed: '),
    ])
})

test('a breaking edit keeps the last good module in service, and the next good edit recovers', async () => {
    const root = await copyFixture('app')
    const logs: string[] = []
    const { server, plugin } = await startServer(root, { logs })
    const cssPath = path.join(root, 'app.css')
    await waitForWatcher(server, cssPath)
    const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(before.twMerge('text-huge text-sm')).toBe('text-sm')

    const breakingEdit = await updateAfter(plugin, () => writeFile(cssPath, BROKEN_CSS))
    expect(breakingEdit).toEqual({ trigger: 'config', regenerated: false, reloaded: false })
    expect(logs).toEqual([expect.stringContaining('keeping the previous one')])
    expect(await server.ssrLoadModule(RUNTIME_SPECIFIER)).toBe(before)

    const fixingEdit = await updateAfter(plugin, () =>
        writeFile(
            cssPath,
            GOOD_CSS.replace('--text-huge: 2.5rem;', '--text-huge: 2.5rem;\n    --text-big: 2rem;'),
        ),
    )
    expect(fixingEdit).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(after.twMerge('text-big text-sm')).toBe('text-sm')
})

test('dependenciesChanged notices edited and deleted files of the CSS graph', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const generated = await generateRuntimeModule({ cssPath, root })
    expect(generated.dependencies.has(cssPath)).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(false)

    // Same content, newer modification time: `vite build --watch` rebuilds regenerate on that signal alone.
    const later = new Date(Date.now() + 5_000)
    await utimes(cssPath, later, later)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)

    const fresh = await generateRuntimeModule({ cssPath, root })
    await rm(cssPath)
    await expect(dependenciesChanged(fresh)).resolves.toBe(true)
})

/** Waits for a real watch cycle's END event, subscribing before an optional edit so its outcome cannot be missed. Bundle and error events arrive before the cycle finishes; closing their results releases resources without stopping the watcher. */
function nextWatchBuild(watcher: Rollup.RollupWatcher, edit?: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
        let buildError: unknown
        const onEvent = async (event: Rollup.RollupWatcherEvent) => {
            try {
                if (event.code === 'ERROR') {
                    buildError = event.error
                    await event.result?.close()
                } else if (event.code === 'BUNDLE_END') {
                    await event.result.close()
                } else if (event.code === 'END') {
                    watcher.off('event', onEvent)
                    if (buildError) {
                        reject(buildError)
                    } else {
                        resolve()
                    }
                }
            } catch (error) {
                watcher.off('event', onEvent)
                reject(error)
            }
        }
        watcher.on('event', onEvent)
        void edit?.().catch((error: unknown) => {
            watcher.off('event', onEvent)
            reject(error)
        })
    })
}
