# Release workflow for agents

Use this guide when preparing release changelog entries and GitHub release text.

## Scope

- Applies to release preparation tasks like `v3.4.1`.
- Covers:
  - Draft release ingestion from GitHub.
  - Changelog updates in `docs/changelog/*-changelog.md`.
  - Sponsor section generation and ordering.
  - GitHub Releases UI text formatting.
  - Release comments on PRs/issues via `.github/actions/release-commenter`.

## Inputs to collect first

1. Release tag and base compare range (for example `v3.4.0...v3.4.1`).
2. Draft release body from GitHub.
3. Current active GitHub sponsors.
4. Sponsor payout input from thanks.dev for the relevant time window.

`thanks.dev` input must come from the user. Do not infer or invent this data.

## Release commenter behavior

The workflow `.github/workflows/comment-released-prs-and-issues.yml` uses the local action `.github/actions/release-commenter`.

- It runs for:
  - published GitHub releases,
  - manual workflow dispatch,
  - completed successful `npm Publish` runs triggered by `push` on `main` (dev-release comment pass).
- Automatic base-tag selection is semver-aware:
  - Stable release tags compare to the previous stable semver tag.
  - Prerelease tags with a SHA suffix (for example `v3.4.1-dev.<sha>`) resolve base from npm-published versions with the same prerelease prefix and pick the nearest ancestor commit.
  - For SHA-suffixed prereleases, if no prior dev release exists for the same core version, resolution falls back to all dev releases from the highest lower core version (same prerelease prefix) and picks the nearest ancestor commit.
  - SHA-suffixed prerelease comments link to the npm published version page instead of GitHub release tags.
  - Other prerelease tags compare to the previous semver tag (including prereleases).
- If no valid base tag is found, the action fails.
- The action fails before posting if any target issue/PR already has a previous stable release-comment.
- For prereleases, targets that already have any previous release-comment are skipped so repeated `-dev.*` ranges do not post duplicate dev comments. Later stable releases can still comment after a prerelease.
- Posted comment URLs are logged and added to the workflow run summary so all comments from one run can be inspected together.
- Manual trigger supports optional overrides:
  - `head_tag`
  - `base_tag`
  - `dry_run`
  - `npm_package_name`

Manual dry run example:

```bash
gh workflow run comment-released-prs-and-issues.yml \
  -f head_tag=v3.4.1 \
  -f dry_run=true
```

## Commands

Bump package versions with `pnpm version <version|patch|minor|major>`. pnpm runs the existing `preversion`, `version`, and `postversion` lifecycle scripts and creates the version commit/tag, so the README regeneration in `scripts/update-readme.mjs` stays part of the version step.

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
   - v3 releases: `docs/changelog/v3-changelog.md`
   - v2 releases: `docs/changelog/v2-changelog.md`
2. Add new version section at the top:
   - `## vX.Y.Z`
3. Keep category headings from draft release:
   - `### Bug Fixes`, `### New Features`, `### Documentation`, `### Other`, etc.
4. Keep full compare link in docs style:
   - `**Full Changelog**: [\`vA.B.C...vX.Y.Z\`](https://github.com/dcastil/tailwind-merge/compare/vA.B.C...vX.Y.Z)`

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
   - `**Full Changelog**: https://github.com/dcastil/tailwind-merge/compare/vA.B.C...vX.Y.Z`

## Final output contract

1. Provide the release body in one copy-paste-ready markdown block.
2. If sponsor payout input is missing, stop and ask the user for thanks.dev data before finalizing sponsor lines.
