# Release workflow for agents

Use this guide when preparing release changelog entries and GitHub release text.

## Release model

Releases are per package. Each release belongs to exactly one workspace package and its git tag is namespaced with the package name:

- `tailwind-merge@3.7.0`
- `@tailwind-merge/vite@0.1.0`

Tags without a package prefix (`v3.6.0` and earlier) are the pre-monorepo history and belong to `tailwind-merge`. The publish workflow's tag routing and `scripts/update-pinned-links.mjs` treat them that way via a fallback; release-drafter does not (see below), so the first namespaced tailwind-merge release needs its draft assembled by hand.

The tag and version-commit format comes from each package's `.npmrc` (`tag-version-prefix`, `message`), which `npm version` reads when `pnpm version` runs in the package directory. pnpm itself reads no settings from `.npmrc` — repo-level pnpm settings live in `pnpm-workspace.yaml` — so don't delete these files as stale.

## Scope

- Applies to release preparation tasks like `tailwind-merge@3.4.1`.
- Covers:
  - Draft release ingestion from GitHub.
  - Changelog updates in `packages/tailwind-merge/docs/changelog/*-changelog.md` (the vite package gets its own changelog location with its first release).
  - Sponsor section generation and ordering.
  - GitHub Releases UI text formatting.
  - Release comments on PRs/issues via `.github/actions/release-commenter`.

## Release drafting

