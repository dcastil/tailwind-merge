import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        // Vite plugin factories are conventionally default exports, matching @tailwindcss/vite.
        files: ['src/index.ts'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
]
