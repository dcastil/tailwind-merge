/// <reference types="vitest" />

import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        // The in-process tests import the plugin core and the runtime fallback, which reach tailwind-merge through package.json like any consumer; resolve the library name to its source so those tests never depend on the library's dist/. Mirrors the paths mapping in tsconfig.json, which does the same for types. The Next.js processes the other tests spawn resolve the built library instead (see tests/global-setup.ts).
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
        // Most tests spawn a real `next dev` or `next build`, each with its own compile and a full configurator generation: tens of seconds on a loaded CI runner. One package-level timeout instead of per-test annotations, like the sibling packages.
        testTimeout: 120_000,
        // Builds this package's dist/ (what the fixtures' Next.js processes load) and sweeps the `.tmp-*` fixture copies of interrupted earlier runs before any worker starts.
        globalSetup: ['./tests/global-setup.ts'],
    },
})
