/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        // Resolves the library name to its source so the configurator reached through the workspace link (it imports tailwind-merge's unstable entry) works without building the library's dist/ first. Mirrors the paths mapping in tsconfig.json, which does the same for types. Array form because entries match in order and the subpath must win over the bare package name.
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
    test: {
        // Every test here runs at least one full configurator generation, which takes seconds on a loaded CI runner; one package-level timeout instead of per-test annotations, like the sibling packages.
        testTimeout: 30_000,
        // Sweeps the `.tmp-*` fixture copies of interrupted earlier runs before any worker starts.
        globalSetup: ['./tests/global-setup.ts'],
    },
})
