# Configurator development

Read this for work on `packages/configurator/`. User-facing setup and API documentation start in the [package README](../packages/configurator/README.md). The [Vite guide](./vite-plugin.md) owns bundler integration and packaging; [library internals](./tailwind-merge-internals.md) own the merge engine and shared CI guardrails.

## Goals and strategy

The configurator bridges Tailwind's build-time knowledge and tailwind-merge's runtime classification. A custom font size such as `--text-huge` should not need a hand-maintained merge configuration, and namespace resets, compat sub-namespaces, prefixes, and custom utilities should follow the project's CSS.

- Derive theme-specific knowledge from Tailwind's resolved design system. Keep class-group semantics and conflicts in `default-config.ts` as the single maintained skeleton; do not create a parallel utility-to-namespace table.
- Preserve classification of real theme classes. Compact encoding may overmatch finite scales for size; exact encoding avoids that tradeoff for named values. Both need explicit classification and merge gates, not just comparison with the default config.
- Keep browser work small: emit a normal config for `createTailwindMerge`, preserve lazy initialization and composability, and avoid importing the default config in the emitted module. Tailwind and scanner dependencies remain build-time only.
- Keep the library API as the reusable core. CLI and bundler integrations should own their I/O, logging, watching, and failure policy while reusing generation and scanning. Do not implement a bundler feature by invoking the CLI.
- Keep build-time internals outside the library's stable API. The configurator uses the explicit `tailwind-merge/unstable-do-not-import` entry for classification and parsing; consuming it requires a compatible library release. A shared internal runtime package remains a possible later split, not a prerequisite for this integration.
- Prune only as an optional optimization of a complete generated config. The invariant is identical merging for lists composed of supplied candidates, not a strict allowlist and not a stronger correctness guarantee than the full config.
- Measure compressed bundle size as well as minified size. A smaller source representation can compress worse; keep the [measurement methodology and baseline](./configurator-performance.md) when evaluating alternatives.

Non-goals remain runtime discovery from DOM/computed CSS, parsing compiled output as a complete theme, direct v3 JS-config input, and a separate merge engine. Compiled CSS omits unused variables; a custom runtime would duplicate the library's parser/conflict/performance work for little measured gain. Legacy configs work through `@config` in v4 CSS. Separate generated modules can describe separate themes; a single function does not infer which theme a caller intended.

## Pipeline and ownership

All source paths in this table are relative to `packages/configurator/src/`.

| File | Responsibility |
| --- | --- |
| `generate.ts` | Loads project and vanilla systems, builds plans, applies custom utilities, augments/corrects class claims, optionally prunes, then materializes and emits. |
| `design-system.ts` | Thin Tailwind API adapter, memoized class lists, prefix-aware compilation, declaration parsing, and CSS property coverage helpers. |
| `snapshot.ts` | Normalizes theme entries and prefix; compound theme keys do not become standalone scale values. |
| `plan.ts` | Walks `getDefaultConfig()`, resolves theme getters via `themeKey`, copies scales per group, removes disabled members, and carries group/conflict/modifier ordering. |
| `compress.ts` | Chooses enumeration, validators, or nested prefix families under the selected encoding policy. |
| `custom-utilities.ts` | Compares utility registries, classifies aliases, and derives self-conflict groups and directional override edges. |
| `augment.ts` | Diffs named classes against vanilla, classifies extra namespaces, probes alternative spellings, and resolves competing claims. |
| `prune.ts` | Uses the library parser/classifier on the completed config, then retains reached members and live conflict edges. |
| `materialize.ts`, `emit.ts` | Produce the in-memory config and generated TS/JS from the same plan. |
| `scan.ts` | Compiles source configuration, collects dependency files and safelists, and wraps oxide scanning. |
| `run-cli.ts`, `cli.ts` | Argument parsing, file I/O, source scanning, report output, and full-content `--check`. |

Project and vanilla loads use the same `@tailwindcss/node` compiler and CSS-resolution base. Do not substitute a globally installed vanilla baseline. The compiler itself comes from the package's dependency resolution; resolving CSS imports from the project does not guarantee compiler-version equality with another integration.

