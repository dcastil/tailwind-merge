/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'

import codspeedPlugin from '@codspeed/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    // When Codspeed plugin is enabled, benchmark results don't get logged. More info: https://github.com/CodSpeedHQ/codspeed-node/issues/36
    plugins: process.env.CI ? [codspeedPlugin()] : undefined,
    resolve: {
        // Resolves the package name to the library source so the configurator workspace package, whose dependency on tailwind-merge goes through package.json like any consumer's, can be tested without building dist/ first. Mirrors the paths mapping in configurator/tsconfig.json, which does the same for types. Array form because entries match in order and the subpath must win over the bare package name.
        alias: [
            {
                find: 'tailwind-merge/unstable-do-not-import',
                replacement: fileURLToPath(new URL('../src/unstable-do-not-import.ts', import.meta.url)),
            },
            {
                find: 'tailwind-merge',
                replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
            },
        ],
    },
    test: {
        coverage: {
            include: ['src/**/*.ts'],
        },
        execArgv: ['--expose-gc'],
    },
})
