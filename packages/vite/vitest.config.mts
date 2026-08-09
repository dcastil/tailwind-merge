/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        // Resolves the package name to the library source so this package, whose dependency on tailwind-merge goes through package.json like any consumer's, can be tested without building dist/ first. Mirrors the paths mapping in tsconfig.json, which does the same for types. Array form because entries match in order and the subpath must win over the bare package name. tailwind-merge-configurator needs no alias: its package.json exports TypeScript source directly.
        alias: [
            {
                find: 'tailwind-merge/unstable-do-not-import',
                replacement: fileURLToPath(
                    new URL('../tailwind-merge/src/unstable-do-not-import.ts', import.meta.url),
                ),
            },
            {
                find: 'tailwind-merge',
                replacement: fileURLToPath(
                    new URL('../tailwind-merge/src/index.ts', import.meta.url),
                ),
            },
        ],
    },
})
