import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Rollup, build } from 'vite'
import { expect, test, vi } from 'vitest'

import tailwindMerge from '../src/index'

import {
    RUNTIME_SPECIFIER,
    hasLiteral,
    libraryAliases,
    nextWatchBuild,
    setupPluginTests,
    updateAfter,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()
const THEME = "{ theme: { extend: { fontSize: { huge: '3rem' } } } }"

test.each([
    { directive: '@config', prune: false, missing: true },
    { directive: '@config', prune: true, missing: true },
    { directive: '@config', prune: false, missing: false },
    { directive: '@config', prune: true, missing: false },
    { directive: '@plugin', prune: false, missing: true },
    { directive: '@plugin', prune: true, missing: true },
    { directive: '@plugin', prune: false, missing: false },
    { directive: '@plugin', prune: true, missing: false },
])('recovers a failed transitive $directive dependency (missing: $missing, pruning: $prune)', async ({ directive, prune, missing }) => {
    const root = await copyFixture('app')
    const modulePath = path.join(root, 'theme.cjs')
    const tokensPath = path.join(root, 'tokens.cjs')
    await writeFile(path.join(root, 'app.css'), `@import 'tailwindcss' source(none);\n${directive} './theme.cjs';\n@source inline('text-huge text-sm');\n`)
    await writeFile(modulePath, "module.exports = require('./tokens.cjs')\n")
    if (!missing) {
        await writeFile(tokensPath, 'module.exports = {\n')
    }
    // No Tailwind Vite plugin: its own dependency collection and cache invalidation must not be needed for recovery.
    const { server, plugin } = await startServer(root, {
        options: { css: 'app.css', prune: { dev: prune } },
    })
    const fallback = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    const clientFallback = await server.transformRequest(RUNTIME_SPECIFIER)
    expect(fallback.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    expect(clientFallback?.code).toContain('getDefaultConfig')
    await waitForWatcher(server, missing ? modulePath : tokensPath)

    const module = directive === '@config' ? THEME : `{ handler() {}, config: ${THEME} }`
    const update = await updateAfter(plugin, () => writeFile(tokensPath, `module.exports = ${module}\n`), (result) => result.reloaded)
    expect(update).toEqual({ trigger: 'config', regenerated: true, reloaded: true })
    const recovered = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(recovered.twMerge('text-huge text-sm')).toBe('text-sm')
    expect((await server.transformRequest(RUNTIME_SPECIFIER))?.code).not.toContain('getDefaultConfig')
})

test.each([
    { importsRuntime: false, prune: false, transitive: false },
    { importsRuntime: false, prune: true, transitive: false },
    { importsRuntime: true, prune: false, transitive: false },
    { importsRuntime: true, prune: true, transitive: false },
    { importsRuntime: true, prune: false, transitive: true },
    { importsRuntime: true, prune: true, transitive: true },
])('watch builds recover from their first generation failure (runtime imported: $importsRuntime, pruning: $prune, transitive: $transitive)', async ({ importsRuntime, prune, transitive }) => {
    const root = await copyFixture('app')
    const dependency = transitive ? 'tokens.cjs' : 'theme.cjs'
    const themePath = path.join(root, dependency)
    if (transitive) {
        await writeFile(path.join(root, 'theme.cjs'), "module.exports = require('./tokens.cjs')\n")
    }
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss' source(none);\n@config './theme.cjs';\n@source inline('text-huge text-sm');\n")
    // Neither CSS nor a second plugin supplies watches. Generation and recovery must also work when no module imports the runtime.
    await writeFile(path.join(root, 'main.ts'), importsRuntime
        ? `import { twMerge } from '${RUNTIME_SPECIFIER}';\ndocument.body.className = twMerge('text-huge text-sm')\n`
        : 'document.body.textContent = "No runtime import"\n')
    let watched: string[] = []
    let code = ''
    const watcher = await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [
            tailwindMerge({ css: 'app.css', prune }),
            {
                name: 'observe-watch-build',
                buildEnd() {
                    watched = this.getWatchFiles()
                },
                generateBundle(_, bundle) {
                    code = Object.values(bundle)
                        .filter((chunk) => chunk.type === 'chunk')
                        .map((chunk) => chunk.code)
                        .join('\n')
                },
            },
        ],
        resolve: { alias: libraryAliases },
        build: { write: false, minify: false, watch: { chokidar: { usePolling: true } } },
    }) as Rollup.RollupWatcher
    try {
        const firstBuild = nextWatchBuild(watcher)
        await expect(firstBuild).rejects.toThrow(dependency)
        await expect(firstBuild).rejects.toMatchObject({ watchFiles: expect.arrayContaining([themePath]) })
        expect(watched).toContain(themePath)
        let observed = false
        watcher.on('change', (file) => {
            observed ||= file === themePath
        })
        const recovered = nextWatchBuild(watcher)
        // Rollup's END precedes polling initialization and it exposes no ready event. Recreate only the missing dependency until its parent watcher observes creation, then let that cycle finish without touching the CSS or relying on another plugin's watches.
        await vi.waitFor(async () => {
            if (!observed) {
                await rm(themePath, { force: true })
                await writeFile(themePath, `module.exports = ${THEME}\n`)
            }
            expect(observed).toBe(true)
        }, { timeout: 5_000, interval: 100 })
        await recovered
        expect(code).not.toBe('')
        expect(hasLiteral(code, 'huge')).toBe(importsRuntime)
        expect(code).not.toContain('getDefaultConfig')
    } finally {
        await watcher.close()
    }
})
