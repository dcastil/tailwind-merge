# tailwind-merge configurator — research & proposal

Status: exploration on branch `feature/add-tailwind-merge-configurator`. Nothing here is decided yet; this document captures the research and proposes a direction. Research date: 2026-08-08, against `tailwind-merge@3.6.0` and `tailwindcss@4.3.3`.

## TL;DR

Build a build-time tool ("configurator") that takes the path to a project's Tailwind CSS v4 entrypoint, loads the fully resolved design system through Tailwind's own APIs, and generates a source file exporting a `twMerge` function backed by a project-specific config via `createTailwindMerge`. On a stock theme the generated function matches today's `twMerge` for every class that exists, while classifying *exactly* instead of heuristically (divergence only on nonexistent class names). On custom themes it is far more correct than today's `twMerge` (custom scales, compat sub-namespaces, resets, prefix, `@config`/`@plugin`) with zero manual configuration, and smaller when scales are reset. The default config gets tree-shaken away because the generated module never imports it.

Feasibility was verified with a working spike against `tailwindcss@4.3.3`, and a prior-art scan found that nothing like this exists yet, while demand for it is documented across many tailwind-merge issues and discussions.

## 1. Problem

tailwind-merge must know, for every class, which conflict group it belongs to. That knowledge lives in a large config, and the config is the bundle: [docs/when-and-how-to-use-it.md](../docs/when-and-how-to-use-it.md) states ~5 kB of the ~7 kB min+gzip bundle is config. Every configuration design decision in the library's history bent around that constraint — the v1→v2 migration notes call the initial configuration "the biggest source of issues" and attribute the inconvenience to "keeping the bundle size to a minimum" ([docs/changelog/v1-to-v2-migration.md](../docs/changelog/v1-to-v2-migration.md)).

The result is a config that approximates the *default* Tailwind theme with loose validators instead of knowing the *actual* theme:

- `theme.color` is `[isAny]` and `theme.text` is `[isTshirtSize]` ([src/lib/default-config.ts:238-268](../src/lib/default-config.ts)).
- A custom font size `--text-huge: 2.5rem` produces `text-huge`, which fails `isTshirtSize` in the `font-size` group and falls through to the `text-color` group's `isAny` — so `twMerge('text-huge text-sm')` keeps both classes. This exact failure is reported as [#684](https://github.com/dcastil/tailwind-merge/issues/684).
- Whole namespace families that Tailwind v4 resolves are simply absent from tailwind-merge's 19 theme keys: `--z-index-*` ([#657](https://github.com/dcastil/tailwind-merge/issues/657)), `--border-width-*` ([#631](https://github.com/dcastil/tailwind-merge/issues/631)), and every utility-specific color namespace like `--text-color-*` / `--background-color-*` (the Replit setup that triggered this exploration).
- Users who customize beyond "extend a supported scale" must follow the manual workflow in [docs/recipes.md](../docs/recipes.md): find the class group ID in `default-config.ts`, hand-write class groups, keep them in sync with their theme forever. Recurring confusion threads: [#532](https://github.com/dcastil/tailwind-merge/discussions/532), [#521](https://github.com/dcastil/tailwind-merge/discussions/521), [#550](https://github.com/dcastil/tailwind-merge/discussions/550), [#587](https://github.com/dcastil/tailwind-merge/discussions/587) (prefix), [#158](https://github.com/dcastil/tailwind-merge/discussions/158) (asked for exactly this tool in 2022).

The root cause: Tailwind knows the theme at build time, tailwind-merge only runs in the browser, and no bridge exists between the two. A build-time configurator is that bridge — it can afford to know everything, because none of what it knows ships to the client except the final generated config.

## 2. Goals and non-goals

Goals:

1. Zero-config correctness for arbitrary Tailwind v4 setups: theme overrides and extensions, namespace resets (`--color-*: initial`), utility-specific compat sub-namespaces, `--spacing` semantics, prefix, `@config`/`@plugin` contributions, custom `@utility`.
2. On a stock theme, behavior matches today's `twMerge` for every class name that actually exists in the theme; deliberate divergences are limited to nonexistent class names (where exact scales classify more precisely than today's loose validators) and are captured in a reviewed snapshot.
3. Bundle size ≤ today's `twMerge`, and smaller when the theme resets scales; the default config must be tree-shaken out.
4. All classes the project's Tailwind can produce keep working — no scanning of source files for used classes (that's a future optimization, not v1).
5. Library-first architecture with a thin CLI, so a bundler plugin (virtual module + HMR) can reuse the core later.
6. Maintenance burden concentrated where it already exists: `default-config.ts` remains the single source of truth for group semantics; everything theme-specific is *derived* at generation time, not hand-maintained.