The plan references validators by name and holds class groups/conflicts in ordered maps. Only public validators can be serialized. Each group's scale is independently copied so collision corrections cannot remove another group's members; the emitter recovers shared scale runs structurally.

## Classification constraints and regression lessons

- Class-list suggestions are unprefixed. Keep classifiers unprefixed, and apply the configured prefix centrally when sending candidates to Tailwind in `declaredDeclarations` or `classesCompile`. Earlier unprefixed probes under a prefixed theme silently skipped every augmentation and custom-utility inference while simple namespace tests stayed green.
- A changed class claim must be checked against compiled declarations. A theme color called `xl` may own `text-xl` while `drop-shadow-xl` remains a size; `bg-bottom` can represent multiple effects. Correct the owning group's copy, or neutralize all claims when removing the class would lose independent effects. Preserve report entries and ordering through pruning.
- Tailwind's suggestion list omits some compiling aliases. Augmentation probes a group's other spellings and accepts aliases with byte-identical declarations; do not replace that with a hand-maintained alias table.
- Static custom aliases must match exactly one built-in signature. Other roots self-conflict; a later custom class may remove another group only when it fully covers its unconditional element-level declarations. Built-in-to-custom edges are not inferred generally. Conditional/pseudo-element declarations may only be shared identical scaffolding, and custom-property state must be covered as well.
- The declaration oracle is directional: a longhand after a shorthand does not replace the whole shorthand. Identical declarations and `var()`-carried state can compose. Keep CSS facts in `UNCONTROLLED_DASH_PREFIXED_PROPERTIES` and `IRREGULAR_SHORTHAND_LONGHANDS`; prefix resemblance alone wrongly treats `color` as covering `color-scheme` or `overflow` as covering `overflow-wrap`.
- An overmatched nonexistent name still has eviction power. Exact mode enumerates finite names and probes open custom value kinds; arbitrary-value validators still approximate types. Do not promise that exact mode validates every possible CSS value.

## Emission and pruning decisions

`getConfig` constructs the config lazily and exports a fresh object per call; emitted `twMerge` uses `createTailwindMerge(getConfig)`. The emitted `theme` is empty because scales are materialized into groups. TS uses `satisfies`; JS is transform-free ESM. `generate` exposes `format` and `importSource`, but the emitter's internal `sharing` modes are not public API options.

Validators become local bindings so minifiers can rename them. Default sharing hoists theme scales; aggressive structural sharing remains an internal measurement option because extra references can worsen gzip/brotli. Formatting is fixed and deterministic, not inherited from the host project's formatter. CLI banners hash the entrypoint text, not the import graph; full-content regeneration makes `--check` detect dependency changes anyway.

Pruning runs after custom utilities, augmentations, and collision correction. Mirror the library's modifier/postfix parsing, preserve trie precedence, and keep every validator reached by a used candidate. If member attribution cannot explain a classifier hit, retain the whole group and report it in `unprunedClassGroups`. Validators may retain more than the scanned names; this is intentional conservative behavior.

Use oxide over Tailwind's source configuration, not Vite's module graph: raw template/Markdown files and external `@source` packages may never enter that graph, and client/server graphs differ. `compile()` supplies roots, source entries, features, and dependency callbacks. Inline candidates are private upstream, so `scan.ts` parses safelists from the entrypoint and CSS dependencies and ports Tailwind's brace expansion, including negations. Recreate the scanner when the CSS graph changes; reuse it for source-only edits. The direct API and CLI propagate scan errors; the Vite wrapper may fall back to the full config.

## Debugging and validation

The test paths and bare inspector command below are relative to `packages/configurator/`. Prefer new cases in existing fixtures before adding a whole new theme; expensive generation should be shared. The [real-world fixture README](../packages/configurator/tests/fixtures/real-world/README.md) is permanent provenance and refresh guidance, not disposable research material.

