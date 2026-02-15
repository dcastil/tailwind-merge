# tailwind-merge internals guide

This file is a practical map for agent-driven changes in this repo.

## How merge execution works

1. `twMerge` in `src/lib/tw-merge.ts` is created via `createTailwindMerge(getDefaultConfig)`.
2. `createTailwindMerge` in `src/lib/create-tailwind-merge.ts`:
   - lazily builds config utils on first call,
   - joins inputs via `twJoin`,
   - caches final joined-input results,
   - calls `mergeClassList` on cache miss.
3. `mergeClassList` in `src/lib/merge-classlist.ts`:
   - parses classes,
   - walks from right to left so "last class wins",
   - resolves class group IDs and asymmetric conflicts,
   - keeps non-Tailwind/external classes untouched.
4. `createClassGroupUtils` in `src/lib/class-group-utils.ts`:
   - compiles class definitions into a recursive map + validator list,
   - maps class names to class group IDs,
   - returns conflicting groups, including postfix-modifier conflicts.
5. `createParseClassName` in `src/lib/parse-class-name.ts`:
   - parses stacked modifiers with bracket/paren depth tracking,
   - supports important modifier (`!`) and legacy v3 position,
   - supports optional prefix and `experimentalParseClassName` override.
6. `createSortModifiers` in `src/lib/sort-modifiers.ts`:
   - alphabetically sorts non-sensitive modifiers,
   - preserves placement around arbitrary/order-sensitive modifiers.

## Files to edit by intent

- Add or change Tailwind utility support:
  - `src/lib/default-config.ts`
  - Usually paired with tests in `tests/tailwind-css-versions.test.ts` and focused utility tests.

- Change conflict behavior:
  - `src/lib/default-config.ts` (`conflictingClassGroups`, `conflictingClassGroupModifiers`)
  - `tests/class-group-conflicts.test.ts`
  - `tests/conflicts-across-class-groups.test.ts`

- Change parser/modifier behavior:
  - `src/lib/parse-class-name.ts`
  - `src/lib/sort-modifiers.ts`
  - `tests/modifiers.test.ts`
  - `tests/arbitrary-variants.test.ts`
  - `tests/experimental-parse-class-name.test.ts`

- Change config extension APIs:
  - `src/lib/extend-tailwind-merge.ts`
  - `src/lib/create-tailwind-merge.ts`
  - `src/lib/merge-configs.ts`
  - `tests/create-tailwind-merge.test.ts`
  - `tests/extend-tailwind-merge.test.ts`
  - `tests/merge-configs.test.ts`
  - `tests/type-generics.test.ts`

- Change validators:
  - `src/lib/validators.ts`
  - `tests/validators.test.ts`
  - Any impacted arbitrary-value tests

## Testing strategy in this repo

- Unit/behavior tests are granular by feature area in `tests/*.test.ts`.
- `tests/tailwind-css-versions.test.ts` is the compatibility anchor for Tailwind feature coverage by version.
- `tests/docs-examples.test.ts` enforces that documented `twMerge(...) // -> ...` examples stay correct.
- `tests/public-api.test.ts` guards runtime exports and broad type usage.
- `tests/tw-merge.benchmark.ts` is for performance benchmarking (`yarn bench`), not correctness gating in CI.

Recommended local sequence for non-trivial changes:
1. `yarn lint`
2. `yarn test`
3. `yarn build`
4. `yarn test:exports`

## Build, packaging, and release notes

- Build uses Rollup (`scripts/rollup.config.mjs`) to produce:
  - ESM and CJS bundles,
  - ES5 variants,
  - unified type declarations.
- Export smoke tests:
  - `scripts/test-built-package-exports.cjs`
  - `scripts/test-built-package-exports.mjs`
- `README.md` is generated from `docs/README.md` by `scripts/update-readme.mjs` (run in `version` script via `zx`).

### Release notes playbook

Detailed release-specific agent workflow lives in:

- `.agents/release-workflow.md`

## CI behavior (what must stay green)

- `.github/workflows/test.yml` runs `yarn lint`, `yarn test`, `yarn build`, and `yarn test:exports`.
- `.github/workflows/benchmark.yml` runs `yarn bench` with CodSpeed.
- `.github/workflows/npm-publish.yml`:
  - publishes `dev` tag on `main` pushes,
  - publishes production on release events.
- `.github/workflows/comment-released-prs-and-issues.yml`:
  - runs local action `.github/actions/release-commenter`,
  - supports manual `workflow_dispatch` with optional `head_tag`, `base_tag`, and `dry_run`.

## Practical guardrails

- Keep `README.md` edits synchronized with `docs/README.md`; source-of-truth is docs.
- Do not rely on `dist/` as edit target; regenerate instead.
- Favor targeted tests while iterating, then run full suite before finalizing.
- Any behavior change should include at least one regression test.
