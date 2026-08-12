/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        // Resolves the package name to the library source so this package, whose dependency on tailwind-merge goes through package.json like any consumer's, can be tested without building dist/ first. Mirrors the paths mapping in tsconfig.json, which does the same for types. Array form because entries match in order and the subpath must win over the bare package name.
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
        // Generation-heavy tests are this package's normal case: a single test can run several full design-system loads (the CLI --check test runs six), which takes seconds on a loaded CI runner and overflowed vitest's 5 s default there while passing locally. One package-level timeout instead of per-test annotations.
        testTimeout: 60_000,
    },
})
