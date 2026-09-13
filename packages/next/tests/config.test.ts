import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { fallbackModuleCode } from '@tailwind-merge/plugin-core'
import { expect, test, vi } from 'vitest'

import { withTailwindMerge } from '../src/index.ts'
import {
    resolveLoaderOptions,
    resolvePruneOptions,
    serializableLoaderOptions,
} from '../src/options.ts'

import { packageDirectory } from './helpers.ts'

const PACKAGE_NAME = '@tailwind-merge/next'

test('withTailwindMerge adds the loader rules for both bundlers and transpiles the package', async () => {
    const config = withTailwindMerge(
        {
            reactStrictMode: true,
            transpilePackages: ['other'],
            turbopack: {
                resolveAlias: { underscore: 'lodash' },
                rules: { '*.mjs': { loaders: ['existing-loader'] } },
            },
        },
        { prune: { dev: true, log: false }, css: 'app/globals.css' },
    )

    expect(config.reactStrictMode).toBe(true)
    expect(config.transpilePackages).toEqual(['other', PACKAGE_NAME])
    expect(config.turbopack?.resolveAlias).toEqual({ underscore: 'lodash' })

    // The user's rule on the same glob stays in front; the plugin's two rules are keyed on the mode through Turbopack's built-in conditions.
    const rules = config.turbopack!.rules!['*.mjs'] as Record<string, unknown>[]
    expect(rules).toHaveLength(3)
    expect(rules[0]).toEqual({ loaders: ['existing-loader'] })
    expect(rules[1]).toEqual({
        condition: {
            all: [{ path: expect.any(RegExp) }, { content: expect.any(RegExp) }, 'development'],
        },
        loaders: [
            {
                loader: expect.stringMatching(/[\\/]loader\.mjs$/),
                options: { mode: 'dev', prune: true, log: false, css: 'app/globals.css' },
            },
        ],
    })
    expect(rules[2]).toEqual({
        condition: {
            all: [{ path: expect.any(RegExp) }, { content: expect.any(RegExp) }, 'production'],
        },
        loaders: [
            {
                loader: expect.stringMatching(/[\\/]loader\.mjs$/),
                options: { mode: 'build', prune: true, log: false, css: 'app/globals.css' },
            },
        ],
    })

    // Turbopack matches real, project-relative paths, so the conditions must recognize the runtime file in a store layout, in a plain install, and in a symlinked workspace — and must not catch another package's runtime module.
    const { all } = (
        rules[1] as { condition: { all: [{ path: RegExp }, { content: RegExp }, string] } }
    ).condition
    for (const file of [
        'node_modules/.pnpm/@tailwind-merge+next@0.0.0/node_modules/@tailwind-merge/next/dist/runtime.mjs',
        'node_modules/@tailwind-merge/next/dist/runtime.mjs',
        'packages/next/dist/runtime.mjs',
    ]) {
        expect(all[0].path.test(file)).toBe(true)
    }
    expect(all[0].path.test('node_modules/@tailwind-merge/next/dist/index.mjs')).toBe(false)
    expect(
        all[1].content.test(
            await readFile(path.join(packageDirectory, 'src', 'runtime.ts'), 'utf8'),
        ),
    ).toBe(true)
    // The marker survives the build (a legal comment; ordinary comments are stripped), otherwise the rule would silently serve the fallback everywhere.
    expect(
        all[1].content.test(
            await readFile(path.join(packageDirectory, 'dist', 'runtime.mjs'), 'utf8'),
        ),
    ).toBe(true)
    expect(
        all[1].content.test(
            await readFile(path.join(packageDirectory, 'dist', 'index.mjs'), 'utf8'),
        ),
    ).toBe(false)

    // The webpack rule matches this package's runtime file by exact path and carries the mode from the compile context.
    const webpackConfig = {
        module: { rules: [] as { test: (file: string) => boolean; use: unknown[] }[] },
    }
    expect(config.webpack!(webpackConfig, { dev: true } as never)).toBe(webpackConfig)
    expect(webpackConfig.module.rules).toEqual([
        {
            test: expect.any(Function),
            use: [
                {
                    loader: expect.stringMatching(/[\\/]loader\.mjs$/),
                    options: { mode: 'dev', prune: true, log: false, css: 'app/globals.css' },
                },
            ],
        },
    ])
    const rule = webpackConfig.module.rules[0]!
    // Imported from src/, the plugin locates its runtime next to itself; the built package points at dist/runtime.mjs the same way.
    expect(rule.test(path.join(packageDirectory, 'src', 'runtime.mjs'))).toBe(true)
    expect(rule.test(path.join(packageDirectory, 'src', 'index.mjs'))).toBe(false)
})