Non-goals for v1:

- Used-class scanning / config minification (phase 4 material; the architecture should not preclude it).
- Tailwind v3 JS configs as direct input (supported indirectly via `@config` in v4 CSS).
- Watch mode / bundler plugins (the CLI + a `--check` mode covers CI; plugins come later on the same core).
- Runtime auto-configuration in the browser (dead on arrival: v4 only emits *used* theme variables into the CSS output by default, so the DOM is not a reliable theme source — and it would reintroduce runtime cost).

## 3. What the research established

### 3.1 tailwind-merge internals (read directly from source)

- The 19 theme keys in [src/lib/default-config.ts:38-56](../src/lib/default-config.ts) map 1:1 to v4 theme namespaces. Scales hold validators, not values. The conflict maps (`conflictingClassGroups`, `conflictingClassGroupModifiers`, `postfixLookupClassGroups`, `orderSensitiveModifiers`, [src/lib/default-config.ts:2438-2582](../src/lib/default-config.ts)) encode CSS-property overlap and are theme-independent — they can be carried into a generated config verbatim, minus pruned groups.
- `createTailwindMerge` never imports the default config ([src/lib/create-tailwind-merge.ts:1-4](../src/lib/create-tailwind-merge.ts)); with `"sideEffects": false` and the pure-call annotations from the build, a consumer importing only `createTailwindMerge` + `validators` sheds the entire default config. The CI metrics action already measures per-export bundle sizes on every PR (`.github/actions/metrics-report`), so the claim is continuously verified and the configurator's output can be measured with the same tooling.
- `validators` is a public namespace export ([src/index.ts:17](../src/index.ts)) — generated code can reference every validator by name without duplicating any code.
- Ready-made equivalence oracles exist: `tests/class-map.test.ts` fingerprints the whole class-group trie structurally via `createClassMap`, and ~250 behavioral assertions (strongest corpus: `tests/tailwind-css-versions.test.ts`) are all of the shape `expect(twMerge(x)).toBe(y)` with an established pattern of testing custom `createTailwindMerge` instances. Both can be run against a generated config with a small parametrization refactor.
- Found in passing: the theme-key table in [docs/configuration.md](../docs/configuration.md) lists 18 keys but the real set is 19 — `text-shadow` is missing from the docs. Worth fixing independently of this project.

### 3.2 Tailwind v4 JS API (verified with a working spike against 4.3.3)

`__unstable__loadDesignSystem(css, opts)` exists in `tailwindcss` (bring your own `loadStylesheet`/`loadModule` hooks) and in `@tailwindcss/node` (hooks pre-wired to Node resolution; only `base` needed). It returns the complete resolved design system in ~11 ms. Everything the configurator needs is on it:

- `theme.values` is a flat `Map<variableName, { value, options }>` reflecting the *effective* theme: defaults merged, user overrides applied, `--color-*: initial` resets already executed (426 → 138 entries in the spike). The `options` bitmask (`INLINE | REFERENCE | DEFAULT | STATIC | USED`) distinguishes bundled defaults from user-authored entries per variable.
- Namespace helpers exist: `theme.namespace('--text-color')`, `theme.keysInNamespaces([...])` (which correctly filters compound sub-keys like `--text-huge--line-height`), `theme.prefix`, `theme.prefixKey`. Values do not need resolution — only names matter for classification, exactly as Jordan suggested.
- `getClassList()` returns ~23k known class names including theme-derived ones (`bg-brand-500`, `text-huge`, `p-big`) and custom-utility suggestions. It is suggestion-based (finite values only), so it complements rather than replaces validator-based matching.
- `utilities.keys('static' | 'functional')` enumerates all utility roots; custom `@utility` definitions surface by diffing against a vanilla design system loaded in the same process.
- Critical nuance: utility records carry **no** theme-namespace metadata at runtime (the `.d.ts` declares `options.types` but it is unpopulated). However, the utility→namespace links can be **derived empirically**: inject one unique sentinel variable per candidate namespace into `@theme`, reload (~60 ms), and scan `getClassList()` for which roots picked it up; disambiguate with `candidatesToCss()`, whose output contains the exact `var(--…)` references a class consumes (`text-primary` → `var(--text-color-primary)`, `p-4` → `var(--spacing)`). This captures Tailwind's real resolution order instead of a hand-maintained table — the single biggest lever against the maintenance-burden concern that killed earlier attempts at this.
- `@plugin` / `@config` load end-to-end through `@tailwindcss/node` (verified with a real plugin adding a utility that then appeared in `getClassList()`); custom variants appear in `getVariants()`.
- Risks: the `__unstable__` prefix carries no semver guarantee — but it is the de-facto contract that IntelliSense and prettier-plugin-tailwindcss are built on, both of which resolve the *project's own* `tailwindcss` install and call this function. Mitigations: pin/test against a version matrix, and keep the API-touching adapter thin. `@tailwindcss/node` drags an exact-pinned native `lightningcss` — acceptable for a build-time dev tool, a reason to keep it out of tailwind-merge's own dependency tree.

