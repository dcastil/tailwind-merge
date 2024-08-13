import { defineConfig } from 'vitest/config'
import codspeedPlugin from '@codspeed/vitest-plugin'

export default defineConfig({
    // for some reason it do not print results with plugin
    plugins: [codspeedPlugin()],
})
