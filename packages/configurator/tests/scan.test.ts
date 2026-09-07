import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compile } from '@tailwindcss/node'
import { describe, expect, test } from 'vitest'

import { segment } from '../src/css-statements'
import { createSourceScanner, expandBraces } from '../src/scan'

import { css, generateFixture } from './fixture-utils'

const scanFixtures = fileURLToPath(new URL('./fixtures/scan/', import.meta.url))

describe('brace expansion (Tailwind semantics)', () => {
    // Mirrors tailwindcss/src/utils/brace-expansion.test.ts so the safelist expands exactly like Tailwind's.
    test.each([
        ['a/b/c', ['a/b/c']],
        ['a/{x,y,z}/b', ['a/x/b', 'a/y/b', 'a/z/b']],
        ['{a,b}/{x,y}', ['a/x', 'a/y', 'b/x', 'b/y']],
        ['{{xs,sm,md,lg}:,}hidden', ['xs:hidden', 'sm:hidden', 'md:hidden', 'lg:hidden', 'hidden']],
        ['a/{0..5}/b', ['a/0/b', 'a/1/b', 'a/2/b', 'a/3/b', 'a/4/b', 'a/5/b']],
        ['a/{-5..0}/b', ['a/-5/b', 'a/-4/b', 'a/-3/b', 'a/-2/b', 'a/-1/b', 'a/0/b']],
        ['a/{0..-5}/b', ['a/0/b', 'a/-1/b', 'a/-2/b', 'a/-3/b', 'a/-4/b', 'a/-5/b']],
        ['a/{0..10..5}/b', ['a/0/b', 'a/5/b', 'a/10/b']],
        ['a/{0..10..-5}/b', ['a/10/b', 'a/5/b', 'a/0/b']],
        ['a/{10..0..5}/b', ['a/10/b', 'a/5/b', 'a/0/b']],
        ['a/{10..0..-5}/b', ['a/0/b', 'a/5/b', 'a/10/b']],
        ['a/{00..05}/b', ['a/0/b', 'a/1/b', 'a/2/b', 'a/3/b', 'a/4/b', 'a/5/b']],
        ['a{001..9}b', ['a1b', 'a2b', 'a3b', 'a4b', 'a5b', 'a6b', 'a7b', 'a8b', 'a9b']],
        ['a/{0..5..2}/b', ['a/0/b', 'a/2/b', 'a/4/b']],
        [
            'bg-red-{100..900..100}',
            [
                'bg-red-100',
                'bg-red-200',
                'bg-red-300',
                'bg-red-400',
                'bg-red-500',
                'bg-red-600',
                'bg-red-700',
                'bg-red-800',
                'bg-red-900',
            ],
        ],
        ['a{b,c,/{x,y}}/e', ['ab/e', 'ac/e', 'a/x/e', 'a/y/e']],
        ['a{b,c,/{x,y},{z,w}}/e', ['ab/e', 'ac/e', 'a/x/e', 'a/y/e', 'az/e', 'aw/e']],
        ['a{b,c,/{x,y},{0..2}}/e', ['ab/e', 'ac/e', 'a/x/e', 'a/y/e', 'a0/e', 'a1/e', 'a2/e']],
        [
            'bg-red-{50,{100..900..100},950}',
            [
                'bg-red-50',
                'bg-red-100',
                'bg-red-200',
                'bg-red-300',
                'bg-red-400',
                'bg-red-500',
                'bg-red-600',
                'bg-red-700',
                'bg-red-800',
                'bg-red-900',
                'bg-red-950',
            ],
        ],
        ['{1.1..2.2}', ['1.1..2.2']],
    ])('expands %s', (input, expected) => {
        expect(expandBraces(input).sort()).toEqual([...expected].sort())
    })

    test('throws on unbalanced braces and zero steps', () => {
        expect(() => expandBraces('a{b,c{d,e},{f,g}h}x{y,z')).toThrow('is not balanced')
        expect(() => expandBraces('a{0..5..0}/b')).toThrow('Step cannot be zero')
    })

    test('segment splits at top-level separators only', () => {
        expect(segment('a(b,c),d', ',')).toEqual(['a(b,c)', 'd'])
        expect(segment('{hover:,focus:}underline  bg-red-{50,100}', ' ')).toEqual([
            '{hover:,focus:}underline',
            '',
            'bg-red-{50,100}',
        ])
        expect(segment('"a b" c', ' ')).toEqual(['"a b"', 'c'])
    })
})

