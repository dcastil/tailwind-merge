import path from 'node:path'
import { mkdir, readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

import tailwindcss from '@tailwindcss/vite'
import { expect, test } from 'vitest'

import { discoverCssRoot } from '../src/discovery'
import { type TailwindMergeOptions } from '../src/index'
import { autoDetectBases, resolvePruneOptions } from '../src/prune-options'

import {
    RUNTIME_SPECIFIER,
    buildFixture,
    fixturesDirectory,
    hasLiteral,
    setupPluginTests,
} from './helpers'

const { startServer, copyFixture } = setupPluginTests()

test.each([false, true])('discovers a theme through a symlinked project root (pruning: %s)', async (prune) => {
    const root = await copyFixture('app')
    const linkedRoot = path.join(path.dirname(root), 'linked-app')
    await symlink(root, linkedRoot, 'dir')
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss' source(none);\n@import './tokens.css';\n@source inline('text-huge text-sm');\n")
    await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 3rem; }\n')
    await writeFile(path.join(root, 'main.ts'), `import './app.css'\nimport { twMerge } from '${RUNTIME_SPECIFIER}'\ndocument.body.className = twMerge('text-huge text-sm')\n`)

    await expect(discoverCssRoot(linkedRoot)).resolves.toBe(path.join(linkedRoot, 'app.css'))
    const options = { prune: { dev: prune, build: prune } }
    const logs: string[] = []
    const { server } = await startServer(linkedRoot, { plugins: [tailwindcss()], options, logs })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
    expect('p' in runtime.getConfig().classGroups).toBe(!prune)
    // A JavaScript entry avoids Vite's separate HTML-output naming issue when its symlinked root resolves outside that path. CSS discovery still has no explicit entrypoint.
    const { code, output, lines } = await buildFixture(linkedRoot, {
        plugins: [tailwindcss()],
        options,
        build: { rollupOptions: { input: path.join(linkedRoot, 'main.ts') } },
    })
    const document = { body: { className: '' } }
    runInNewContext(code, { document })
    expect(document.body.className).toBe('text-sm')
    expect(output.some((entry) => entry.type === 'asset' && String(entry.source).includes('.text-huge'))).toBe(true)
    expect([...logs, ...lines].some((line) => /No Tailwind|failed|Could not scan/.test(line))).toBe(false)
})

test('symlinked discovery follows shared import cycles and still reports independent roots', async () => {
    const root = await copyFixture('app')
    const linkedRoot = path.join(path.dirname(root), 'linked-app')
    await symlink(root, linkedRoot, 'dir')
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss';\n@import './bridge.css';\n@import './tokens.css';\n")
    await writeFile(path.join(root, 'bridge.css'), "@import './shared.css';\n")
    await writeFile(path.join(root, 'shared.css'), "@import './bridge.css';\n@import './tokens.css';\n")
    await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 3rem; }\n')

    await expect(discoverCssRoot(linkedRoot)).resolves.toBe(path.join(linkedRoot, 'app.css'))
    await writeFile(path.join(root, 'independent.css'), '@theme { --text-other: 4rem; }\n')
    const error = await discoverCssRoot(linkedRoot).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('  - app.css')
    expect((error as Error).message).toContain('  - independent.css')
    expect((error as Error).message).not.toContain('tokens.css')
    expect((error as Error).message).not.toContain(root)
})

