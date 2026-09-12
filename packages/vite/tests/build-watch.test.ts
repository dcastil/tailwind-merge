import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type Rollup, build } from 'vite'
import { expect, test, vi } from 'vitest'

import tailwindMerge from '../src/index'

import { hasLiteral, libraryAliases, nextWatchBuild, setupPluginTests } from './helpers'

const { copyFixture } = setupPluginTests()

test.each([false, true])(
    'watch builds discover newly created source files (outside root: %s)',
    async (outsideRoot) => {
        const root = await copyFixture('app')
        const source = outsideRoot ? '../templates' : './templates'
        const templates = path.resolve(root, source)
        await mkdir(templates, { recursive: true })
        await writeFile(path.join(templates, 'initial.html'), '<div class="text-sm"></div>\n')
        await writeFile(
            path.join(root, 'app.css'),
            `@import 'tailwindcss' source(none);\n@source '${source}/**/*.html';\n@theme { --text-huge: 2.5rem; }\n`,
        )
        let code = ''
        const watcher = (await build({
            root,
            configFile: false,
            logLevel: 'silent',
            plugins: [
                tailwindMerge(),
                {
                    name: 'capture-output',
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
        })) as Rollup.RollupWatcher
        // `code` is captured mid-cycle, before Rollup writes the bundle to dist (watch mode writes regardless of `write: false`), and a write in flight when the watcher closes runs to completion — into a directory the harness is about to remove. So the test settles on the END of a cycle whose bundle contains the class, which Rollup emits only after the write, and keeps the listener's result cleanup that `nextWatchBuild` performs per cycle.
        let built = false
        const onEvent = async (event: Rollup.RollupWatcherEvent) => {
            if (event.code === 'BUNDLE_END') {
                await event.result.close()
            } else if (event.code === 'ERROR') {
                await event.result?.close()
            } else if (event.code === 'END' && hasLiteral(code, 'huge')) {
                built = true
            }
        }
        try {
            await nextWatchBuild(watcher)
            expect(hasLiteral(code, 'huge')).toBe(false)
            watcher.on('event', onEvent)
            await mkdir(path.join(templates, 'nested'))
            let sequence = 0
            // Rollup exposes no watcher-ready event, and its first END precedes polling initialization. Create fresh templates until observed: only creation can trigger the rebuild, never an edit of an already-watched file or a guessed delay.
            await vi.waitFor(
                async () => {
                    if (!hasLiteral(code, 'huge')) {
                        await writeFile(
                            path.join(templates, `nested/new-${sequence++}.html`),
                            '<div class="text-huge"></div>\n',
                        )
                    }
                    expect(built).toBe(true)
                },
                { timeout: 5_000, interval: 100 },
            )
        } finally {
            watcher.off('event', onEvent)
            await watcher.close()
        }
    },
)
