import { defineConfig } from 'tsdown'

/**
 * Build for the published package: one ESM bundle plus declarations per entry. Three entries, two of them load-bearing runtime contracts: `runtime` is the real module Next.js resolves for `@tailwind-merge/next/runtime` and the file the plugin's loader rule matches (by name and by the legal comment at its top, see src/runtime.ts), and `loader` is the module both bundlers execute in place of that file — the plugin config points at it by absolute path, so it needs no exports entry. ESM-only like the Vite plugin: Next.js 16 imports `next.config.mjs`/`.ts` plugins as ESM, and both bundlers import `.mjs` loader files through `import()`.
 *
 * `index` must stay light: it is what `next.config` imports, and it deliberately imports nothing the loader needs at runtime, so rolldown emits no shared chunk between the two and the config file loads without touching the Tailwind compiler. Unlike the Vite package, the workspace `exports` already point at dist/, because the fixtures' Next.js processes load the package through plain Node resolution; the test global setup builds it.
 */
export default defineConfig({
    entry: {
        index: 'src/index.ts',
        loader: 'src/loader.ts',
        runtime: 'src/runtime.ts',
    },
    // platform 'node' also fixes the output extension to .mjs, which the loader rule's file-name condition and the exports map rely on.
    platform: 'node',
    format: 'esm',
    // Declaration maps must be enabled explicitly: with only the top-level sourcemap setting, the .d.mts files get a sourceMappingURL comment without the map file being emitted. Both map kinds resolve into the shipped src/.
    dts: { sourcemap: true },
    sourcemap: true,
    deps: {
        // Nothing may be bundled from node_modules — an entry appearing here means a dependency moved out of the manifest by accident, and the build fails. The inlined plugin core and configurator (both unpublished) do not count against this: their workspace links resolve outside node_modules, so tsdown bundles them as local source.
        onlyBundle: [],
        // The complete import surface of the emitted bundles and declarations — all declared dependencies or peers. tailwind-merge covers its unstable subpath; oxide is the lazy scanner, enhanced-resolve supplies the stylesheet fallback, and PostCSS parses compiled declarations. next appears only in declarations (the NextConfig type); node builtins are always allowed on platform 'node'.
        onlyImport: [
            'tailwind-merge',
            '@tailwindcss/node',
            '@tailwindcss/oxide',
            'enhanced-resolve',
            'postcss',
            'next',
        ],
    },
})
