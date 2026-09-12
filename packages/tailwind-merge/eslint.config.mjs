import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['coverage/**/*', 'dist/**/*', 'node_modules/**/*'],
    },
    ...baseConfig,
    {
        files: ['scripts/**/*.?(m|c)@(t|j)s'],
        rules: {
            'no-console': 'off',
        },
    },
]
