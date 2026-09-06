import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { expect, test } from 'vitest'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    hasLiteral,
    setupPluginTests,
    updateAfter,
    waitForWatcher,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

test('discovers the entrypoint through a CSS alias', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss';\n@import '@/theme.css';\n")
    await writeFile(path.join(root, 'theme.css'), '@theme { --text-huge: 2.5rem; }\n')
    const { server } = await startServer(root, { aliases: [{ find: '@', replacement: root }] })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
})

test.each(['@config', '@plugin'])(
    '%s aliases track transitive JavaScript dependencies',
    async (directive) => {
        const root = await copyFixture('app')
        const theme = path.join(root, 'sizes.cjs')
        await writeFile(theme, "module.exports = { huge: '2.5rem' }\n")
        await writeFile(
            path.join(root, 'theme.cjs'),
            directive === '@config'
                ? "module.exports = { theme: { extend: { fontSize: require('./sizes.cjs') } } }\n"
                : "module.exports = { handler() {}, config: { theme: { extend: { fontSize: require('./sizes.cjs') } } } }\n",
        )
        await writeFile(
            path.join(root, 'app.css'),
            `@import 'tailwindcss';\n${directive} '@/theme.cjs';\n`,
        )
        const { server, plugin } = await startServer(root, {
            aliases: [{ find: '@', replacement: root }],
        })
        const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(before.twMerge('text-huge text-sm')).toBe('text-sm')
        await waitForWatcher(server, theme)
        await updateAfter(plugin, () => writeFile(theme, "module.exports = { big: '3rem' }\n"))
        const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(after.twMerge('text-big text-sm')).toBe('text-sm')
        expect(after.twMerge('text-huge text-sm')).toBe('text-huge text-sm')
    },
)

test.each([false, true])(
    'CSS aliases configure, scan, and watch the same theme as Tailwind (pruning: %s)',
    async (prune) => {
        const root = await copyFixture('app')
        const themePath = path.join(root, 'theme.css')
        const aliases = [{ find: '@', replacement: root }]
        await writeFile(
            path.join(root, 'app.css'),
            "@import 'tailwindcss';\n@import '@/theme.css';\n",
        )
        await writeFile(
            themePath,
            '@theme { --text-huge: 2.5rem; }\n@source inline("text-huge text-sm");\n',
        )

        const logs: string[] = []
        const { server, plugin } = await startServer(root, {
            aliases,
            logs,
            options: { css: 'app.css', prune: { dev: prune } },
        })
        const before = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(before.twMerge('text-huge text-sm')).toBe('text-sm')
        expect(logs.some((line) => /failed|Could not scan/.test(line))).toBe(false)
        await waitForWatcher(server, themePath)
        await updateAfter(plugin, () =>
            writeFile(
                themePath,
                '@theme { --text-huge: 2.5rem; --text-big: 3rem; }\n@source inline("text-huge text-big text-sm");\n',
            ),
        )
        const after = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(after.twMerge('text-big text-sm')).toBe('text-sm')

        const { code, lines } = await buildFixture(root, {
            aliases,
            plugins: [tailwindcss()],
            options: { css: 'app.css', prune },
        })
        expect(hasLiteral(code, 'big')).toBe(true)
        expect(lines.some((line) => /failed|Could not scan/.test(line))).toBe(false)
    },
)
