/// <reference types="vitest" />

import codspeedPlugin from '@codspeed/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    // When Codspeed plugin is enabled, benchmark results don't get logged. More info: https://github.com/CodSpeedHQ/codspeed-node/issues/36
    plugins: process.env.CI ? [codspeedPlugin()] : undefined,
    test: {
        coverage: {
            include: ['src/**/*.ts'],
        },
        execArgv: ['--expose-gc'],
    },
})