### 3.3 Tailwind v4 semantics that shape the design (verified against docs + source)

- **Compat sub-namespaces are pervasive and undocumented.** Nearly every utility consults a v3-named namespace before the canonical one: `bg` and gradient stops → `['--background-color', '--color']`, `text` → `['--text-color', '--color']`, `divide` → `['--divide-color', '--border-color', '--color']`, spacing-adjacent utilities each have their own (`--padding`, `--margin`, `--inset`, `--gap`, `--width` + `--container`, …), plus `--border-width-*`, `--z-index-*`, `--order-*`, per-filter backdrop namespaces, and more (`packages/tailwindcss/src/utilities.ts`). They exist for the v3 JS-config compat layer but are equally recognized when authored directly in `@theme` — which is exactly what Replit does (`--text-color-*`, `--background-color-*`). The official docs never mention them. tailwind-merge currently models none of them; empirical probing discovers all of them without a maintained table.
- **The compiled CSS output is not a viable theme source**: by default only *used* variables are emitted (`@theme static` opts out, `@theme reference` variables are never emitted). Any approach must read the design system (or the input CSS + full default-theme knowledge), not the build output.
- **`--spacing` is a multiplier** (`p-13` works via `calc(var(--spacing) * 13)`), named `--spacing-*` values coexist and take precedence, and if `--spacing` is unset, bare numeric values stop working — so the generated spacing scale keeps `isNumber` only when `--spacing` is actually defined. Today's static config cannot express that.
- **Prefix** (`@import 'tailwindcss' prefix(tw)`) stores theme keys prefixed (`--tw-color-*`, exposed via `theme.prefix`) while class names gain a variant-like `tw:` prefix — maps directly onto tailwind-merge's existing `prefix` config option.
- The docs' namespace table has quirks that vindicate deriving over transcribing: it lists `--tab-size-*` / `--zoom-*` rows that the shipped 4.3.3 utilities don't actually consult, and omits `--text-shadow-*` which is real.

### 3.4 Prior art: none — with documented demand