test.each([false, true])('a custom variant marks the root above its Tailwind import (pruning: %s)', async (prune) => {
    const root = await copyFixture('app')
    const classes = 'hover:kids:p-2 kids:hover:p-4'
    await writeFile(path.join(root, 'app.css'), "@import './base.css';\n@custom-variant kids (& > *);\n")
    await writeFile(path.join(root, 'base.css'), `@import 'tailwindcss' source(none);\n@source inline('${classes} kids:hover:p-2');\n`)
    await writeFile(path.join(root, 'main.ts'), `import './app.css'\nimport { twMerge } from '${RUNTIME_SPECIFIER}'\ndocument.body.className = twMerge('${classes}')\n`)

    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
    const { server } = await startServer(root, { plugins: [tailwindcss()], options: { prune: { dev: prune } } })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge(classes)).toBe(classes)
    expect(runtime.twMerge('kids:hover:p-2 kids:hover:p-4')).toBe('kids:hover:p-4')

    const { code, output } = await buildFixture(root, { plugins: [tailwindcss()], options: { prune }, build: { modulePreload: false } })
    const document = { body: { className: '' } }
    runInNewContext(code, { document })
    expect(document.body.className).toBe(classes)
    const compiledCss = output.filter((entry) => entry.type === 'asset').map((entry) => String(entry.source)).join('\n')
    expect(compiledCss).toContain('.hover\\:kids\\:p-2')
    expect(compiledCss).toContain('.kids\\:hover\\:p-4')
})

test.each(['.pcss', '.postcss'])('discovers a nested %s entrypoint for dev and build pruning', async (extension) => {
    const root = await copyFixture('app')
    const entrypoint = path.join(root, `src/app${extension}`)
    await mkdir(path.dirname(entrypoint))
    await rename(path.join(root, 'app.css'), entrypoint)
    await writeFile(entrypoint, "@import 'tailwindcss' source(none);\n@theme { --text-huge: 2.5rem; }\n@source inline('text-huge text-sm');\n")
    const main = path.join(root, 'main.ts')
    await writeFile(main, (await readFile(main, 'utf8')).replace('./app.css', `./src/app${extension}`))

    await expect(discoverCssRoot(root)).resolves.toBe(entrypoint)
    const logs: string[] = []
    const { server } = await startServer(root, { options: { prune: { dev: true } }, logs })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
    expect(runtime.getConfig().classGroups).not.toHaveProperty('p')
    const { code, lines } = await buildFixture(root)
    expect(hasLiteral(code, 'huge')).toBe(true)
    expect([...logs, ...lines].some((line) => /No Tailwind|failed|Could not scan/.test(line))).toBe(false)

    await writeFile(path.join(root, 'independent.css'), '@theme { --text-other: 2rem; }\n')
    await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
})

test.each([
    ['styles.pcss', 'styles.pcss'],
    ['styles.postcss', 'styles.postcss'],
    ['styles', 'styles'],
    ['styles.css', 'styles'],
])('discovery follows %s imported as %s in a mixed-extension graph', async (filename, specifier) => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), `@import 'tailwindcss' source(none);\n@import './${specifier}';\n@source inline('text-huge text-sm');\n`)
    await writeFile(path.join(root, filename), "@import './tokens.postcss';\n")
    await writeFile(path.join(root, 'tokens.postcss'), "@import './colors.pcss';\n@theme { --text-huge: 2.5rem; }\n")
    await writeFile(path.join(root, 'colors.pcss'), '@theme { --color-brand: #abcdef; }\n')

    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
    const { server } = await startServer(root)
    expect((await server.ssrLoadModule(RUNTIME_SPECIFIER)).twMerge('text-huge text-sm')).toBe('text-sm')
    const { code, output, lines } = await buildFixture(root, { plugins: [tailwindcss()] })
    expect(hasLiteral(code, 'huge')).toBe(true)
    expect(output.some((entry) => entry.type === 'asset' && String(entry.source).includes('.text-huge'))).toBe(true)
    expect(lines.some((line) => /No Tailwind|failed|Could not scan/.test(line))).toBe(false)
})

test('discovery ignores markers inside comments and strings in ordinary CSS', async () => {
    const root = await copyFixture('app')
    await writeFile(
        path.join(root, 'ordinary.css'),
        `
        /* Define custom tokens with @theme in app.css.
           @import 'tailwindcss'; @config './theme.cjs'; @plugin './plugin.cjs';
           @tailwind utilities; @utility example { color: red; }
           @custom-variant kids (& > *);
        */
        .example::before { content: "@theme { --text-fake: 3rem; }"; }
        .example::after { content: '@import "tailwindcss";'; }
    `,
    )
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
    const { server } = await startServer(root)
    expect((await server.ssrLoadModule(RUNTIME_SPECIFIER)).twMerge('text-huge text-sm')).toBe(
        'text-sm',
    )
    const { code } = await buildFixture(root, {
        plugins: [tailwindcss()],
        options: { prune: false },
    })
    expect(hasLiteral(code, 'huge')).toBe(true)
})