- The configurator's correctness gates are helper assertions in `packages/configurator/tests/fixture-utils.ts` (`assertTailwindConformance`, `assertExactClassificationParity`, `assertPruningEquivalence`, and the table helper `expectMerges`); tests that only call them are whitelisted for `vitest/expect-expect` in the package's eslint config — extend that list when adding a gate. The conflict oracle behind the sweeps lives in `tests/oracle.ts` (`mergeVerdict`: directional, var()-composition-aware; see its doc comment before changing verdict rules) and is importable under plain Node, which `scripts/explain.mts` relies on.
- `generateFixture` is memoized per CSS/base/options within a worker and runs every emitted module through a round trip (written to `tests/.tmp-roundtrip-*`, imported through Vitest, `getConfig()` deep-equal to the materialized config). Cost scales with the number of distinct fixtures (0.1–1 s each), not with assertions — add cases to existing fixtures first; a new theme only for a new theme shape. Use `expectMerges` for curated tables (every mismatch reported at once, input and output side by side) and `mergeTable` + `toMatchInlineSnapshot` for exploratory batches.
- `tests/vanilla-coverage.test.ts` is a ratchet against Tailwind itself (unclassified classes, consecutive pairs, cross-group exemplar pairs) with file snapshots of known divergences under `tests/__snapshots__/vanilla-coverage/`. Those lists name tailwind-merge default-config gaps as much as configurator ones; a new line after a change is something to look at, a removed line is a fix — update the snapshot deliberately, never blindly with `-u`. Divergences the library keeps on purpose (grid `col-start`/`col-end` before `col-span` per tailwind-merge#176, `sr-only` as a toggle) go into the file's `INTENTIONAL_DIVERGENCES` allowlist with a reason instead of the snapshots; a companion test fails when an allowlisted pair stops diverging, so stale entries get removed. The oracle itself stays a pure statement about compiled CSS — never encode library policy in `mergeVerdict`.
- To look at a surprising merge without writing a test: `node scripts/explain.mts <entrypoint.css> "<class list>" …` prints compiled declarations, class groups (generated and default), both merge results, and the oracle's verdict.
- Both packages sweep stale `tests/.tmp-*` directories in a Vitest `globalSetup` before workers start; keep scratch files under that prefix.
- Tailwind's scanner (`@tailwindcss/oxide`) switches its ignore rules off for sources that sit inside gitignored paths (so `@source` can point into `node_modules`), and follows symlinks there. Both packages' temp test directories (`tests/.tmp-*`) are gitignored, so a scan rooted in one sees everything reachable from it: the Vite suite therefore nests copied fixtures one level below the temp directory and puts the `@tailwind-merge/vite` symlink at the temp directory's level (outside the Vite root), and the configurator's CLI `--prune` test scans a dedicated subdirectory. Any generated module inside a scanned directory counts as sources too — it is full of class-name literals.

Run `pnpm --filter @tailwind-merge/configurator test` and the matching `test:types` script for changes here, and the Vite suite for effects on generated behavior. Complete the repository-wide checks in [AGENTS.md](../AGENTS.md) before finalizing. CLI examples can be smoke-tested with `node packages/configurator/src/cli.ts` after building the workspace library.

## Remaining development work and revisit conditions

- Add a tested Tailwind version matrix before widening compatibility claims; declared peers are not coverage. The implementation baseline is 4.3.x, with unstable API drift a primary maintenance risk.
- Keep absolute vanilla coverage in addition to differential conformance: default and generated configs can agree on the same bug. Review known divergence snapshots and the intentional-policy allowlist as the library evolves.
- Candidate upstream improvements are `onDependency` on `__unstable__loadDesignSystem` and exposed inline candidates on `compile()`. They would remove the extra compile and local safelist adapter; they are optional follow-ups, not prerequisites.
- Re-measure a specialized runtime only if usage pruning makes engine size dominant enough to justify duplicate semantics. The prior prebuilt-trie experiment doubled compressed config size to save less than a millisecond of one-time setup.
- Standalone CLI publication, other bundler adapters, and a shared runtime package follow demonstrated demand. The initial release strategy publishes the Vite wrapper with the configurator inlined; the core is not committed to remaining unpublished forever. Upstream integration discussions should be backed by real adoption and correctness evidence.

Release sequencing and the matching-library prerequisite belong in the [release guide](./release-workflow.md#publishing).
