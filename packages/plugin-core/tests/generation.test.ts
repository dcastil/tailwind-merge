import { rm, utimes, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test } from 'vitest'

import {
    dependenciesChanged,
    fallbackModuleCode,
    generateRuntimeModule,
} from '../src/generation.ts'

import { generationDefaults, hasLiteral, setupFixtureCopies } from './helpers.ts'

const { copyFixture } = setupFixtureCopies()

test('the generated module names its plugin and imports tailwind-merge from the requested specifier', async () => {
    const root = await copyFixture('app')
    const generated = await generateRuntimeModule({
        cssPath: path.join(root, 'app.css'),
        root,
        packageName: '@tailwind-merge/example',
        importSource: '@tailwind-merge/example/tailwind-merge',
    })
    expect(generated.code).toContain(
        '// Source: app.css (served in-memory by @tailwind-merge/example)',
    )
    expect(generated.code).toContain("from '@tailwind-merge/example/tailwind-merge'")
    expect(generated.code).not.toContain("from 'tailwind-merge'")
    // The appendix completes the runtime surface the plugins' fallback files export.
    for (const name of [
        'createTailwindMerge',
        'mergeConfigs',
        'twJoin',
        'validators',
        'extendTailwindMerge',
    ]) {
        expect(generated.code).toContain(name)
    }
    expect(fallbackModuleCode('@tailwind-merge/example/tailwind-merge')).toContain(
        "getDefaultConfig as getConfig, mergeConfigs, twJoin, twMerge, validators } from '@tailwind-merge/example/tailwind-merge'",
    )
})

test('an edit landing during generation counts as a change for the next refresh', async () => {
    // Modification times are taken as files are reported, so a save that races the (slow) generation is not recorded as the baseline the refresh compares against.
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const tokensPath = path.join(root, 'tokens.css')
    await writeFile(cssPath, "@import 'tailwindcss' source(none);\n@import './tokens.css';\n")
    await writeFile(tokensPath, '@theme { --text-huge: 2.5rem; }\n')
    let edited = false
    const generated = await generateRuntimeModule({
        ...generationDefaults,
        cssPath,
        root,
        integration: {
            async onDependency(file) {
                if (file === tokensPath && !edited) {
                    edited = true
                    const later = new Date(Date.now() + 5_000)
                    await writeFile(tokensPath, '@theme { --text-big: 2rem; }\n')
                    await utimes(tokensPath, later, later)
                }
            },
        },
    })
    expect(edited).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)
})

test('an edit to a transitive @config import landing during the import counts as a change', async () => {
    // Tailwind reports a config's own imports only after importing it; the configurator walks them first so their times are taken before the import reads them.
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const configPath = path.join(root, 'tailwind.config.mjs')
    const themePath = path.join(root, 'theme.mjs')
    await writeFile(
        cssPath,
        "@import 'tailwindcss' source(none);\n@config './tailwind.config.mjs';\n",
    )
    // A module whose evaluation takes a moment (a top-level await stands in for a big plugin), importing a theme file.
    await writeFile(
        configPath,
        "import { fontSize } from './theme.mjs'\nawait new Promise((resolve) => setTimeout(resolve, 600))\nexport default { theme: { extend: { fontSize } } }\n",
    )
    await writeFile(themePath, "export const fontSize = { huge: '2.5rem' }\n")
    let edited = false
    const generated = await generateRuntimeModule({
        ...generationDefaults,
        cssPath,
        root,
        integration: {
            onDependency(file) {
                if (file === configPath && !edited) {
                    edited = true
                    setTimeout(async () => {
                        const later = new Date(Date.now() + 5_000)
                        await writeFile(themePath, "export const fontSize = { giant: '9rem' }\n")
                        await utimes(themePath, later, later)
                    }, 200)
                }
            },
        },
    })
    expect(edited).toBe(true)
    expect(generated.dependencies.has(themePath)).toBe(true)
    expect(hasLiteral(generated.code, 'huge')).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)
})

test('dependenciesChanged notices edited and deleted files of the CSS graph', async () => {
    const root = await copyFixture('app')
    const cssPath = path.join(root, 'app.css')
    const generated = await generateRuntimeModule({ ...generationDefaults, cssPath, root })
    expect(generated.dependencies.has(cssPath)).toBe(true)
    await expect(dependenciesChanged(generated)).resolves.toBe(false)

    // Same content, newer modification time: a refresh regenerates on that signal alone.
    const later = new Date(Date.now() + 5_000)
    await utimes(cssPath, later, later)
    await expect(dependenciesChanged(generated)).resolves.toBe(true)

    const fresh = await generateRuntimeModule({ ...generationDefaults, cssPath, root })
    await rm(cssPath)
    await expect(dependenciesChanged(fresh)).resolves.toBe(true)
})
