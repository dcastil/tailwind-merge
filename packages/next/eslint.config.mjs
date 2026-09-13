import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['dist/**/*', 'node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        // Type-only imports must be marked, matching the inlined plugin core and configurator, so the source stays loadable by tools that strip types without type information.
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'inline-type-imports' },
            ],
        },
    },
    {
        // Bundler loaders are default exports by contract.
        files: ['src/loader.ts'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
    {
        // The terminal is the plugin's only channel to the user, from the config wrapper and from the loader alike.
        files: ['src/index.ts', 'src/loader.ts'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['scripts/**/*.?(m|c)@(t|j)s', 'tests/global-setup.ts'],
        rules: {
            'no-console': 'off',
        },
    },
]