`.github/workflows/draft-release.yml` maintains one draft per package via release-drafter with per-package configs (`config-name`): `.github/release-drafter-tailwind-merge.yml` and `.github/release-drafter-vite.yml`. Each config scopes itself with `tag-prefix` (previous-release lookup and version resolution consider only that package's tags) and `include-paths` (only PRs touching the package or its bundled source appear in its draft). Consequences to know:

- A PR touching both packages appears in both drafts — correct, since both releases ship it.
- The Vite scope includes `packages/configurator` as well as `packages/vite`: configurator-only fixes ship in the plugin's bundle and belong in its changelog. The library remains a separate dependency with its own release scope.
- A PR touching none of those directories (repo infrastructure, CI, root docs) appears in no draft; mention it by hand in a changelog if it matters to users.
- First namespaced release per package: `tag-prefix` matches no existing release, and the pinned release-drafter (v7) then drafts from nothing rather than from full history — its previous-release lookup keeps only releases whose tag starts with the prefix, and without one it collects no pull requests at all. The draft therefore proposes version `0.1.0` and its body is the `no-changes-template` ("No changes") plus a warning banner, while the pre-existing unprefixed draft (`v3.6.1` for tailwind-merge) keeps the real, categorized pull request list and is never updated or removed by the drafter again. When publishing: copy the categorized list from that orphaned draft into the new one, then delete the orphaned draft; set the tag name and title by hand (for example `tailwind-merge@3.7.0` following `v3.6.0`); and write the Full Changelog compare line manually (`v3.6.0...tailwind-merge@3.7.0`). For the vite package the proposed `0.1.0` happens to be right, but its pull request list is equally empty and must be written from the PRs touching `packages/vite` and `packages/configurator`.
- Tag-pinned file links repo-wide (the AGENTS.md link policy) are maintained automatically: each publishable package's `version` lifecycle runs `scripts/update-pinned-links.mjs`, which rewrites every link pinned to that package's newest existing tag to the tag being released (logging each rewrite for release-time review), verifies each target path against the working tree (failing the version step loudly on unresolvable paths, touching nothing), remaps pre-monorepo root paths into the package directory, and leaves links pinned to older tags alone as deliberately historical. Historical links that sit at the newest tag anyway are covered by two escape hatches: changelog directories are never scanned (their entries — including the one for the latest release — always describe a specific past release), and a link carrying the `twm-historical` query parameter stays untouched and exempt from path validation. First release of a package is a no-op for it. Concretely: the tailwind-merge 3.7.0 release will re-pin the vite docs' `v3.6.0` links to `tailwind-merge@3.7.0` with `packages/tailwind-merge/` paths on its own.
- The autolabeler section lives only in the tailwind-merge config; labels are repo-wide.

## Publishing

`.github/workflows/npm-publish.yml` routes `release.published` events by tag prefix: `tailwind-merge@*` and legacy `v*` build and publish `packages/tailwind-merge`, `@tailwind-merge/vite@*` builds and publishes `packages/vite`, and unknown prefixes fail the run. The build job runs repo-wide lint and tests, builds the library alongside the released package (the vite package's `test:exports` verifies its packed tarball against the library's published shape), and runs the released package's `test:exports`; publishing happens from the package directory in an isolated OIDC job via `pnpm publish` — after a scripts-disabled install of the released package's dependencies, which pnpm needs to rewrite `workspace:` specifiers (the vite package's tailwind-merge dependency), and with pnpm applying `publishConfig` overrides at pack time (the vite package's dist-exports swap) and handling npm trusted publishing natively, `--provenance` passed explicitly because pnpm does not read `publishConfig.provenance` (mechanics in `agents/tailwind-merge-internals.md`). Dev releases on `main` pushes remain tailwind-merge-only for now.

### First Vite release

Release the next tailwind-merge update before the Vite plugin. Automatic Vite dev releases remain disabled; a merge to `main` only publishes the library's dev package. Do not change that as part of routine development or documentation work.

The selected initial plugin release is `0.1.0`, with no prerelease suffix or alternate dist-tag. It is the only new package intended for initial publication: the configurator is inlined and keeps an unstable direct API until a separately planned release. This is a sequencing decision, not a promise that the configurator stays unpublished forever.

Before publishing:

1. Release a library version containing the generator's required `themeKey`, classification/parser exports, and matching configuration semantics. The plugin packs its `workspace:^` dependency as `tailwind-merge: ^3.6.0` because that is the local manifest version (the caret range keeps later library patches installable without a plugin release); the actual `v3.6.0` release lacks the unstable entry point. A packed check against the workspace library cannot establish that a registry install will work. Verify the packed dependency after the library version bump, and test installation against that actual release.
2. Configure a trusted publisher for the new npm package (repository `dcastil/tailwind-merge`, workflow `npm-publish.yml`). The library's configuration does not cover a second package. Verify npm's current first-publication setup when releasing; a bootstrap publish may be needed before trusted publishing can be configured.
3. Set the plugin's release version and remove `private: true` only when preparing that release. Keep the configurator private. Add the plugin's initial changelog/release text and update the unreleased notices in its README/getting-started/versioning docs.
4. Run the library and plugin builds, packed-package gates, and repo-wide checks. The [Vite packaging guide](./vite-plugin.md#build-and-packaging) explains the pnpm export rewrite and which consumer behavior the gate verifies.

Local field trials before that release must resolve both the plugin and library to matching checkout builds. Installing only a plugin tarball while letting its library dependency resolve to the old registry version does not meet that requirement.

## Release commenter behavior

The workflow `.github/workflows/comment-released-prs-and-issues.yml` uses the local action `.github/actions/release-commenter`.

- It runs for:
  - published GitHub releases,
  - manual workflow dispatch,
  - completed successful `npm Publish` runs triggered by `push` on `main` (dev-release comment pass, tailwind-merge only; the synthetic head tag is `tailwind-merge@<version>-dev.<sha>`).
- Base-tag selection is scoped to the released tag's package. Legacy un-prefixed tags belong to the `fallback-package-name` input (default `tailwind-merge`).
- Target collection separately checks each commit's changed files, then the changed files of its associated PRs, before reading their closing references or connected-issue timelines. An unrelated package's commit or PR must not announce its issues as released. PR scope results are cached within the run. The Vite scope includes the bundled configurator; the library scope includes its package directory plus historical root `src/`, `docs/`, and `tests/` paths for comparisons spanning the monorepo move. Root infrastructure remains outside automatic notification scope.
- Changed-file checks paginate both REST endpoints and include a rename's previous path, so changes moved out of a package still count. Missing file data or reaching GitHub's file-list cap without establishing scope fails before posting. Keep `releasePackagePaths()` in the action aligned with the release-drafter configs when adding packages or changing bundle ownership. Mocked tests cover mixed ranges, linked issues, pagination, renames, and dry runs without contacting GitHub.
- Automatic base-tag selection is semver-aware within the package:
  - Stable release tags compare to the package's previous stable tag (legacy `v*` tags included for tailwind-merge).
  - Prerelease tags with a SHA suffix (for example `tailwind-merge@3.4.1-dev.<sha>`) resolve base from npm-published versions of the package — the npm package name is derived from the tag prefix — with the same prerelease prefix, picking the nearest ancestor commit.
  - For SHA-suffixed prereleases, if no prior dev release exists for the same core version, resolution falls back to all dev releases from the highest lower core version (same prerelease prefix) and picks the nearest ancestor commit.
  - SHA-suffixed prerelease comments link to the npm published version page instead of GitHub release tags.
  - Other prerelease tags compare to the previous semver tag of the same package (including prereleases).
- A `0.1.0` release with no same-package history skips commenting gracefully (green run, logged): `0.1.0` is always a package's first version here, so a missing base is the expected state. Trigger manually with an explicit `base_tag` if comments are wanted for a first release. Any other missing-base case still fails loudly, because above `0.1.0` it means release tooling is broken.
- The action fails before posting if any target issue/PR already has a previous stable release-comment for the same package. Comments from other packages' releases never block — a PR touching two packages legitimately receives one comment per package release. These arrive from separate workflow runs at each package's own release time, and staying separate is deliberate: each comment notifies subscribers about that release, while editing an earlier comment into a combined one would notify nobody.
- For prereleases, targets that already have a release-comment for the same package are skipped so repeated `-dev.*` ranges do not post duplicate dev comments. Later stable releases can still comment after a prerelease.
- Posted comment URLs are logged and added to the workflow run summary so all comments from one run can be inspected together.
- Manual trigger supports optional overrides:
  - `head_tag`
  - `base_tag`
  - `dry_run`
  - `npm_package_name`

Manual dry run example:

```bash
gh workflow run comment-released-prs-and-issues.yml \
  -f head_tag=tailwind-merge@3.4.1 \
  -f dry_run=true
```

## Inputs to collect first

1. Release tag and base compare range (for example `tailwind-merge@3.4.0...tailwind-merge@3.4.1`).
2. Draft release body from GitHub.
3. Current active GitHub sponsors.
4. Sponsor payout input from thanks.dev for the relevant time window.

`thanks.dev` input must come from the user. Do not infer or invent this data.

## Commands

Bump a package's version with `pnpm version <version|patch|minor|major>` run inside the package directory (for the library: `packages/tailwind-merge/`). pnpm runs the existing `preversion`, `version`, and `postversion` lifecycle scripts and creates the version commit and namespaced tag from the package's `.npmrc`. The `version` step first re-pins tag-pinned links repo-wide via the shared `scripts/update-pinned-links.mjs` (see Release drafting notes above); for the library it then regenerates both the package README and the generated section of the repo-level README via its own `scripts/update-readme.mjs`, with links pinned to the new release tag.

Fetch draft release:

```bash
gh release view <tag> --json tagName,name,isDraft,body,url,createdAt,targetCommitish
```

Fetch active GitHub sponsors in start-date order:

```bash
gh api graphql -f query='query($login:String!){ user(login:$login){ sponsorshipsAsMaintainer(first:100, activeOnly:true, includePrivate:false, orderBy:{field:CREATED_AT, direction:ASC}){ nodes{ sponsorEntity{ ... on User{ login } ... on Organization{ login } } } } } }' -F login=dcastil
```

Check whether private active sponsors exist:

```bash
gh api graphql -f query='query($login:String!){ user(login:$login){ public: sponsorshipsAsMaintainer(first:100, activeOnly:true, includePrivate:false){ totalCount } all: sponsorshipsAsMaintainer(first:100, activeOnly:true, includePrivate:true){ totalCount } } }' -F login=dcastil
```

## Changelog authoring rules

1. Update the matching major-version changelog file:
   - v3 releases: `packages/tailwind-merge/docs/changelog/v3-changelog.md`
   - v2 releases: `packages/tailwind-merge/docs/changelog/v2-changelog.md`
2. Add new version section at the top:
   - `## vX.Y.Z`
3. Keep category headings from draft release:
   - `### Bug Fixes`, `### New Features`, `### Documentation`, `### Other`, etc.
4. Keep full compare link in docs style, using the real tag names:
   - `**Full Changelog**: [\`tailwind-merge@A.B.C...tailwind-merge@X.Y.Z\`](https://github.com/dcastil/tailwind-merge/compare/tailwind-merge@A.B.C...tailwind-merge@X.Y.Z)` (the base is `vA.B.C` when it predates the monorepo)

## Sponsor rules

1. Preserve ordering convention from the most recent changelog sponsor sentence unless user explicitly asks otherwise.
2. Merge sponsor sources:
   - GitHub Sponsors (active sponsors, ordered by start date).
   - User-provided thanks.dev payouts for the release window.
3. Include thanks.dev sponsors only above the user-defined threshold.
   - Current default: include only amounts greater or equal to 1 USD.
4. Do not mention sub-threshold sponsors individually unless requested.
5. Keep summary phrases aligned with user preference:
   - Examples: `a private sponsor`, `and more via @thnxdev`.

## GitHub release body formatting

When producing text for GitHub Releases UI, transform docs formatting:

1. Keep headings and bullet content.
2. Convert markdown profile links to plain handles:
   - `[@name](https://github.com/name)` -> `@name`
3. Convert markdown PR links to plain URLs.
4. Use plain compare URL:
   - `**Full Changelog**: https://github.com/dcastil/tailwind-merge/compare/tailwind-merge@A.B.C...tailwind-merge@X.Y.Z`

## Final output contract

1. Provide the release body in one copy-paste-ready markdown block.
2. If sponsor payout input is missing, stop and ask the user for thanks.dev data before finalizing sponsor lines.
