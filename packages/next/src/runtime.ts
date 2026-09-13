/*! @tailwind-merge/next runtime fallback */

/**
 * The stable import surface of `@tailwind-merge/next`: `import { twMerge } from '@tailwind-merge/next/runtime'`.
 *
 * When the plugin is configured, neither Turbopack nor webpack ever evaluates this file's content: a loader rule for the built `runtime.mjs` (matched by file name and by the legal comment above, which survives the package build where ordinary comments do not — kept to a few bytes because a bundle that includes this fallback keeps legal comments too) replaces it with the module generated from the project's Tailwind CSS, exporting the same names with the project-specific config in place. This file is what resolves everywhere else (Jest, plain Node scripts, tooling that does not load next.config) and serves tailwind-merge's default behavior, so code using the subpath keeps working outside the Next.js build, just without project-specific precision.
 *
 * It also defines the types users see: TypeScript always resolves the subpath to this file through ordinary package resolution, never to the generated module. The export surface must therefore stay in sync with the generated module's runtime appendix in the plugin core (see `fallbackModuleCode` there and the surface test in tests/config.test.ts).
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
