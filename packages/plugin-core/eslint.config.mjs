import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        // Type-only imports must be marked, matching the configurator this package sits next to: both are inlined into the plugins' bundles from source, and explicitly marked type imports keep that source loadable by tools that strip types without type information.
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'inline-type-imports' },
            ],
        },
    },
]
