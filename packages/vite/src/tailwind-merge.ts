/**
 * Internal re-export of tailwind-merge for the generated runtime module.
 *
 * The generated module is served virtually and has no filesystem location, so a bare `import 'tailwind-merge'` inside it would resolve from the project root — where tailwind-merge doesn't exist under a strict package manager, because the single-install story makes it this package's dependency instead of the user's. Importing through this real file keeps every resolution step ordinary: the user's project resolves `@tailwind-merge/vite` (their own direct dependency), and this file resolves `tailwind-merge` from this package's dependencies.
 *
 * Not part of the public API — import from '@tailwind-merge/vite/runtime' instead, which serves the project-configured twMerge.
 */
export * from 'tailwind-merge'
