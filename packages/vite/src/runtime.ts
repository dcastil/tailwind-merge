/**
 * The stable import surface of `@tailwind-merge/vite`: `import { twMerge } from '@tailwind-merge/vite/runtime'`.
 *
 * When the plugin is active, Vite never serves this file — imports of the subpath are redirected to an in-memory module generated from the project's Tailwind CSS, exporting the same names with the project-specific config in place. This file is what resolves everywhere else (Jest, plain Node scripts, a test setup that doesn't load the Vite config) and serves tailwind-merge's default behavior, so code using the subpath keeps working outside Vite, just without project-specific precision.
 *
 * It also defines the types users see: TypeScript always resolves the subpath to this file through ordinary package resolution, never to the generated module. The export surface must therefore stay in sync with the generated module's runtime appendix in generation.ts — the export-parity test in tests/plugin.test.ts enforces that.
 *
 * `extendTailwindMerge` deserves a note: in the generated module it extends the project's generated config, which is the reading users expect when customizing. Here it falls back to tailwind-merge's own export, which extends the default config — consistent, since the default config is exactly what this fallback serves. `fromTheme` is deliberately absent from the surface: generated configs materialize theme scales inline and carry an empty `theme` object, so theme getters would never match anything.
 */
export {
    createTailwindMerge,
    extendTailwindMerge,
    getDefaultConfig as getConfig,
    mergeConfigs,
    twJoin,
    twMerge,
    validators,
} from 'tailwind-merge'
export type { ClassNameValue, ClassValidator, Config, ConfigExtension } from 'tailwind-merge'
