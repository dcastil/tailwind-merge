import { defineConfig } from 'tsdown'

/**
 * Build for the published package: one ESM bundle plus declarations per subpath (`.`, `./runtime`, `./tailwind-merge` — the latter two are load-bearing: `resolveId` intercepts exactly `@tailwind-merge/vite/runtime`, and the generated virtual module imports `@tailwind-merge/vite/tailwind-merge` at runtime, so both must exist as real resolvable modules in the built package). ESM-only following `@tailwindcss/vite`'s precedent: the Vite peer floor is 6 (ESM-first), and non-Vite CJS consumers of `/runtime` are covered by `require(esm)` on the Node versions this package supports.
 *
 * The workspace `exports` point at `src/` so tests and consumers of the workspace never need a build; the dist mapping lives in `publishConfig.exports` and takes over at pack time. `pnpm --filter @tailwind-merge/vite test:exports` verifies the packed result.
 */
export default defineConfig({
    entry: {
        index: 'src/index.ts',
        runtime: 'src/runtime.ts',
        'tailwind-merge': 'src/tailwind-merge.ts',
    },
    // platform 'node' also fixes the output extension to .mjs, keeping the publishConfig exports map stable regardless of the manifest's `type` field.
    platform: 'node',
    format: 'esm',
    // Declaration maps must be enabled explicitly: with only the top-level sourcemap setting, the .d.mts files get a sourceMappingURL comment without the map file being emitted. Both map kinds resolve into the shipped src/ (the manifest's files field includes it, following the library's precedent).
    dts: { sourcemap: true },
    sourcemap: true,
    deps: {
        // Nothing may be bundled from node_modules — an entry appearing here means a dependency moved out of the manifest by accident, and the build fails. The inlined configurator (unpublished forever per PROPOSAL.md §11.7-7) does not count against this: its workspace link resolves outside node_modules, so tsdown bundles it as local source.
        onlyBundle: [],
        // The complete import surface of the emitted bundles and declarations — all declared dependencies or peers. tailwind-merge covers its subpaths (the inlined configurator imports tailwind-merge/unstable-do-not-import); vite appears only in the declaration output (the Plugin type — the list is shared with the dts pass); node builtins are always allowed on platform 'node'.
        onlyImport: ['tailwind-merge', '@tailwindcss/node', 'vite'],
    },
})
