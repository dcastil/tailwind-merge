/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // Each workspace package owns its Vitest setup (aliases, plugins, execArgv) in its own vitest.config.mts; this root config only aggregates them so one command runs and watches every suite. The local GitHub actions aren't workspace packages, so their tests join through an inline project instead.
        projects: [
            'packages/*',
            {
                test: {
                    name: 'github-actions',
                    include: ['.github/actions/**/*.test.mjs'],
                },
            },
        ],
        coverage: {
            // Coverage options are only picked up from the root config in projects mode. Scope matches the pre-monorepo setup: only the library is measured.
            include: ['packages/tailwind-merge/src/**/*.ts'],
        },
    },
})
