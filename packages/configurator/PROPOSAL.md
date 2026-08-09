# tailwind-merge configurator — research & proposal

Status: exploration on branch `feature/add-tailwind-merge-configurator`. Nothing here is decided yet; this document captures the research and proposes a direction. Research date: 2026-08-08, against `tailwind-merge@3.6.0` and `tailwindcss@4.3.3`.

## TL;DR

Build a build-time tool ("configurator") that takes the path to a project's Tailwind CSS v4 entrypoint, loads the fully resolved design system through Tailwind's own APIs, and generates a source file exporting a `twMerge` function backed by a project-specific config via `createTailwindMerge`. On a stock theme the generated function matches today's `twMerge` for every class that exists, while classifying *exactly* instead of heuristically (divergence only on nonexistent class names). On custom themes it is far more correct than today's `twMerge` (custom scales, compat sub-namespaces, resets, prefix, `@config`/`@plugin`) with zero manual configuration, and smaller when scales are reset. The default config gets tree-shaken away because the generated module never imports it.

Feasibility was verified with a working spike against `tailwindcss@4.3.3`, and a prior-art scan found that nothing like this exists yet, while demand for it is documented across many tailwind-merge issues and discussions.

## 1. Problem

tailwind-merge must know, for every class, which conflict group it belongs to. That knowledge lives in a large config, and the config is the bundle: [docs/when-and-how-to-use-it.md](../../docs/when-and-how-to-use-it.md) states ~5 kB of the ~7 kB min+gzip bundle is config. Every configuration design decision in the library's history bent around that constraint — the v1→v2 migration notes call the initial configuration "the biggest source of issues" and attribute the inconvenience to "keeping the bundle size to a minimum" ([docs/changelog/v1-to-v2-migration.md](../../docs/changelog/v1-to-v2-migration.md)).

The result is a config that approximates the *default* Tailwind theme with loose validators instead of knowing the *actual* theme:

- `theme.color` is `[isAny]` and `theme.text` is `[isTshirtSize]` ([src/lib/default-config.ts:238-268](../../src/lib/default-config.ts)).
- A custom font size `--text-huge: 2.5rem` produces `text-huge`, which fails `isTshirtSize` in the `font-size` group and falls through to the `text-color` group's `isAny` — so `twMerge('text-huge text-sm')` keeps both classes. This exact failure is reported as [#684](https://github.com/dcastil/tailwind-merge/issues/684).
- Whole namespace families that Tailwind v4 resolves are simply absent from tailwind-merge's 19 theme keys: `--z-index-*` ([#657](https://github.com/dcastil/tailwind-merge/issues/657)), `--border-width-*` ([#631](https://github.com/dcastil/tailwind-merge/issues/631)), and every utility-specific color namespace like `--text-color-*` / `--background-color-*` (the kind of design-system setup that triggered this exploration).
- Users who customize beyond "extend a supported scale" must follow the manual workflow in [docs/recipes.md](../../docs/recipes.md): find the class group ID in `default-config.ts`, hand-write class groups, keep them in sync with their theme forever. Recurring confusion threads: [#532](https://github.com/dcastil/tailwind-merge/discussions/532), [#521](https://github.com/dcastil/tailwind-merge/discussions/521), [#550](https://github.com/dcastil/tailwind-merge/discussions/550), [#587](https://github.com/dcastil/tailwind-merge/discussions/587) (prefix), [#158](https://github.com/dcastil/tailwind-merge/discussions/158) (asked for exactly this tool in 2022).

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

- The 19 theme keys in [src/lib/default-config.ts:38-56](../../src/lib/default-config.ts) map 1:1 to v4 theme namespaces. Scales hold validators, not values. The conflict maps (`conflictingClassGroups`, `conflictingClassGroupModifiers`, `postfixLookupClassGroups`, `orderSensitiveModifiers`, [src/lib/default-config.ts:2438-2582](../../src/lib/default-config.ts)) encode CSS-property overlap and are theme-independent — they can be carried into a generated config verbatim, minus pruned groups.
- `createTailwindMerge` never imports the default config ([src/lib/create-tailwind-merge.ts:1-4](../../src/lib/create-tailwind-merge.ts)); with `"sideEffects": false` and the pure-call annotations from the build, a consumer importing only `createTailwindMerge` + `validators` sheds the entire default config. The CI metrics action already measures per-export bundle sizes on every PR (`.github/actions/metrics-report`), so the claim is continuously verified and the configurator's output can be measured with the same tooling.
- `validators` is a public namespace export ([src/index.ts:17](../../src/index.ts)) — generated code can reference every validator by name without duplicating any code.
- Ready-made equivalence oracles exist: `tests/class-map.test.ts` fingerprints the whole class-group trie structurally via `createClassMap`, and ~250 behavioral assertions (strongest corpus: `tests/tailwind-css-versions.test.ts`) are all of the shape `expect(twMerge(x)).toBe(y)` with an established pattern of testing custom `createTailwindMerge` instances. Both can be run against a generated config with a small parametrization refactor.
- Found in passing: the theme-key table in [docs/configuration.md](../../docs/configuration.md) was missing the 19th key `text-shadow` (fixed on `main` in the meantime).

### 3.2 Tailwind v4 JS API (verified with a working spike against 4.3.3)

`__unstable__loadDesignSystem(css, opts)` exists in `tailwindcss` (bring your own `loadStylesheet`/`loadModule` hooks) and in `@tailwindcss/node` (hooks pre-wired to Node resolution; only `base` needed). It returns the complete resolved design system in ~11 ms. Everything the configurator needs is on it:

- `theme.values` is a flat `Map<variableName, { value, options }>` reflecting the *effective* theme: defaults merged, user overrides applied, `--color-*: initial` resets already executed (426 → 138 entries in the spike). The `options` bitmask (`INLINE | REFERENCE | DEFAULT | STATIC | USED`) distinguishes bundled defaults from user-authored entries per variable.
- Namespace helpers exist: `theme.namespace('--text-color')`, `theme.keysInNamespaces([...])` (which correctly filters compound sub-keys like `--text-huge--line-height`), `theme.prefix`, `theme.prefixKey`. Values do not need resolution — only names matter for classification.
- `getClassList()` returns ~23k known class names including theme-derived ones (`bg-brand-500`, `text-huge`, `p-big`) and custom-utility suggestions. It is suggestion-based (finite values only), so it complements rather than replaces validator-based matching.
- `utilities.keys('static' | 'functional')` enumerates all utility roots; custom `@utility` definitions surface by diffing against a vanilla design system loaded in the same process.
- Critical nuance: utility records carry **no** theme-namespace metadata at runtime (the `.d.ts` declares `options.types` but it is unpopulated). However, the utility→namespace links can be **derived empirically**: inject one unique sentinel variable per candidate namespace into `@theme`, reload (~60 ms), and scan `getClassList()` for which roots picked it up; disambiguate with `candidatesToCss()`, whose output contains the exact `var(--…)` references a class consumes (`text-primary` → `var(--text-color-primary)`, `p-4` → `var(--spacing)`). This captures Tailwind's real resolution order instead of a hand-maintained table — the single biggest lever against the maintenance-burden concern that killed earlier attempts at this.
- `@plugin` / `@config` load end-to-end through `@tailwindcss/node` (verified with a real plugin adding a utility that then appeared in `getClassList()`); custom variants appear in `getVariants()`.
- Risks: the `__unstable__` prefix carries no semver guarantee — but it is the de-facto contract that IntelliSense and prettier-plugin-tailwindcss are built on, both of which resolve the *project's own* `tailwindcss` install and call this function. Mitigations: pin/test against a version matrix, and keep the API-touching adapter thin. `@tailwindcss/node` drags an exact-pinned native `lightningcss` — acceptable for a build-time dev tool, a reason to keep it out of tailwind-merge's own dependency tree.

### 3.3 Tailwind v4 semantics that shape the design (verified against docs + source)

- **Compat sub-namespaces are pervasive and undocumented.** Nearly every utility consults a v3-named namespace before the canonical one: `bg` and gradient stops → `['--background-color', '--color']`, `text` → `['--text-color', '--color']`, `divide` → `['--divide-color', '--border-color', '--color']`, spacing-adjacent utilities each have their own (`--padding`, `--margin`, `--inset`, `--gap`, `--width` + `--container`, …), plus `--border-width-*`, `--z-index-*`, `--order-*`, per-filter backdrop namespaces, and more (`packages/tailwindcss/src/utilities.ts`). They exist for the v3 JS-config compat layer but are equally recognized when authored directly in `@theme` — which real design systems do (`--text-color-*`, `--background-color-*`). The official docs never mention them. tailwind-merge currently models none of them; empirical probing discovers all of them without a maintained table.
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

**F. Custom runtime with a configurator-specific config format** (investigated 2026-08-08, after P3). Since the configurator controls the emitted artifact, it could emit a purpose-built representation for a leaner custom merge runtime instead of a `Config` for `createTailwindMerge`. Measurements on the vanilla theme killed every variant of this:

- The entire engine (`createTailwindMerge` with merge loop, parser, class-map builder, LRU cache) is **4,494 B min / 1,815 B brotli** — the ceiling for any engine rewrite is a few hundred compressed bytes, against duplicating the hardest-won, perf-tuned code in the library and losing its bugfix stream.
- The config data (~25 kB min / ~5 kB brotli of the generated bundle) is information-dense: emitting the pre-built class-map trie instead — the main candidate format, which would skip runtime trie building entirely — measures **9,964 B brotli vs 4,894 B for the classGroups form, 2× worse**, because the trie is the *decompressed* config: shared scales repeat under every consuming root. `classGroups` already is the factorized encoding.
- What the pre-built format would save at runtime: `createClassMap` is 0.69 ms of the 0.73 ms one-time lazy init. Shipping kilobytes to save a one-time sub-millisecond is strictly bad.
- Unused-validator dead weight is ~2 of 25 validators (~70 B brotli) on vanilla — the namespace export prevents tree-shaking them, but the amount is negligible.

Verdict: **stay on the current path** — configure the real `createTailwindMerge`, keep full composability (`createTailwindMerge(getConfig, ext)`, `mergeConfigs`, wrapper libraries) and the library's engine maintenance for free. The worthwhile subset of "split the library into reusable parts" is three small additive API changes to tailwind-merge itself, none configurator-specific: individual validator exports (enables tree-shaking unused ones for every `createTailwindMerge` user), a public `themeKey` property on theme getters (deletes the configurator's marker-probe), and a public classification hook (removes the configurator's one internal import — the packaging blocker). The latter two landed right after this investigation: `fromTheme` now sets `themeKey` (public, part of its return value), while `createClassGroupUtils` and the `AnyConfig`/`ClassGroup`/`ThemeGetter` types live on the explicitly unstable `tailwind-merge/unstable-do-not-import` entry point — the tRPC-style loud-subpath pattern, with the semver carve-out documented in the library's versioning docs — so the main export surface stays limited to what users of tailwind-merge itself need. Revisit condition: if P4 usage-scanning ever shrinks the config far below the engine's ~1.8 kB, a hyper-specialized emitted runtime (per-app lookup maps) becomes worth re-measuring — not before.

**E. Upstream integration into Tailwind.** The north star from the Slack conversation, but not actionable today (#10348 dormant). A working configurator with adoption numbers is the strongest possible artifact to reopen that conversation with.

## 5. Recommended architecture (C1)

```
input CSS entrypoint
        │
        ▼
adapter: load design system ──────────► tailwindcss / @tailwindcss/node
        │                               (__unstable__loadDesignSystem)
        ▼
snapshot: { themeEntries, prefix, customUtilities, variants }
          + vanilla design system from the same install, as diff baseline
        │
        ▼
plan: getDefaultConfig() skeleton × snapshot
      → substitute theme getters with resolved scales
      → prune reset/empty scales and dead groups (+ conflict edges)
      → augment groups with theme-created classes found by diffing against
        the vanilla class list, classified by their compiled declarations
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
import { createTailwindMerge, validators as v, type Config } from 'tailwind-merge'

export const getConfig = () => {
    const { isNumber, isTshirtSize, isArbitraryValue, isArbitraryVariable /* …used validators… */ } = v

    const scale6 = ['inherit', 'current', 'transparent', { brand: [isNumber] } /* …exact theme colors… */]

    return {
        cacheSize: 500,
        theme: {},
        classGroups: {
            'font-size': [{ text: ['base', 'huge' /* from --text-huge */, isTshirtSize /* … */] }],
            'text-color': [{ text: [...scale6, 'primary' /* from --text-color-* */, isArbitraryVariable, isArbitraryValue] }],
            // … ~300 groups, structurally identical to the default config …
        },
        conflictingClassGroups: { /* carried over, minus pruned groups */ },
        conflictingClassGroupModifiers: { 'font-size': ['leading'] },
        postfixLookupClassGroups: ['container-type'],
        orderSensitiveModifiers: [/* … */],
    } satisfies Config<string, never>
}

export const twMerge = createTailwindMerge(getConfig)
```

Notable mechanics:

- **Validator identity → import name.** The generator walks the skeleton, and every function it encounters is either a theme getter (`isThemeGetter === true` — substituted) or one of the 25 public validators (matched by identity against the `validators` namespace, emitted as `v.<name>`). Shared scales are hoisted into local consts to keep the output small and readable.
- **Derived, not maintained.** Theme values, sub-namespace links, custom utilities, prefix, and `--spacing` behavior are all read or probed from the design system at generation time. The only maintained knowledge is what the repo maintains today anyway (`default-config.ts`) plus the small probe harness and emitter.
- **Empirical classification beats tables even on weird inputs.** Sub-namespace support ended up implemented as a vanilla-diff correction pass instead of the sentinel probing sketched during the interview — it answers the actual question directly: which classes did *this* theme create, and which group owns each one. New classes (project class list minus vanilla class list, from the same Tailwind install) that the standard namespace flow doesn't already classify are matched against candidate groups derived from their vanilla siblings, each represented by one exemplar's declared-property signature: `text-primary` declares `color` like `text-red-500` does, not `font-size` like `text-xl`. Flat-map oddities stay handled — `--text-color-primary` simultaneously makes `text-primary` a color and `text-color-primary` a font size, and both land correctly. Ambiguous or unmatched classes are reported (`unassignedClasses`), never guessed.
- **Name collisions resolve per class, empirically.** A theme value name can shadow an existing class, and Tailwind's resolution differs per utility: with `--color-xl` defined, `text-xl` really becomes a color while `drop-shadow-xl` stays a size — and `bg-bottom` with `--color-bottom` compiles into one rule declaring both a color and a position. The augmentation pass re-checks every class whose classification changed relative to vanilla against its compiled declarations: correct changes stand, wrong claims get the shadowing value removed from that group's own scale copy ('restore'), and multi-utility classes get every claim removed so they pass through unmerged ('neutralize' — conflicting them away in either direction would silently lose part of their effect). All of it lands in the report (`resolvedCollisions`).
- **Custom `@utility`:** support is empirical, derived entirely from each utility's compiled declarations, in three tiers (revised after the 2026-08-09 field test, see §10). A static utility whose declarations match exactly one built-in group's signature — same context-qualified properties, same unconditional element-level property set — is an alias and joins that group (shadcn's `border-grid` is `border-color: var(--border)` and merges with border colors in both directions). Every other root becomes its own self-conflict group (static roots as single classes, functional roots matching any value), and when a utility's declarations fully cover what another group sets, an override edge is added so the utility coming later removes the covered class (`btn` with `padding` + `border-radius` removes an earlier `p-4`; the reverse direction stays out because `p-4` only overrides part of `btn` — the same partial-override rule the default config applies between `px` and `p`). Full cover is condition- and target-aware: only unconditional element-level declarations override, custom properties are state carriers that must be re-declared to count as covered, and pseudo-element or media-query declarations count only as byte-identical shared scaffolding (supabase's `hit-area-*` family composes instead of colliding because each side carries state in its own `--hit-area-*` variable behind identical `::before` scaffolding).
- **Lazy by construction.** Everything is built inside `getConfig`, which `createTailwindMerge` invokes on the first `twMerge` call — module evaluation allocates nothing, matching the library's lazy-init design (measured: import ~1.4 ms, first call ~2.9 ms including config build, on par with the default `twMerge`).
- **Size is measured, not assumed.** Two emitter insights came out of measurement: validator references are destructured into bare identifiers because property accesses like `.isArbitraryVariable` survive minification while local bindings get mangled, and deduplicating repetition into shared consts shrinks the minified size but *grows* the compressed size, because references add entropy where gzip/brotli handled the repetition nearly for free. The default sharing policy (`'scales'`) optimizes compressed size — the metric network transfer pays — while an `'aggressive'` mode optimizes minified size; the measured numbers live on `EmitOptions.sharing`.
- **Composability preserved.** Exporting `getConfig` alongside `twMerge` lets users keep layering: `createTailwindMerge(getConfig, myExtension)`, `mergeConfigs`, or feeding it to `tailwind-variants`-style wrappers.
- **Fidelity (decided in the 2026-08-08 interview): exact theme from the start, with scale compression.** Scales are generated from the actual theme rather than mimicking today's loose validators, but "exact" does not mean "enumerate everything": when the tail of a scale's names adheres to a validator, the generator emits the validator instead of the values. Example: default color families with numeric shade tails compress to `{ red: [v.isNumber], orange: [v.isNumber], … }` (the class-group trie already supports nested parts), and a t-shirt-shaped size scale compresses to `[v.isTshirtSize]` plus enumerated outliers like `'huge'`. The governing rule: **never undermatch a class that exists; overmatching nonexistent names inside a known prefix is acceptable when it saves bytes.** Among candidate encodings (full enumeration, whole-scale validator + outliers, and prefix-factored families whose tails are recursively encoded the same way — numeric tails end in a validator, word tails enumerate without repeating the prefix, multi-segment names factor further) the generator picks the smallest emitted representation, with a per-family cost gate so short families keep the cheaper flat form. Structural factoring measures smaller on minified and (usually) compressed output alike — unlike reference-based sharing, it removes repetition without adding entropy. Rationale: this is a new project, so breaking-change cost is at its lifetime minimum — optimize for genuinely good behavior now and hold backwards compatibility later, instead of inheriting the default config's known misclassifications for compatibility's sake.

## 6. Correctness and size strategy

Because exact mode deliberately diverges from today's `twMerge` on nonexistent class names, "equivalence with the default config" is scoped down from a blanket gate to an existing-classes gate plus a reviewed divergence report:

1. **Existing-class gate:** for class names that exist in the vanilla theme (sourced from `getClassList()` and the existing test corpus), a generated-from-vanilla-CSS instance must produce the same merge results as today's `twMerge`. The ~250-assertion corpus gets parametrized to run against both, minus assertions that intentionally exercise nonexistent names.
2. **Divergence snapshot:** a structural diff of `createClassMap(generated)` vs `createClassMap(getDefaultConfig())` (existing `tests/class-map.test.ts` machinery) is committed as a reviewed snapshot, so every behavioral divergence — expected: nonexistent names that today's loose validators misclassify — is visible and deliberate rather than accidental.
3. **Conformance sweeps + scenarios:** the invariant generalized to every fixture (`assertTailwindConformance`): for each consecutive pair of the design system's class list, the generated result must equal default `twMerge`'s — and where the two configs disagree, Tailwind referees via compiled declarations. The oracle parses the compiled CSS into declarations annotated with render target (the element itself, a pseudo-element, a combinator tail) and conditionality (media/supports wrappers, pseudo-class guards) — refined in the 2026-08-09 field test after shadcn's `border-ghost` (border color only on `::after`) and supabase's `mask-composite: intersect` scaffolding produced false conflicts. Rules: identical signatures conflict; interference needs a real CSS property in the same render target, including shorthand↔longhand pairs recognized through CSS's systematic naming (`inset` ↔ `inset-block-end`, `border-radius` ↔ `border-bottom-right-radius`); byte-identical re-declarations are idempotent and never conflict; conditional declarations and `--tw-*`-only overlap are composition; when the second class fully subsumes the first (identical scaffolding plus overridden state), merging and keeping are both accepted; neutralized multi-utility classes are exempt. Fixtures modeled on real-world patterns — semantic tokens, compat sub-namespaces with resets, a disabled spacing multiplier, heavy resets, adversarial value names, wild name shapes and mixed `@theme` blocks, multi-file imports — each run the sweep plus curated scenario expectations reproducing [#684](https://github.com/dcastil/tailwind-merge/issues/684), [#657](https://github.com/dcastil/tailwind-merge/issues/657), and [#631](https://github.com/dcastil/tailwind-merge/issues/631).
4. **Version matrix:** run the probe + generation suite against tailwindcss 4.0 → latest in CI to catch `__unstable__` drift early.
5. **Size tracking:** measure generated bundles (esbuild + brotli, same approach as `.github/actions/metrics-report`) for three scenarios — vanilla, heavy custom theme, heavy resets — and compare against `twMerge`. Expectation to validate: vanilla ≈ parity, resets < default, custom themes ≈ parity while being *correct* (which `extendTailwindMerge` setups only achieve with manual work, on top of the full default config).

## 7. Repo integration

The repo is already a pnpm workspace (`pnpm-workspace.yaml` lists `.` and `.github/actions/metrics-report`), so the prototype lives as a sideways workspace package — originally `configurator/`, since the 2026-08-09 restructure `packages/configurator/` next to the Vite plugin (§11.7 decision 6). Wiring needed when code lands (this commit is docs-only):

- Add `configurator` to `pnpm-workspace.yaml` and regenerate the lockfile (CI runs `pnpm install --frozen-lockfile`). New deps must satisfy `minimumReleaseAge` (3 days).
- ESLint runs repo-wide with `--max-warnings 0` and root-anchored ignores: add `configurator/dist` to ignores and a scoped override (a CLI needs `console`, `import/no-default-export` may need relaxing for config files).
- Root vitest auto-collects any `configurator/**/*.test.ts` (no `include` filter is set); either embrace that or give the package its own vitest project. Root `tsc` covers only `src/`, so the package brings its own `tsconfig` + type-check script.
- `files: ["dist", "src"]` in the root package.json already keeps the folder out of the npm tarball.
- Publishing form (separate package `tailwind-merge-configurator` vs a subpath export) is deliberately deferred; a subpath would drag build-time deps toward the runtime package, so a separate package is the working assumption.
- Dependency boundaries are publishing-ready: the configurator consumes tailwind-merge only through its package entry points — the public API plus the explicitly unstable `tailwind-merge/unstable-do-not-import` entry for classification — resolved through the package name (`tailwind-merge` and `tailwindcss`/`@tailwindcss/node` are peerDependencies, workspace-linked via devDependencies for local development). The peer ranges state what is actually supported: `tailwind-merge ^3.7.0` — the first release shipping `themeKey` on theme getters and `createClassGroupUtils`, which the configurator requires and guards with a clear error — and `tailwindcss`/`@tailwindcss/node` `^4.3.3`, the only line the suite has run against so far (the P4 version matrix is what widens it). Tests resolve the package name to the library source via a vitest alias (mirroring the tsconfig paths mapping) so CI needs no build before testing.

## 8. Phased plan

- **P0 — research + feasibility spike.** Done (this document; spike verified against 4.3.3).
- **P1 — vanilla exactness.** Done. Skeleton-transform generator + emitter with scale compression, full-sweep differential over all ~23k consecutive class-list pairs with Tailwind-as-oracle adjudication (`candidatesToCss` declaration overlap), intended-divergence snapshot, size measurement. Result: zero oracle failures; the only divergences from current `twMerge` on existing classes are two cases around `shadow-inner` where the default config is provably wrong today; vanilla bundle at compressed parity (7,706 B vs 7,463 B brotli, +3.3%; 8,822 B vs 8,516 B gzip) under the compressed-optimal default sharing policy.
- **P2 — real themes.** Done. Overrides, extensions, resets, `--spacing` logic and compound keys ride on the standard namespace flow; classes from compat sub-namespaces (`--text-color-*`, `--background-color-*`) and from namespaces without a tailwind-merge theme key (`--z-index-*`, `--border-width-*`) are picked up by the vanilla-diff augmentation pass and classified by declared-property signatures (negative variants normalize to their positive form). Exit criteria met: the sub-namespace fixture merges correctly with issues #684/#657/#631 reproduced as passing tests, reset palette values stop merging, a disabled `--spacing` multiplier removes numeric spacing classes, and the fixture bundle stays at compressed parity (7,684 B brotli vs 7,463 B for the default config) while being correct where the default config is broken.
- **P3 — ecosystem completeness.** Done, except the Tailwind version matrix (moved to P4 as CI work). Prefix mode works end to end (theme variables are stored prefixed and get stripped during namespace bucketing; the emitted config carries tailwind-merge's `prefix` option; the classifier configs run unprefixed since class-list names are unprefixed) — verified by curated expectations only, since the conformance sweep's default-config baseline is meaningless under a prefix. Custom `@utility` support landed in its bounded self-conflict form and turned out to cover `@plugin`-registered utilities for free, because both land in the same utilities registry — one registry diff serves both. `@config` JS themes flow through Tailwind's compat layer into namespaced variables and needed no configurator changes at all, only fixtures. The CLI gained `--check` (regenerate in memory, compare against the file on disk, non-zero exit on drift — full-content comparison works because emission is deterministic per input state).
- **P4 — future.** Used-class scanning ("minification" of the config), bundler plugins with virtual modules + HMR (Vite plugin design researched 2026-08-09, see §11), a Tailwind version matrix in CI (probe + generation suite against tailwindcss 4.0 → latest to catch `__unstable__` drift early), and — with adoption data in hand — reopening the upstream conversation with the Tailwind team.

Custom `@utility` scope (decided in the 2026-08-08 interview as self-conflict-only, **revised in the 2026-08-09 field-test session with Dany's sign-off**): the original decision ruled out cross-group conflict inference on the fear of large, misleading configs. The field test showed the fear was overblown (real projects register 8–26 custom utilities, a handful of override entries each) and that the missing conflicts are the essence of tailwind-merge — shadcn's `border-grid` genuinely fights with border colors. Support is now the three-tier empirical model described in §5: alias classification into built-in groups, self-conflict groups, and directional full-cover override edges, all derived from compiled declarations with no maintained knowledge. What remains out of scope: override edges from built-in groups toward custom utilities (alias classification covers the meaningful cases), and any inference from conditional or pseudo-element declarations, which conservatively keep classes side by side. Inference is exemplar-based like classification — one class stands in per group — which is exact for custom utilities and an approximation for built-in groups.

## 9. Decisions from the 2026-08-08 design interview

1. **Theme source: the project's own `tailwindcss` install**, loaded via the design-system API (IntelliSense/prettier-plugin pattern). No pinned parallel Tailwind, no hand-rolled CSS parsing.
2. **Output shape: a ready `twMerge` module** built with `createTailwindMerge`, exporting the config object alongside for composability, importing `createTailwindMerge` + `validators` from `tailwind-merge`.
3. **Fidelity: exact theme from the start, with scale compression** — see section 5. Never undermatch existing classes; overmatch nonexistent tails within known prefixes when it saves bytes; smallest encoding wins. Rationale: breaking-change cost is lowest now; make behavior genuinely good first, hold compatibility later.
4. **Must-have scope: compat sub-namespaces and prefix support.** Custom `@utility` was initially in only as bounded self-conflict registration; the 2026-08-09 field test revised this to the three-tier empirical model (alias classification, self-conflict groups, full-cover override inference — see sections 5 and 8), on Dany's call that cross-group conflicts are an essential tailwind-merge feature.

Still open, to resolve during implementation:

1. Emission details: TS vs JS default, `cacheSize` passthrough, multiple CSS entrypoints (multi-theme monorepos), deterministic formatting (prettier config of the host repo vs fixed style).
2. Naming and eventual packaging (working assumption: separate package, working name `tailwind-merge-configurator`).
3. Small additive tailwind-merge API candidates that would benefit the configurator without any runtime fork (see option F): individual validator exports, `themeKey` on theme getters, a public class-map/classification hook.

## 10. Field test against real-world CSS (2026-08-09)

Before making the package shippable, the generator ran against six public Tailwind v4 entrypoints — configurations nobody would invent in a fixture. Per file: generate, then the full conformance sweep. Initially a temporary probe over downloaded files; the six projects are all permissively licensed, so pinned, attributed copies now live in `tests/fixtures/real-world/` (see its README for sources and preprocessing) and run permanently in `real-world.test.ts`, with each generated module committed as a reviewable snapshot — which doubles as documentation of what output looks like for real projects.

| Project | Preprocessing deviations | Pairs checked | Result |
| --- | --- | --- | --- |
| shadcn/ui `apps/v4/app/globals.css` (+ `legacy-themes.css`) | stripped `tw-animate-css`, `shadcn/tailwind.css` | 25,334 | pass, 5 improvements over default |
| supabase `packages/config/tailwind.config.css` (+ 11 local files) | stripped `@tailwindcss/typography`, `@tailwindcss/forms`, `tw-animate-css`, `@config './typography.config.js'` | 33,665 | pass, 2,035 improvements |
| openai/openai-fm `src/app/globals.css` | none | 23,592 | pass, 4 improvements |
| themesberg/flowbite-svelte `src/app.css` (+ `docs.css`) | stripped `@plugin "flowbite/plugin"`, `@plugin "flowbite-typography"` | 24,307 | pass, 2 improvements |
| kagisearch/kite-public `src/app.css` | stripped `overlayscrollbars` CSS import | 27,644 | pass, 26 improvements |
| remix-run/remix-store `app/tailwind.css` | stripped `tw-animate-css` | 9,577 | pass, 7 improvements |

Wall time per file: generation 0.1–1.3 s, sweep under 0.2 s. `unassignedClasses` was empty for every file. All "improvements" are pairs where the generated config matches Tailwind's real conflict semantics and the default config doesn't — custom z-index/animation/shadow/easing values, named spacing tokens, custom functional utility values, and the known `shadow-inner` default-config bug.

The two initially failing files drove the engine work described in sections 5, 6, and 8:

- **supabase** defines `--background-color-200`, a numeric-named sub-namespace color token: `mask-b-from-200` really is a color stop that composes with position stops. The generated config had it right; the oracle needed the idempotent-re-declaration rule (`mask-composite: intersect` scaffolding). Distilled into the numeric-token fixture in `theme-patterns.test.ts`.
- **shadcn**'s `border-grid`/`border-ghost` and supabase's `hit-area` family drove the custom-utility revision: alias classification, render-target/conditionality-aware declarations, full-cover override inference, and the mutual-cover rule for bare-static-plus-functional roots. Distilled into the custom-utility fixtures in `ecosystem.test.ts`.

Verdict: the generator handles real-world v4 CSS as-is. Remaining known limitation observed in the field files: `@plugin`/`@import` packages must be installed for generation (expected — the real consumer runs in their own project where they are).

A synthetic stress fixture (`tests/stress.test.ts`, snapshot `__snapshots__/stress.snap.ts`) complements the field files with a deliberately extreme case: ~50 custom utilities across every support tier with property counts escalating 1→20, plus scales with 50–100 values mixing compressible numeric families and enumerated names. Results: the emitted module stays compact (48.4 kB min / 8.9 kB brotli — barely above vanilla, because compression eats enumeration), the worst-case override list (a 20-property utility covering 60+ groups and all smaller siblings) is plainly visible in the snapshot, and writing it immediately caught a real inference bug the alphabetical conformance sweep cannot see: the dash-prefix shorthand heuristic wrongly treated `color` as covering `color-scheme` and `overflow` as covering `overflow-wrap`. Fixed with a small enumerated exception list (`UNCONTROLLED_DASH_PREFIXED_PROPERTIES` in design-system.ts) shared by override inference and the test oracle — web-platform facts, stable across Tailwind versions, so a maintained list is acceptable there.

## 11. Vite plugin design (researched 2026-08-09, not yet built)

The plugin-first packaging experiment: a Vite plugin that sits next to `@tailwindcss/vite` and gives the project a `twMerge` configured for its theme, with as close to zero configuration as possible. The configurator core stays unstable behind it; the plugin's options and its import surface become the first stable contract. This section records the research (how `@tailwindcss/vite` actually works, what patterns the ecosystem has validated) and the resulting design. Nothing here is implemented yet; §11.7 lists the open decisions and §11.8 the assumptions a prototype must verify first.

### 11.1 How `@tailwindcss/vite` works (read from source at v4.3.3)

Facts that shape our design, from [`packages/@tailwindcss-vite/src/index.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/%40tailwindcss-vite/src/index.ts) and [`packages/@tailwindcss-node/src/compile.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/%40tailwindcss-node/src/compile.ts):

- **There is no CSS entrypoint option to read.** `tailwindcss()` accepts only `{ optimize }`. The plugin discovers Tailwind roots from Vite's module graph: a `transform` hook filtered to CSS-ish ids compiles *every* CSS file that flows through the pipeline, and keeps a `Root` only if the compiled result reports Tailwind features in use (`AtApply | JsPluginCompat | ThemeFunction | Utilities | Variants`); otherwise the root is dropped again. Multiple roots per app are supported, tracked per Vite environment (`rootsByEnv`). So "ask the Tailwind plugin where the config is" has no answer — the app's own `import './app.css'` is what tells it, lazily, when the module is first requested.
- **Dependency tracking comes from `compile()`.** `@tailwindcss/node`'s `compile(css, { base, onDependency })` reports every file the compiler reads — `@import`ed stylesheets and `@config`/`@plugin` JS modules — and the plugin feeds each into `this.addWatchFile()` plus an mtime map that decides on later transforms whether a rebuild is needed. In dev, `addWatchFile` links those files into the module graph as pseudo-imports of the CSS root, which is what makes an edit to an imported theme file re-transform the root through the whole plugin pipeline.
- **`__unstable__loadDesignSystem` hides dependencies.** The `@tailwindcss/node` wrapper the configurator uses hardcodes a noop `onDependency` into its loaders (compile.ts:106–116), so the configurator currently cannot know which files a generation read. The core `tailwindcss` export accepts custom `loadModule`/`loadStylesheet` hooks, but `@tailwindcss/node` exports only `loadModule`, so reusing its resolution stack for a dependency-reporting loader is not possible without vendoring stylesheet resolution. Consequence: the plugin collects the dependency list with one extra `compile()` call per generation (output discarded, only `onDependency` harvested) — self-contained and version-exact, at the cost of roughly doubling a 0.1–1.3 s generation. The clean long-term fix is a small upstream PR adding an optional `onDependency` to `@tailwindcss/node`'s `__unstable__loadDesignSystem`, mirroring `compile()`.
- **Packaging precedent for "single install":** `@tailwindcss/vite` declares `tailwindcss` and `@tailwindcss/node` as regular *dependencies*, not peers (its package.json). `vite-plugin-pwa` does the same with workbox. Bundling the runtime inside the plugin package is an established pattern, not an anomaly.
- **Vite compatibility:** peer range `^5.2.0 || ^6 || ^7 || ^8`, using newer hook forms (object hooks with `filter`) that older Vite versions simply treat as unfiltered handlers — progressive enhancement instead of a hard floor. Sibling packages `@tailwindcss/webpack` and `@tailwindcss/turbopack` exist since 4.3, confirming the bundler-plugin family model our library-first core anticipated (§2 goal 5); Next.js/Turbopack support would be siblings on the same core, out of scope for this experiment.

### 11.2 Import surface: a real subpath the plugin redirects

The central UX decision is how the generated `twMerge` reaches user code. Three candidates:

- **Generated file on disk** (TanStack Router's `routeTree.gen.ts`, contentlayer, `unplugin-auto-import`'s d.ts): visible and committable, but brings exactly the failure mode this experiment wants to avoid — TypeScript servers and caches going stale on regeneration, plus git noise and invited hand-edits. The CLI already serves users who explicitly want a file; the plugin should not need one.
- **`virtual:` module** (vite-plugin-pwa, UnoCSS): the classic mechanism, but types require a shipped `declare module` ambient file plus a tsconfig `types` entry or triple-slash reference, and the specifier is dead outside Vite — Jest, plain Node scripts, and editors with misconfigured types all break ([vite-pwa/vite-plugin-pwa#277](https://github.com/vite-pwa/vite-plugin-pwa/issues/277) is the canonical papercut).
- **Real package subpath, redirected by the plugin** (recommended): the plugin package ships a real module, `@tailwind-merge/vite/runtime` (naming decided in §11.7), whose on-disk implementation re-exports default-config `twMerge` from tailwind-merge as a fallback. The plugin's `resolveId` intercepts exactly this specifier and serves the generated module instead. TypeScript and editors resolve the subpath's static `.d.ts` through ordinary package resolution — zero tsconfig setup, and the type surface never changes because generation only changes values, not exports. Outside Vite (Jest, Storybook without the Vite config, one-off Node scripts) the import still works with default behavior instead of erroring.

The virtual module's content is the configurator's `emitModule` output verbatim — the core needs no changes for this. Two pieces of config the plugin must inject via its `config()` hook, both established practice (vite-plugin-svelte et al.): `optimizeDeps.exclude` for the subpath, so esbuild prebundling doesn't bypass `resolveId` and freeze the fallback in dev, and `ssr.noExternal` for the package, so SSR builds also see the generated module — otherwise server and client would merge classes differently and produce hydration-visible class-string drift.

Explicitly rejected for v1: intercepting bare `import { twMerge } from 'tailwind-merge'` and redirecting it to the generated module. It would make existing app code and even third-party UI libraries theme-aware with zero migration, but silently changing the behavior of a package the user (or their dependencies) explicitly installed is too magical for a first release — worth revisiting later as an opt-in flag once trust is established.

### 11.3 Single install: tailwind-merge as an internal dependency

Users install one package: the plugin. `tailwind-merge` becomes a regular dependency of the plugin package (the `@tailwindcss/vite`→`tailwindcss` precedent), and the subpath re-exports everything users need (`twMerge`, `twJoin`, `getConfig`, the `ClassNameValue` type). The generated module's own `import ... from 'tailwind-merge'` is resolved by the plugin to its bundled copy (importer-scoped `resolveId`), which works under pnpm's strict linking without the user declaring tailwind-merge anywhere.

What this buys: the emitted-code format and the runtime that executes it ship in the same release and can never drift apart — the configurator↔library version-coupling question (§7) disappears for plugin users. And the plugin controls when to adopt a new tailwind-merge, turning library upgrades into plugin releases users get for free.

The cost: a project that also depends on tailwind-merge directly (every shadcn template does) bundles two copies until it migrates — remove the dependency, rewire the one import in `lib/utils`. The plugin can detect user-level `tailwind-merge` in the project and print a one-time migration hint. Third-party libraries that bundle their own tailwind-merge keep their own default-config behavior either way; only the interception experiment above could ever change that.

The Tailwind side is different: the design system must be loaded by the *same* compiler that builds the app's CSS, or the generated config can disagree with the real build (theme defaults change between 4.x minors). So `tailwindcss`/`@tailwindcss/node` must not be pinned inside our plugin. Resolution order: resolve `@tailwindcss/node` through the project's `@tailwindcss/vite` installation (`createRequire` from the resolved `@tailwindcss/vite/package.json` — exactly the copy the CSS build uses), fall back to a plugin-declared dependency with a loud warning if that fails. The CSS-side `@import 'tailwindcss'` resolves from the CSS file's directory, same as the real build, so both sides see the project's own Tailwind.

### 11.4 Root discovery: eager and filesystem-based, verified against the pipeline

The virtual module can be requested before any CSS has flowed through the pipeline (module order inside an entry is not guaranteed, and differs per environment), so discovery cannot wait for the Tailwind plugin's lazy root detection — it must complete before the first `load` of the virtual module can answer. Design:

1. An optional `css` plugin option always wins (also the escape hatch for genuinely ambiguous projects).
2. Otherwise, at `configResolved`: a bounded glob for `**/*.css` under the Vite root (skipping `node_modules`, `.git`, and build outputs), reading each file and keeping those with Tailwind root markers (`@import "tailwindcss"` and its subpath variants, `@theme`, `@config`, `@plugin`, `@tailwind`). Among multiple candidates, drop any that another candidate `@import`s (a root is the top of its own import graph). Exactly one survivor → the root. Several → a hard error naming them and pointing at the `css` option. None → warning + fallback default config, so `twMerge` keeps working while the user wires things up.
3. As diagnostics, a passthrough `transform` on CSS ids cross-checks reality: if a file the pipeline processes turns out to be a Tailwind root (marker check on raw disk content) and is not the chosen root, warn — catches wrong picks and multi-root apps early.

Monorepos fall out naturally: the Vite root is per app, so each app's dev server discovers its own CSS and generates its own config. Multiple Tailwind roots inside one Vite app (two independent themes) are explicitly unsupported in v1 — one app, one `twMerge`.

### 11.5 Dev loop: stability by construction, invalidation by dependency watching

The property Dany wants — the dev-time config changing only when the Tailwind configuration changes — holds by construction: v1 generation reads only the CSS config graph, never scanned class usage, so editing components cannot move the config. On top of that, a content gate makes even CSS edits cheap: most `app.css` edits (adding utility classes, `@apply` tweaks) don't change the theme, and regeneration produces byte-identical output that triggers nothing.

Mechanics: generation kicks off eagerly at server start (async; the virtual module's `load` awaits the in-flight result, so cold start hides the 0.1–1.3 s behind the first page load). Each generation also runs the dependency-collecting `compile()` (§11.1) to learn the root's import graph; dependencies outside the Vite root — the supabase-style shared config package in a monorepo — are added to `server.watcher` explicitly, since chokidar only covers the root by default. A `hotUpdate` hook (with `handleHotUpdate` fallback for pre-6 Vite) filters changes against the dependency set: on a hit, regenerate (debounced), compare the emitted code's hash, and only on a real change invalidate the virtual module in every environment's module graph and send a full reload. Full reload rather than HMR propagation is deliberate: merged class strings are baked into the rendered DOM, so hot-swapping `twMerge` alone cannot fix what's already on screen — the same reasoning behind `@tailwindcss/vite`'s own full-reload behavior for scanned files.

The self-contained dependency mechanism was chosen over the tempting alternative of piggybacking on `@tailwindcss/vite`'s bookkeeping (observing re-transforms of the root CSS module, which its `addWatchFile` calls already trigger on any dependency change). The piggyback costs nothing but only fires when a browser tab re-requests the CSS, does nothing in `vite build --watch`, and couples our correctness to another plugin's internals; the extra `compile()` per regeneration buys independence from all three.

Failure semantics: in dev, a failed generation (broken CSS mid-edit, missing `@plugin` package) logs loudly and keeps serving the last good module — never crash the dev server over a merge config; Tailwind's own overlay already surfaces the CSS error itself. In builds, generation failure fails the build.

### 11.6 Build loop and the future minification split

`vite build` generates once at `buildStart` (the same eager kickoff), and deterministic emission makes the client and SSR passes byte-identical whether or not they share a process. The virtual module `addWatchFile`s the collected dependencies in build mode so `--watch` rebuilds regenerate correctly. The banner records input path, content hash, and versions, as the CLI does today.

The dev/prod split Dany sketched maps cleanly onto this architecture: when P4 minification (used-class scanning) exists, it runs only in production builds — dev keeps the full, usage-independent config so the dev-time module never churns with class usage, and Vitest (which runs the dev pipeline through the user's Vite config, plugin included) tests against exactly what dev serves. The gate minification must then pass: identical merge behavior to the full config for every class that survives into the final bundle.

### 11.7 Decisions (resolved with Dany, 2026-08-09)

1. **Names.** The npm org `@tailwind-merge` is reserved — the package is `@tailwind-merge/vite`, plugin factory `tailwindMerge()` (default export, matching `@tailwindcss/vite`'s shape). The runtime subpath is `@tailwind-merge/vite/runtime`: it names the architectural role (the half that ships to the browser, vs the plugin that runs at build time), it is ecosystem-conventional (`react-refresh/runtime`, `@unocss/runtime`), and it is the word the deferred standalone `@tailwind-merge/runtime` package would inherit when a second bundler plugin exists (§7's revisit condition), keeping the migration story straight. Rejected: `/tw-merge` and `/merge` undersell a module that also exports config and validators; `/tailwind-merge` (the drop-in-mirror reading, `@tailwind-merge/vite/tailwind-merge`) is self-documenting but stutters; `/client` implies browser-only, and SSR imports it too. The API principle behind the subpath: it mirrors tailwind-merge's public surface with the project-generated config swapped in — `twMerge` and `getConfig` are the generated ones, `extendTailwindMerge` extends the generated config instead of the default one, and `twJoin`, `createTailwindMerge`, `mergeConfigs`, `validators`, and the public types re-export unchanged, so users never need a direct tailwind-merge dependency for customization either. (`fromTheme` is the one exception to think through during implementation: generated configs materialize scales inline and ship an empty `theme` object, so default-config theme getters have nothing to resolve against.)
2. **Single-install shape** (§11.3): confirmed. tailwind-merge is a regular dependency of `@tailwind-merge/vite`; no dual-copy warning for now — the docs make the relationship clear, and loudness can be revisited if confusion shows up.
3. **Fallback loudness**: silent-but-documented. A warning has no reliable "am I in a test" signal and would fire in every Jest run.
4. **Reload semantics**: full reload on config change, matching Tailwind's own behavior.
5. **Vite floor**: start at Vite 6+ (`^6 || ^7 || ^8`). Dany delegated this; the deciding factor is that 6+ allows a single code path against the Environment API (`hotUpdate`, `server.environments`) instead of dual HMR handling, and this is a new project with no existing users — widening down to 5.2 later is purely additive (a `handleHotUpdate` shim) if demand appears.
6. **Repo layout**: a `packages/` directory with sibling packages — `packages/configurator/` and `packages/vite/` now, migrating the root `tailwind-merge` package into `packages/tailwind-merge/` later. The vite plugin depends on the configurator via `workspace:*`. Workspace note: adding a `vite` devDependency must clear `minimumReleaseAge` (3 days), and Vitest 4 itself runs on Vite — keep versions compatible.

### 11.8 Assumptions a prototype must verify first

Each of these is believed from source reading but unverified in a running harness — they are the experiment in "experiment with a Vite plugin":

1. `resolveId` interception of the real subpath wins in dev with `optimizeDeps.exclude` set, including the cold-start scan (no prebundled fallback sneaking in).
2. The importer-scoped redirect of `'tailwind-merge'` inside the virtual module resolves to the plugin's bundled copy under pnpm strictness.
3. `ssr.noExternal` + invalidation across `server.environments` gives SSR dev the generated module and reloads it on config change.
4. The dependency-collecting `compile()` reports the same file set the real build reads (spot-check against `@tailwindcss/vite`'s watch list on the fixtures).
5. Vitest with the user's Vite config picks up the plugin and serves generated behavior in tests (Vitest 4 / Vite 7 combination in this workspace).
6. Types on the subpath resolve with zero tsconfig configuration in a fixture project (`tsc --noEmit` against a consumer fixture).
7. Build determinism: client and SSR build passes emit byte-identical virtual modules on the real-world fixtures.
8. `hotUpdate` fires for watched files outside the Vite root after `server.watcher.add` (the monorepo shared-theme case).