test('withTailwindMerge wraps a function config, keeps its webpack hook, and does not duplicate the transpiled package', async () => {
    const userWebpack = vi.fn((webpackConfig: Record<string, unknown>) => ({
        ...webpackConfig,
        marked: true,
    }))
    const configured = withTailwindMerge(async (phase, { defaultConfig }) => ({
        env: { PHASE: phase, HAS_DEFAULTS: String(defaultConfig !== undefined) },
        transpilePackages: [PACKAGE_NAME],
        webpack: userWebpack,
    }))
    expect(typeof configured).toBe('function')

    const config = await configured('phase-production-build', { defaultConfig: {} })
    expect(config.env).toEqual({ PHASE: 'phase-production-build', HAS_DEFAULTS: 'true' })
    expect(config.transpilePackages).toEqual([PACKAGE_NAME])
    expect(config.turbopack?.rules?.['*.mjs']).toHaveLength(2)

    const webpackConfig = { module: { rules: [] as { use: { options: { mode: string } }[] }[] } }
    const context = { dev: false } as never
    expect(config.webpack!(webpackConfig, context)).toEqual({ ...webpackConfig, marked: true })
    expect(userWebpack).toHaveBeenCalledWith(webpackConfig, context)
    // The rule is added before the user's hook runs, so the user's hook can see and reorder it.
    expect(webpackConfig.module.rules[0]!.use[0]!.options.mode).toBe('build')
})

test('the prune option resolves against the mode', () => {
    expect(resolvePruneOptions(undefined)).toEqual({ build: true, dev: false, log: true })
    expect(resolvePruneOptions(true)).toEqual({ build: true, dev: false, log: true })
    expect(resolvePruneOptions(false)).toEqual({ build: false, dev: false, log: false })
    expect(resolvePruneOptions({ dev: true, log: false })).toEqual({
        build: true,
        dev: true,
        log: false,
    })
    expect(resolvePruneOptions({ build: false })).toEqual({ build: false, dev: false, log: true })

    expect(resolveLoaderOptions({}, 'build')).toEqual({ mode: 'build', prune: true, log: true })
    expect(resolveLoaderOptions({}, 'dev')).toEqual({ mode: 'dev', prune: false, log: true })
    expect(
        resolveLoaderOptions({ prune: { dev: true }, encoding: 'exact', cacheSize: 10 }, 'dev'),
    ).toEqual({
        mode: 'dev',
        prune: true,
        log: true,
        encoding: 'exact',
        cacheSize: 10,
    })
    // Loader options travel to Turbopack's Rust side as JSON: absent keys must be left out rather than set to undefined.
    expect(
        serializableLoaderOptions({ mode: 'dev', prune: false, log: true, css: undefined }),
    ).toEqual({
        mode: 'dev',
        prune: false,
        log: true,
    })
})

test('the runtime fallback exports exactly what the served module exports', async () => {
    const runtime = await import('../src/runtime.ts')
    const served = /export \{([^}]*)\}/.exec(fallbackModuleCode('tailwind-merge'))![1]!
    const servedNames = served
        .split(',')
        .map((name) =>
            name
                .trim()
                .split(/\s+as\s+/)
                .at(-1)!,
        )
        .filter(Boolean)
    expect(Object.keys(runtime).sort()).toEqual(servedNames.sort())
})
