import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['dist/**/*', 'node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        // Vite plugin factories are conventionally default exports, matching @tailwindcss/vite.
        files: ['src/index.ts'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
    {
        files: ['scripts/**/*.?(m|c)@(t|j)s'],
        rules: {
            'no-console': 'off',
        },
    },
]
