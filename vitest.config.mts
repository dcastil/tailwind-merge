import { defineConfig } from 'vitest/config'
import codspeedPlugin from '@codspeed/vitest-plugin'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
    // https://github.com/CodSpeedHQ/codspeed-node/issues/36
    plugins: process.env.CI ? [codspeedPlugin()] : undefined,
})
