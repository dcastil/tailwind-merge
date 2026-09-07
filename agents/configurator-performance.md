# Configurator performance reference

These are historical measurements used to choose the current architecture and defaults. They are not current benchmark guarantees. Re-measure after changes to the library, Tailwind, the emitter, the bundler, or fixture sources; do not use a timestamped baseline as a live regression gate.

## Optimization strategy

Measure the whole generated module together with the merge engine, minified and compressed. Compare vanilla, reset themes, and real custom themes, with both encodings and with/without source pruning. Inspect runtime semantics alongside bytes: saving a value by overmatching can grant eviction power to a nonexistent class.

The chosen design emits ordinary `createTailwindMerge` configs with lazy construction. In the 2026-08-08 vanilla experiment, the engine was 4,494 B minified / 1,815 B brotli. A prebuilt class-map trie took 9,964 B brotli versus 4,894 B for the `classGroups` representation: repeated scales made the expanded trie twice as large. It would save roughly 0.69 ms of a 0.73 ms one-time initialization. This did not justify a separate runtime or format.

Emitter sharing has a similar tradeoff. The historical default (`scales`) measured 31,989 / 8,822 / 7,706 B (minified / gzip / brotli); aggressive deduplication reduced minified bytes to 28,492 but increased gzip/brotli to 9,364 / 8,197. Fully inline measured 47,289 / 9,055 / 7,767. Keep validator bindings local for minifier renaming and compare compressed output before hoisting additional repeated structures.

## Source-pruning baseline, 2026-08-22

Measurements used esbuild to bundle each emitted module with the engine, then minification, gzip, and brotli. Tailwind was 4.3.3. Theme provenance is recorded in the [real-world fixture README](../packages/configurator/tests/fixtures/real-world/README.md). Usage came from sparse checkouts of each project's source directories at the fixture's pinned commit; vanilla used 61 shadcn/ui v4 registry components. Those external source trees are not part of the fixture suite. Replit provided theme CSS only, so it has no pruning sample.

Full/pruned sizes below are bytes in minified / gzip / brotli order. The measured engine alone was 4,594 / 2,009 / 1,828 B. Sampled full-versus-pruned classification and pair checks reported no mismatches for these samples.

| Theme (usage sample) | Encoding | Groups full → pruned | Tokens scanned / classified | Full | Pruned | Pruned vs. full (brotli) |
| --- | --- | --- | --- | --- | --- | --- |
| vanilla (shadcn/ui v4 registry components, 61 files) | compact | 379 → 138 | 2,038 / 905 | 31,835 / 8,775 / 7,640 | 12,646 / 4,884 / 4,409 | −42% |
| | exact | 379 → 138 | | 33,783 / 8,964 / 7,823 | 12,718 / 4,903 / 4,418 | −44% |
| shadcn (`apps/v4`) | compact | 385 → 190 | 16,630 / 3,583 | 32,830 / 9,044 / 7,872 | 17,204 / 6,077 / 5,453 | −31% |
| | exact | 385 → 190 | | 34,829 / 9,245 / 8,059 | 18,123 / 6,320 / 5,654 | −30% |
| supabase (`apps/studio` + `packages/ui`) | compact | 406 → 189 | 55,576 / 3,524 | 47,178 / 11,498 / 9,473 | 20,033 / 6,695 / 6,007 | −37% |
| | exact | 405 → 187 | | 61,097 / 12,517 / 9,939 | 20,874 / 6,966 / 6,236 | −37% |
| openai-fm (`src`) | compact | 379 → 64 | 1,826 / 180 | 31,909 / 8,811 / 7,697 | 9,187 / 3,899 / 3,521 | −54% |
| | exact | 379 → 64 | | 33,857 / 9,001 / 7,793 | 9,186 / 3,900 / 3,544 | −55% |
| flowbite-svelte (`src`) | compact | 379 → 178 | 12,157 / 3,528 | 31,861 / 8,787 / 7,648 | 17,597 / 5,660 / 5,052 | −34% |
| | exact | 379 → 178 | | 33,923 / 8,980 / 7,818 | 23,167 / 6,661 / 5,839 | −25% |
| kite-public (`src`) | compact | 379 → 139 | 12,822 / 1,000 | 32,350 / 8,985 / 7,852 | 13,153 / 5,111 / 4,576 | −42% |
| | exact | 379 → 139 | | 34,616 / 9,207 / 8,005 | 14,255 / 5,382 / 4,791 | −40% |
| remix-store (`app`) | compact | 387 → 116 | 1,999 / 541 | 39,513 / 9,037 / 7,854 | 12,154 / 4,748 / 4,302 | −45% |
| | exact | 387 → 116 | | 42,756 / 9,186 / 8,008 | 12,258 / 4,795 / 4,355 | −46% |
| replit (no public sources) | compact | 379 | — | 37,472 / 10,139 / 8,544 | — | — |
| | exact | 379 | | 39,535 / 10,339 / 8,652 | — | — |

Compact pruning reduced the whole compressed bundle by roughly 31–54% across these samples. Exact generally had a small additional compressed cost, but the flowbite-svelte palette-heavy sample added 787 B brotli (+15.6%) over pruned compact output. Pruning gives each color-consuming group a different subset, reducing cross-group sharing. This is why compact remains the single default even when pruning is enabled.

The source scans took 4–34 ms for small/medium projects, about 305 ms for shadcn's 4,710 files, and 370 ms for supabase's 4,985 files and 55,576 raw tokens. Pruning took 0–12 ms; design-system loading/classification remained the larger generation cost. Treat these as scale estimates, not performance budgets.

## Generation profiling, 2026-09-07

PR #713's Test jobs at `ccf8dd9` timed out on Supabase conformance in both the PR and push runs. A Node CPU profile of that fixture under Vitest coverage attributed about 18 seconds to Tailwind's variant sorting. The generator inspected every variant's selector before compiling utility probes, populating a parsed-variant cache that Tailwind sorts again on each `candidatesToCss()` call.

Moving modifier-order detection after utility classification and augmentation reduced profiled generation from about 23.5 seconds to 2.1 seconds, and the fixture's generation-plus-conformance test from about 24.3 seconds to 2.7 seconds. These local measurements used an Apple M4 Max, Node 22.22.2, Tailwind 4.3.3, and Vitest 4.1.10 with V8 coverage and CPU profiling enabled; they are not hosted-runner timing guarantees. All utility probes and conformance assertions were retained, and modifier-order detection still precedes pruning and emission.

Reproduce the focused coverage test from the repository root with `pnpm exec vitest run --project @tailwind-merge/configurator packages/configurator/tests/real-world.test.ts -t supabase --coverage --reporter=verbose`. For profiling, start and stop Node's inspector CPU profiler around fixture generation and conformance; separate their costs before deciding whether the test or production generation needs changing.

## Reproducing a comparison

1. Build the matching workspace library and generate from a pinned fixture's CSS with `generate`.
2. For pruning, obtain the matching project source tree, use `createSourceScanner` with the correct automatic-detection base, and pass its candidates to `generate({ prune: { usedClasses } })`. Do not scan generated snapshots as application usage.
3. Bundle the emitted module and its matching runtime under identical bundler options. Record tool versions, fixture/source commits, input flags, minified size, gzip, and brotli.
4. Check full/pruned classification and merging for the sampled candidates. Add new behavior cases to the permanent fixture tests; do not blindly replace snapshots to make a measurement pass.

The core scripts and gates are described in [configurator development](./configurator.md#debugging-and-validation). Public size claims should link here or be replaced with new reproducible measurements.
