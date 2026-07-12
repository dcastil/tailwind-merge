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
  - For a full Tailwind CSS version update, follow `agents/tailwind-css-version-update.md`.

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
- `tests/tw-merge.benchmark.ts` is for performance benchmarking (`pnpm bench`), not correctness gating in CI.

Recommended local sequence for non-trivial changes:
1. `pnpm lint`
2. `pnpm test`
3. `pnpm build`
4. `pnpm test:exports`

## Build and packaging

- Build uses Rollup (`scripts/rollup.config.mjs`) to produce:
  - ESM and CJS bundles,
  - ES5 variants,
  - unified type declarations.
- The `build` script passes Rollup `--forceExit` because the TypeScript Rollup plugin can leave referenced file-watch handles open after a non-watch build has already written all outputs.
- Export smoke tests:
  - `scripts/test-built-package-exports.cjs`
  - `scripts/test-built-package-exports.mjs`
- `README.md` is generated from `docs/README.md` by `scripts/update-readme.mjs` (run in `version` script via `zx`).

## CI Behavior And Security

Treat this section as the source of truth for CI and publish security guardrails. Keep detailed CI guidance here instead of duplicating it in `AGENTS.md` unless a rule is critical enough to be visible before opening specialized docs.

- The repo uses a pnpm workspace rooted at `pnpm-workspace.yaml`; the root package remains `tailwind-merge`, and `.github/actions/metrics-report` is a workspace package so action dependencies share the root lockfile.
- pnpm 11 requires Node 22 or newer and no longer reads pnpm-specific settings from `.npmrc` or the `pnpm` field in `package.json`; keep repository settings in `pnpm-workspace.yaml`.
- CI enables Corepack so the root `packageManager` pin selects the pnpm version before every frozen install. For pnpm major updates, run both `pnpm install` and `pnpm install --frozen-lockfile` with the new pinned version, and commit any lockfile migration produced by the non-frozen install.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320` (minutes, i.e. three days) with `minimumReleaseAgeStrict: true`, so dependency versions must be at least three days old before pnpm installs them. It also allows the `esbuild` dependency build script because the metrics action imports esbuild directly.
- `.github/renovate.json` sets `minimumReleaseAge: "4 days"` (all datasources) so Renovate never proposes versions that pnpm strict mode would reject during lockfile updates; the extra day over pnpm's three days is a deliberate buffer against boundary races. If the pnpm cooldown changes, keep the Renovate value at least as large. Renovate exempts vulnerability alerts from its cooldown, but pnpm strict mode still blocks immature versions at install time; use pnpm's `minimumReleaseAgeExclude` if a security fix must land early.
- `.github/workflows/test.yml` runs `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:exports`.
- `.github/workflows/benchmark.yml` runs `pnpm bench` with CodSpeed tokenless uploads for this public repository; do not pass static CodSpeed upload tokens to jobs that execute PR benchmark code.
- `.github/workflows/codeql-analysis.yml` runs CodeQL for both JavaScript/TypeScript and GitHub Actions workflows; the Actions analysis uses the `security-extended` query suite to catch workflow-specific security issues. It also runs on PRs that touch `.github/actions/**` or `.github/workflows/**` so CI-control-plane changes are scanned before merge.
- Every workflow should declare explicit least-privilege `permissions`; read-only build/test jobs use `contents: read`, and write scopes should appear only on the jobs that need them.
- Use `persist-credentials: false` on `actions/checkout` unless the job must push commits or tags through git.
- Third-party GitHub Actions that receive secrets or write-capable tokens are pinned to full commit SHAs with comments showing the source tag or branch.
- Artifact handoffs intentionally pair `actions/upload-artifact@v7` with `actions/download-artifact@v8` because the two actions have different latest major versions; do not try to align their version numbers unless upstream releases change.
- Local JavaScript GitHub Actions use `runs.using: node24`; keep action scripts compatible with the declared runner and avoid runtime-fragile ESM features, such as JSON module import assertion syntax, when a simple filesystem read works across supported Node versions.
- `.github/workflows/metrics-report.yml` keeps PR code execution in a read-only `generate-report` job and posts comments from a separate `post-comment` job that checks out trusted base-repo code. The metrics report action itself only writes the generated comment body to the artifact path and must not post PR comments directly. If a transition PR introduces or moves the trusted posting script, the workflow should skip the `post-comment` job at the job level until that script exists in the base checkout rather than running PR-provided posting code with write permissions.
- `.github/workflows/npm-publish.yml`:
  - publishes `dev` tag on `main` pushes,
  - publishes production on release events,
  - keeps dependency installation, linting, tests, and builds in non-OIDC jobs,
  - avoids dependency caches in the publish workflow,
  - grants `id-token: write` only to minimal publish jobs that download the verified `dist` artifact and run `npm publish --ignore-scripts`,
  - pins `actions/download-artifact` to an immutable commit in the OIDC jobs and keeps digest mismatches fatal so corrupted or substituted artifacts cannot reach npm publishing.
- `.github/workflows/label.yml` uses `pull_request_target` only for labeling metadata; do not add repository checkout or PR-code execution to that workflow. `gh` commands in that workflow must pass `--repo` explicitly because there is intentionally no `.git` checkout for repository inference.
- `.github/workflows/comment-released-prs-and-issues.yml`:
  - runs local action `.github/actions/release-commenter`,
  - runs on `release.published`, on manual `workflow_dispatch`, and after successful `npm Publish` workflow completion for `push` events on `main`,
  - supports manual `workflow_dispatch` with optional `head_tag`, `base_tag`, `dry_run`, and `npm_package_name`.

## Practical guardrails

- Keep `README.md` edits synchronized with `docs/README.md`; source-of-truth is docs.
- Do not rely on `dist/` as edit target; regenerate instead.
- Favor targeted tests while iterating, then run full suite before finalizing.
- Any behavior change should include at least one regression test.