test('commented and quoted imports cannot hide independent roots', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'independent.css'), '@theme { --text-other: 2rem; }\n')
    for (const comment of [
        "/* @import './independent.css'; */",
        `.example::before { content: '@import "./independent.css";'; }`,
    ]) {
        await writeFile(path.join(root, 'app.css'), `@import 'tailwindcss';\n${comment}\n`)
        await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
        await writeFile(
            path.join(root, 'app.css'),
            "@import 'tailwindcss';\n@import './bridge.css';\n",
        )
        await writeFile(path.join(root, 'bridge.css'), comment)
        await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
    }
})

test('discovery follows active directives separated by comments', async () => {
    const root = await copyFixture('app')
    await writeFile(
        path.join(root, 'app.css'),
        "@import/* comment */'tailwindcss';\n@import/* comment */url(/* comment */'./tokens.css');\n",
    )
    await writeFile(path.join(root, 'tokens.css'), '@theme/* comment */{ --text-huge: 2.5rem; }\n')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
})

test.each([false, true])('an entrypoint that only adds @source above a shared theme is the root (pruning: %s)', async (prune) => {
    // A shared theme package owns the Tailwind import; the app file adds source directives. Picking the theme file instead would compile it without `@source`, and pruning would drop every group used only under those sources.
    const root = await copyFixture('app')
    await mkdir(path.join(root, 'ui'))
    await writeFile(path.join(root, 'app.css'), "@import './theme.css';\n@source './ui';\n")
    await writeFile(path.join(root, 'theme.css'), "@import 'tailwindcss' source(none);\n@theme { --text-huge: 2.5rem; }\n")
    await writeFile(path.join(root, 'ui', 'button.ts'), "export const button = 'text-huge text-sm'\n")

    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
    const { server } = await startServer(root, { options: { prune: { dev: prune, build: prune } } })
    const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
    // Merging proves the font-size group survived: pruning saw `ui/button.ts`, which only the `@source` in app.css reaches.
    expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
    expect('p' in runtime.getConfig().classGroups).toBe(!prune)
})

test('discovery follows symlinked directories and files inside the root', async () => {
    const root = await copyFixture('app')
    const shared = path.join(path.dirname(root), 'shared')
    await mkdir(path.join(shared, 'styles'), { recursive: true })
    await rename(path.join(root, 'app.css'), path.join(shared, 'styles', 'app.css'))
    await symlink(path.join(shared, 'styles'), path.join(root, 'styles'), 'dir')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'styles', 'app.css'))

    await writeFile(path.join(shared, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')
    await symlink(path.join(shared, 'tokens.css'), path.join(root, 'tokens.css'), 'file')
    await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
})

test('discovery picks the import-graph top among marker files', async () => {
    await expect(
        discoverCssRoot(path.join(fixturesDirectory, 'multi-root-resolved')),
    ).resolves.toBe(path.join(fixturesDirectory, 'multi-root-resolved', 'main.css'))
})

test('discovery reports ambiguous roots instead of guessing', async () => {
    await expect(discoverCssRoot(path.join(fixturesDirectory, 'ambiguous'))).rejects.toThrow(
        'multiple Tailwind CSS roots',
    )
})

