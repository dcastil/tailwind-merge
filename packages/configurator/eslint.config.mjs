import { baseConfig } from '../../eslint.config.base.mjs'

export default [
    {
        ignores: ['dist/**/*', 'node_modules/**/*', 'tests/.tmp-*/**/*'],
    },
    ...baseConfig,
    {
        // Type-only imports must be marked so Node's built-in type stripping can run src/ directly (`node src/cli.ts`); the inline style keeps mixed value/type imports on one line. This is the lint-level stand-in for verbatimModuleSyntax, which can't be enabled in tsconfig because it would also apply to the library sources reached through the paths mapping.
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'inline-type-imports' },
            ],
        },
    },
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
