import path from 'node:path'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
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
