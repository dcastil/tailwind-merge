import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['dist/**/*', 'node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        files: ['src/cli.ts', 'src/run-cli.ts'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['tests/**/*.test.ts'],
        rules: {
            'vitest/expect-expect': [
                'error',
                { assertFunctionNames: ['expect', 'assertTailwindConformance'] },
            ],
        },
    },
    {
        // Tailwind's plugin loader expects the plugin function as the module's default export.
        files: ['tests/fixtures/**/*'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
]