describe('createSourceScanner', () => {
    test('reads safelists from imported stylesheets regardless of extension, without reading JavaScript as CSS', async () => {
        const stylesheet = css`
            @import 'tailwindcss' source(none);
            @import './sources.pcss';
            @plugin './safelist-plugin.cjs';
        `
        const compiler = await compile(stylesheet, { base: scanFixtures, onDependency() {} })
        const compiled = compiler.build([])
        expect(compiled).toContain('.p-2 {')
        expect(compiled).toContain('.p-4 {')
        expect(compiled).not.toContain('.p-8 {')
        expect(compiled).not.toContain('.gap-8 {')
        const scanner = await createSourceScanner({
            css: stylesheet,
            base: scanFixtures,
            autoDetectBases: [],
        })
        const { classes } = scanner.scan()
        expect(classes.sort()).toEqual(['m-2', 'm-4', 'p-2', 'p-4'])
        const { twMerge } = await generateFixture(stylesheet, scanFixtures, {
            prune: { usedClasses: classes },
        })
        expect(twMerge('p-2 p-4')).toBe('p-4')
        expect(twMerge('m-2 m-4')).toBe('m-4')
    })

    test.each([false, true])('ignores inline source directives inside comments and strings when pruning (imported: %s)', async (imported) => {
        const stylesheet = css`
            @import 'tailwindcss' source(none);
            ${imported ? "@import './inline-sources.css';" : await readFixture('inline-sources.css')}
            @theme { --text-huge: 2.5rem; }
        `
        const compiler = await compile(stylesheet, { base: scanFixtures, onDependency() {} })
        expect(compiler.build([])).toContain('.text-huge {')
        expect(compiler.build([])).toContain('.text-sm {')
        const scanner = await createSourceScanner({
            css: stylesheet,
            base: scanFixtures,
            autoDetectBases: [],
        })
        const { classes } = scanner.scan()
        expect(classes.sort()).toEqual(['text-huge', 'text-sm'])
        const { twMerge } = await generateFixture(stylesheet, scanFixtures, {
            prune: { usedClasses: classes },
        })
        expect(twMerge('text-huge text-sm')).toBe('text-sm')
    })

    test("scans Tailwind's sources and safelist exactly as configured in the CSS", async () => {
        const projectDirectory = `${scanFixtures}project/`
        const scanner = await createSourceScanner({
            css: await readFixture('project/app.css'),
            base: projectDirectory,
            autoDetectBases: [projectDirectory],
        })
        const { classes, files, globs } = scanner.scan()

        expect(scanner.scansUtilities).toBe(true)
        // Automatic detection under the base, an explicit @source outside it, and the brace-expanded safelist.
        expect(classes).toEqual(
            expect.arrayContaining([
                'p-4',
                'text-blue-500',
                'md:flex',
                'skew-3',
                'underline',
                'hover:underline',
                'focus:underline',
            ]),
        )
        // `@source not` directories are skipped, CSS files are never scanned, and `@source not inline(…)` excludes a class even though a source file contains it.
        expect(classes).not.toContain('rotate-45')
        expect(classes).not.toContain('m-99')
        expect(classes).not.toContain('bg-red-500')
        expect([...scanner.safelist].sort()).toEqual(
            ['underline', 'hover:underline', 'focus:underline'].sort(),
        )

        expect(files.map(fileName)).toEqual(
            expect.arrayContaining(['App.html', 'Widget.vue', 'Extra.svelte']),
        )
        expect(files.map(fileName)).not.toContain('Legacy.html')
        expect(globs.length).toBeGreaterThan(0)
        // The CSS graph: Tailwind's own stylesheets are dependencies, the entrypoint itself is not listed.
        expect([...scanner.dependencies].some((file) => file.includes('tailwindcss'))).toBe(true)
        expect([...scanner.dependencies]).not.toContain(`${projectDirectory}app.css`)
    })

    test('re-scanning picks up edits cheaply and returns the same shape', async () => {
        const projectDirectory = `${scanFixtures}project/`
        const scanner = await createSourceScanner({
            css: await readFixture('project/app.css'),
            base: projectDirectory,
            autoDetectBases: [projectDirectory],
        })
        const first = scanner.scan()
        const second = scanner.scan()
        expect(second.classes.sort()).toEqual(first.classes.sort())
    })

    test('source(none) disables automatic detection, leaving only explicit sources', async () => {
        const projectDirectory = `${scanFixtures}source-none/`
        const scanner = await createSourceScanner({
            css: await readFixture('source-none/app.css'),
            base: projectDirectory,
            autoDetectBases: [projectDirectory],
        })
        const { classes } = scanner.scan()

        expect(classes).toContain('italic')
        expect(classes).not.toContain('not-italic')
        expect(scanner.sources.every((source) => !source.pattern.startsWith('**'))).toBe(true)
    })

    test('several auto-detection bases scan their union', async () => {
        const scanner = await createSourceScanner({
            css: await readFixture('project/app.css'),
            base: `${scanFixtures}project/`,
            autoDetectBases: [`${scanFixtures}project/src/`, `${scanFixtures}source-none/`],
        })
        const { classes } = scanner.scan()

        expect(classes).toContain('p-4')
        expect(classes).toContain('italic')
        expect(classes).toContain('not-italic')
    })

    test('without the utilities layer nothing but the safelist is scanned', async () => {
        const scanner = await createSourceScanner({
            css: "@import 'tailwindcss/theme.css';\n@source inline('underline');\n",
            base: `${scanFixtures}project/`,
            autoDetectBases: [`${scanFixtures}project/`],
        })

        expect(scanner.scansUtilities).toBe(false)
        expect(scanner.scan().classes).toEqual(['underline'])
    })
})

function readFixture(relativePath: string): Promise<string> {
    return readFile(`${scanFixtures}${relativePath}`, 'utf8')
}

function fileName(filePath: string): string {
    return filePath.split('/').pop()!
}
