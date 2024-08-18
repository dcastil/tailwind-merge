import codspeedPlugin from '@codspeed/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    // https://github.com/CodSpeedHQ/codspeed-node/issues/36
    plugins: process.env.CI ? [codspeedPlugin()] : undefined,
})