No tool generates a tailwind-merge config from a Tailwind theme, for v3 or v4. npm and GitHub searches (including code search for anyone combining `tailwind-merge` with `loadDesignSystem` — zero hits) confirm it. Closest neighbors: an unpublished PostCSS-output-parsing prototype mentioned in [#413](https://github.com/dcastil/tailwind-merge/discussions/413), [hyoban/tailwind-api-utils](https://github.com/hyoban/tailwind-api-utils) (solves only the "load the project's design system across v3/v4" half, no tailwind-merge awareness), and hand-maintained per-design-system configs like [@toptal/picasso-tailwind-merge](https://www.npmjs.com/package/@toptal/picasso-tailwind-merge) — the manual labor this tool automates. The 2023 ask for Tailwind-side support ([tailwindlabs/tailwindcss#10348](https://github.com/tailwindlabs/tailwindcss/discussions/10348), 76 upvotes) never got a Tailwind-team response; `__unstable__loadDesignSystem` is the modern equivalent of what it asked for, minus used-class data.

## 4. Options considered

**A. Status quo, better docs.** Doesn't remove the sync burden or the misclassification class of bugs. Keep improving docs regardless.

**B. Parse the user's CSS text directly** (no Tailwind dependency). Attractive purity, but it must reimplement `@import` resolution, the default theme, reset semantics, prefix rewriting, `@config`/`@plugin` loading, and utility→namespace resolution order — the exact maintenance treadmill that made this idea unattractive for years, now multiplied by Tailwind's release cadence. Rejected as the primary path; could later serve as a constrained zero-dependency fallback for simple single-file themes.

**C. Load the design system through Tailwind's own APIs, then generate.** Recommended. Tailwind executes its own semantics; the configurator only reads results. Two sub-variants:

- **C1 — transform the default-config skeleton** (recommended): start from `getDefaultConfig()` inside the generator, substitute every theme getter with resolved values from the design system, prune what the theme disables, augment with probed sub-namespace links and custom utilities, then serialize. Group semantics and conflict knowledge stay in `default-config.ts`, which is maintained anyway — the configurator adds almost no parallel knowledge to keep in sync.
- **C2 — re-derive class groups from `getClassList()` bucketing**: more "from scratch", but conflict semantics can't be derived from class names alone, so it ends up rebuilding the default config's knowledge with extra steps. No advantage for v1.

**D. Runtime auto-config in the browser** (read CSS variables from the DOM). Dead on arrival: used-only variable emission, SSR complications, runtime cost. Rejected.

**E. Upstream integration into Tailwind.** The north star from the Slack conversation, but not actionable today (#10348 dormant). A working configurator with adoption numbers is the strongest possible artifact to reopen that conversation with.

## 5. Recommended architecture (C1)

```
input CSS entrypoint
        │
        ▼
adapter: load design system ──────────► tailwindcss / @tailwindcss/node
        │                               (__unstable__loadDesignSystem)
        ▼
snapshot: { themeEntries, prefix, customUtilities, variants,
            probedNamespaceLinks (sentinel pass + candidatesToCss) }
        │
        ▼
plan: getDefaultConfig() skeleton × snapshot
      → substitute theme getters with resolved scales
      → prune reset/empty scales and dead groups (+ conflict edges)
      → augment groups from sub-namespace probe results
      → append class groups for custom @utility roots
      → set prefix
        │
        ▼
emit: TypeScript (or JS) module, deterministic output, banner with
      input hash + versions, importing { createTailwindMerge, validators }
        │
        ▼
verify (optional): structural class-map diff + smoke merges
```

The core is pure data-in/code-out (`snapshot → plan → source string`) with no I/O, so the CLI, tests, and a future bundler plugin are thin shells around it. The CLI surface to start: `tailwind-merge-configurator --input src/app.css --output src/lib/tw-merge.generated.ts`, plus `--check` (regenerate in memory, diff against the file on disk, exit non-zero — for CI) and `--format ts|js`.

Sketch of the generated output:

```ts
// Generated by tailwind-merge-configurator vX.Y.Z — do not edit.
// Source: src/app.css (hash abc123) · tailwindcss 4.3.3 · tailwind-merge 3.6.0
// Regenerate: npx tailwind-merge-configurator --input src/app.css --output src/lib/tw-merge.generated.ts
import { createTailwindMerge, validators as v } from 'tailwind-merge'

const scaleColor = ['brand-500', 'surface', /* …exact names from the theme… */, v.isArbitraryVariable, v.isArbitraryValue]
const scaleSpacing = [v.isNumber /* only while --spacing exists */, 'big', v.isArbitraryVariable, v.isArbitraryValue]

export const config = {
    cacheSize: 500,
    theme: {},
    classGroups: {
        'font-size': [{ text: ['base', 'huge', /* … */, v.isArbitraryVariableLength, v.isArbitraryLength] }],
        'text-color': [{ text: [...scaleColor, 'primary' /* from --text-color-* */] }],
        // … ~300 groups, structurally identical to the default config …
    },
    conflictingClassGroups: { /* carried over, minus pruned groups */ },
    conflictingClassGroupModifiers: { 'font-size': ['leading'] },
    postfixLookupClassGroups: ['container-type'],
    orderSensitiveModifiers: [/* … */],
} satisfies Config<string, never>

export const twMerge = createTailwindMerge(() => config)
```

Notable mechanics:

- **Validator identity → import name.** The generator walks the skeleton, and every function it encounters is either a theme getter (`isThemeGetter === true` — substituted) or one of the 25 public validators (matched by identity against the `validators` namespace, emitted as `v.<name>`). Shared scales are hoisted into local consts to keep the output small and readable.
- **Derived, not maintained.** Theme values, sub-namespace links, custom utilities, prefix, and `--spacing` behavior are all read or probed from the design system at generation time. The only maintained knowledge is what the repo maintains today anyway (`default-config.ts`) plus the small probe harness and emitter.
- **Probing beats tables even on weird inputs.** Because Tailwind's theme is a flat map, a variable like `--text-color-primary` simultaneously makes `text-primary` a color (via the `--text-color` namespace) and `text-color-primary` a font size (via the `--text` namespace with key `color-primary`). `candidatesToCss` reports both faithfully; a hand-maintained mapping would likely get such cases wrong.
- **Custom `@utility`:** static utilities become single-class groups; functional utilities become a group fed by their completion values plus arbitrary-value validators. Self-conflict (same root replaces same root) is the correct default; cross-conflicts with built-ins can't be inferred and stay out of scope for v1 (escape hatch: the generated module remains composable, see below).
- **Composability preserved.** Exporting `config` alongside `twMerge` lets users keep layering: `createTailwindMerge(() => config, myExtension)`, `mergeConfigs`, or feeding it to `tailwind-variants`-style wrappers.
- **Fidelity (decided in the 2026-08-08 interview): exact theme from the start, with scale compression.** Scales are generated from the actual theme rather than mimicking today's loose validators, but "exact" does not mean "enumerate everything": when the tail of a scale's names adheres to a validator, the generator emits the validator instead of the values. Example: default color families with numeric shade tails compress to `{ red: [v.isNumber], orange: [v.isNumber], … }` (the class-group trie already supports nested parts), and a t-shirt-shaped size scale compresses to `[v.isTshirtSize]` plus enumerated outliers like `'huge'`. The governing rule: **never undermatch a class that exists; overmatching nonexistent names inside a known prefix is acceptable when it saves bytes.** Among candidate encodings (full enumeration, prefix + tail validator, whole-scale validator + outliers) the generator picks the smallest emitted representation. Rationale: this is a new project, so breaking-change cost is at its lifetime minimum — optimize for genuinely good behavior now and hold backwards compatibility later, instead of inheriting the default config's known misclassifications for compatibility's sake.

## 6. Correctness and size strategy

Because exact mode deliberately diverges from today's `twMerge` on nonexistent class names, "equivalence with the default config" is scoped down from a blanket gate to an existing-classes gate plus a reviewed divergence report:

1. **Existing-class gate:** for class names that exist in the vanilla theme (sourced from `getClassList()` and the existing test corpus), a generated-from-vanilla-CSS instance must produce the same merge results as today's `twMerge`. The ~250-assertion corpus gets parametrized to run against both, minus assertions that intentionally exercise nonexistent names.
2. **Divergence snapshot:** a structural diff of `createClassMap(generated)` vs `createClassMap(getDefaultConfig())` (existing `tests/class-map.test.ts` machinery) is committed as a reviewed snapshot, so every behavioral divergence — expected: nonexistent names that today's loose validators misclassify — is visible and deliberate rather than accidental.
3. **Differential fuzzing + scenarios:** sample class pairs from `getClassList()` (23k names) and compare merge results between default and generated on the vanilla theme (existing names only); on custom themes, targeted scenario tests reproducing [#684](https://github.com/dcastil/tailwind-merge/issues/684), [#657](https://github.com/dcastil/tailwind-merge/issues/657), [#631](https://github.com/dcastil/tailwind-merge/issues/631), [#587](https://github.com/dcastil/tailwind-merge/discussions/587), and a Replit-style sub-namespace theme. Where current behavior is not a usable oracle (custom themes), correctness is defined against Tailwind itself: two classes conflict iff their `candidatesToCss` output sets overlapping declarations under the same variant scope.
4. **Version matrix:** run the probe + generation suite against tailwindcss 4.0 → latest in CI to catch `__unstable__` drift early.
5. **Size tracking:** measure generated bundles (esbuild + brotli, same approach as `.github/actions/metrics-report`) for three scenarios — vanilla, heavy custom theme, heavy resets — and compare against `twMerge`. Expectation to validate: vanilla ≈ parity, resets < default, custom themes ≈ parity while being *correct* (which `extendTailwindMerge` setups only achieve with manual work, on top of the full default config).

## 7. Repo integration

The repo is already a pnpm workspace (`pnpm-workspace.yaml` lists `.` and `.github/actions/metrics-report`), so the prototype lives as a sideways workspace package in `configurator/` — no restructuring of the main package needed. Wiring needed when code lands (this commit is docs-only):

- Add `configurator` to `pnpm-workspace.yaml` and regenerate the lockfile (CI runs `pnpm install --frozen-lockfile`). New deps must satisfy `minimumReleaseAge` (3 days).
- ESLint runs repo-wide with `--max-warnings 0` and root-anchored ignores: add `configurator/dist` to ignores and a scoped override (a CLI needs `console`, `import/no-default-export` may need relaxing for config files).
- Root vitest auto-collects any `configurator/**/*.test.ts` (no `include` filter is set); either embrace that or give the package its own vitest project. Root `tsc` covers only `src/`, so the package brings its own `tsconfig` + type-check script.
- `files: ["dist", "src"]` in the root package.json already keeps the folder out of the npm tarball.
- Publishing form (separate package `tailwind-merge-configurator` vs a subpath export) is deliberately deferred; a subpath would drag build-time deps toward the runtime package, so a separate package is the working assumption.

## 8. Phased plan

- **P0 — research + feasibility spike.** Done (this document; spike verified against 4.3.3).
- **P1 — vanilla exactness.** Skeleton-transform generator + emitter with scale compression, existing-class gate + divergence snapshot, size report. Exit: generated-from-vanilla-CSS matches current `twMerge` on all existing vanilla classes, the divergence report contains only intended exactness wins, bundle ≤ parity.
- **P2 — real themes.** Overrides, extensions, resets, compat sub-namespaces via sentinel probing, `--spacing` logic, compound keys (`--text-*--line-height`). Exit: Replit-style CSS produces correct merges; regression scenarios from #684/#657/#631 pass.
- **P3 — ecosystem completeness.** Prefix, `@config`/`@plugin` end-to-end tests, `--check` CI mode, tailwind version matrix, and custom `@utility` in its bounded form (see below).
- **P4 — future.** Used-class scanning ("minification" of the config), bundler plugins with virtual modules + HMR, and — with adoption data in hand — reopening the upstream conversation with the Tailwind team.

Custom `@utility` scope (decided in the 2026-08-08 interview): support is limited to **self-conflict registration** — each custom utility root becomes its own class group (static roots as single-class groups, functional roots fed by completion values + arbitrary-value validators), so a custom utility merges against itself. This is cheap and cannot corrupt built-in groups; roots that shadow built-ins are skipped. **Property-based cross-group conflict inference is explicitly out of scope indefinitely** — utilities that set many CSS properties would need conflict edges against many groups, making the generated config large and ugly. The documented stance for cross-conflicts: tailwind-merge does not model them, and users who need coordinated multi-property styles are better served by JS constants composing plain Tailwind classes than by custom utilities. If even self-conflict support turns out disproportionately messy during implementation, it gets dropped rather than complicated.

## 9. Decisions from the 2026-08-08 design interview

1. **Theme source: the project's own `tailwindcss` install**, loaded via the design-system API (IntelliSense/prettier-plugin pattern). No pinned parallel Tailwind, no hand-rolled CSS parsing.
2. **Output shape: a ready `twMerge` module** built with `createTailwindMerge`, exporting the config object alongside for composability, importing `createTailwindMerge` + `validators` from `tailwind-merge`.
3. **Fidelity: exact theme from the start, with scale compression** — see section 5. Never undermatch existing classes; overmatch nonexistent tails within known prefixes when it saves bytes; smallest encoding wins. Rationale: breaking-change cost is lowest now; make behavior genuinely good first, hold compatibility later.
4. **Must-have scope: compat sub-namespaces and prefix support.** Custom `@utility` is in only as bounded self-conflict registration (see section 8); property-based cross-group conflict inference stays out indefinitely, with documentation pointing users to JS constants for multi-property composition.

Still open, to resolve during implementation:

1. Emission details: TS vs JS default, `cacheSize` passthrough, multiple CSS entrypoints (multi-theme monorepos), deterministic formatting (prettier config of the host repo vs fixed style).
2. Naming and eventual packaging (working assumption: separate package, working name `tailwind-merge-configurator`).