test.each([false, true])(
    'discovery follows imports through an intermediate stylesheet (outside root: %s)',
    async (outsideRoot) => {
        const root = await copyFixture('app')
        const bridge = outsideRoot ? '../styles.css' : './styles.css'
        await writeFile(
            path.join(root, 'app.css'),
            `@import 'tailwindcss';\n@import '${bridge}';\n`,
        )
        await writeFile(
            path.resolve(root, bridge),
            `@import '${outsideRoot ? './app/' : './'}tokens.css';\n`,
        )
        await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')

        await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))
        const { server } = await startServer(root)
        const runtime = await server.ssrLoadModule(RUNTIME_SPECIFIER)
        expect(runtime.twMerge('text-huge text-sm')).toBe('text-sm')
        const { code } = await buildFixture(root, { options: { prune: false } })
        expect(hasLiteral(code, 'huge')).toBe(true)
    },
)

test('discovery terminates on intermediate import cycles and keeps independent roots ambiguous', async () => {
    const root = await copyFixture('app')
    await writeFile(path.join(root, 'app.css'), "@import 'tailwindcss';\n@import './first.css';\n")
    await writeFile(path.join(root, 'first.css'), "@import './second.css';\n")
    await writeFile(
        path.join(root, 'second.css'),
        "@import './first.css';\n@import url('./tokens.css');\n",
    )
    await writeFile(path.join(root, 'tokens.css'), '@theme { --text-huge: 2.5rem; }\n')
    await expect(discoverCssRoot(root)).resolves.toBe(path.join(root, 'app.css'))

    await writeFile(
        path.join(root, 'independent.css'),
        "@import 'tailwindcss';\n@import './first.css';\n",
    )
    await expect(discoverCssRoot(root)).rejects.toThrow('multiple Tailwind CSS roots')
})

test('encoding: exact reaches the generated config', async () => {
    const { server: compact } = await startServer(path.join(fixturesDirectory, 'app'))
    const compactRuntime = await compact.ssrLoadModule(RUNTIME_SPECIFIER)
    // 7xl is not a radius value, but matches compact's t-shirt-size pattern.
    expect(compactRuntime.twMerge('rounded-md rounded-7xl')).toBe('rounded-7xl')
    await compact.close()

    const { server: exact } = await startServer(path.join(fixturesDirectory, 'app'), {
        options: { encoding: 'exact' },
    })
    const exactRuntime = await exact.ssrLoadModule(RUNTIME_SPECIFIER)
    expect(exactRuntime.twMerge('rounded-md rounded-7xl')).toBe('rounded-md rounded-7xl')
})

test('the prune option resolves against the command and library mode', () => {
    const resolved = (option: TailwindMergeOptions['prune'], lib: unknown, command = 'build') =>
        resolvePruneOptions(option, { build: { lib }, command } as never)

    expect(resolved(undefined, false)).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
    expect(resolved(undefined, { entry: 'x' })).toEqual({ build: false, dev: false, log: true, libraryDefault: true })
    expect(resolved(undefined, { entry: 'x' }, 'serve').libraryDefault).toBe(false)
    expect(resolved(true, { entry: 'x' })).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
    expect(resolved(false, false)).toEqual({ build: false, dev: false, log: false, libraryDefault: false })
    expect(resolved({ dev: true, log: false }, false)).toEqual({ build: true, dev: true, log: false, libraryDefault: false })
    expect(resolved({ build: true }, { entry: 'x' })).toEqual({ build: true, dev: false, log: true, libraryDefault: false })
})

test('automatic source detection starts where the Tailwind integration in use starts', () => {
    const withVitePlugin = { root: '/repo/apps/web', plugins: [{ name: '@tailwindcss/vite:scan' }] } as never
    expect(autoDetectBases(withVitePlugin)).toEqual(['/repo/apps/web'])

    // Without @tailwindcss/vite (PostCSS setups default to the working directory), the root and the working directory are both scanned, nested ones collapsing into the outer.
    const cwd = process.cwd()
    expect(autoDetectBases({ root: cwd, plugins: [] } as never)).toEqual([cwd])
    expect(autoDetectBases({ root: path.join(cwd, 'apps', 'web'), plugins: [] } as never)).toEqual([cwd])
    expect(autoDetectBases({ root: '/somewhere/else', plugins: [] } as never).sort()).toEqual(
        ['/somewhere/else', cwd].sort(),
    )
})
