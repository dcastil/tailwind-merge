import { baseConfig } from './eslint.config.base.mjs'

// Lints the repo root and CI infrastructure (.github/). Workspace packages are ignored here because each one lints itself with its own eslint.config.mjs (run via `pnpm --recursive lint`); they spread the same baseConfig, so rules stay identical across the repo.
export default [
    {
        ignores: [
            // Local Claude Code data, including worktrees holding full repo copies whose files would otherwise be linted by this root config.
            '.claude/**/*',
            'coverage/**/*',
            'node_modules/**/*',
            'packages/**/*',
        ],
    },
    ...baseConfig,
    {
        files: ['scripts/**/*.?(m|c)@(t|j)s'],
        rules: {
            'no-console': 'off',
        },
    },
]
