# Tailwind CSS version update workflow

Use this guide when updating tailwind-merge for a new Tailwind CSS version.

The main risk in this work is false confidence: Tailwind release notes, deployed docs, source code, and website docs can land at different times. Treat every feature as something to verify from official sources before changing `src/lib/default-config.ts` or parser behavior.

## Official sources

- Tailwind CSS releases: https://github.com/tailwindlabs/tailwindcss/releases
- Tailwind CSS source and PRs: https://github.com/tailwindlabs/tailwindcss
- Tailwind CSS release tag pattern: `https://github.com/tailwindlabs/tailwindcss/releases/tag/vX.Y.Z`
- Tailwind CSS deployed docs: https://tailwindcss.com/docs
- Tailwind CSS website source and docs PRs: https://github.com/tailwindlabs/tailwindcss.com
- Prior tailwind-merge support PRs for comparison, for example v4.2 support: https://github.com/dcastil/tailwind-merge/pull/651

When docs for a just-released Tailwind version are not deployed yet, use the `tailwindcss.com` repository and its PRs to find future docs pages, sidebar order, and link targets.

## Investigation checklist

1. Read the Tailwind CSS release notes for the target version.
2. Open every linked Tailwind CSS PR that mentions utilities, variants, parser syntax, arbitrary values, or behavior changes.
3. Inspect Tailwind CSS source and tests when release notes or PR descriptions are ambiguous. Do not infer support for arbitrary values or variables from naming patterns alone.
4. Check the `tailwindcss.com` repository for docs PRs when deployed docs lag behind the release.
5. Compare against the previous tailwind-merge Tailwind-support PR to reuse the same structure and testing style.
6. Make a feature list before coding. Split work into simple utility additions, ordering/docs updates, conflict changes, and parser/config API changes.
7. Record no-op decisions in the PR or issue summary, especially when a Tailwind PR looked relevant but does not require a tailwind-merge change.

## Triage questions for each Tailwind change

- Does it emit new class names? If yes, it likely needs `classGroups` entries.
- Does it change which utilities conflict? If yes, update `conflictingClassGroups` or `conflictingClassGroupModifiers`.
- Does it add a new arbitrary value or arbitrary variable form? Verify the exact accepted syntax in Tailwind source before adding validators.
- Does it add a slash form that is part of the base class rather than a postfix modifier? Prefer config-driven lookup such as `postfixLookupClassGroups` before changing parser logic.
- Does it change modifier, variant, prefix, important, or arbitrary-variant syntax? Parser changes are higher risk and need focused parser/modifier tests.
- Does it only change generated CSS for an existing class without changing class syntax or conflicts? It may not require a tailwind-merge change.
- Does it remove or rename classes? Check whether keeping old classes would create incorrect merges for the supported Tailwind range.

## Default config ordering and links

Keep `src/lib/default-config.ts` ordered according to the Tailwind CSS docs sidebar, not alphabetically and not by implementation convenience.

For new utility groups:

- Use `tailwindcss.com` or the website repository to find the final docs URL for each `@see` comment.
- If the public docs are not deployed, inspect docs PRs in `tailwindlabs/tailwindcss.com`.
- Replace temporary `TBD` links before finishing the change.
- Keep related utility groups in sidebar order even when they share a prefix.

There is an important exception to sidebar order: class-group order affects validator precedence for groups that share the same prefix path. The class map tries exact child paths first, then runs validators in the order they were registered. If a broad validator appears before a more specific validator for the same prefix, the broad group can claim the class before the specific group sees it.

When groups with the same prefix use validators:

- Put the most specific validators first.
- Put broad or catch-all validators last for that prefix.
- Treat color validators as especially sensitive because they often accept arbitrary values or otherwise broad value sets.
- Prefer correctness over strict sidebar order inside that shared-prefix cluster.

For example, if a `text-*` color group uses a broad color validator, keep it after more specific `text-*` groups such as font-size-related groups so ambiguous classes resolve to the intended class group.

Examples learned during the Tailwind CSS v4.3 update:

- `tab-size` belongs after `text-indent` and before `vertical-align`.
- `zoom` belongs after `translate`.
- Scrollbar groups should follow the sidebar order for scrollbar color, scrollbar gutter, and scrollbar width.
- PRs that look relevant to existing utilities, such as changes around `start` and `end`, still need source review before changing tailwind-merge.

## Implementation guidance

Use `src/lib/default-config.ts` as the behavioral source of truth for utilities and conflicts.

Prefer config changes over parser changes. Parser and merge hot paths run frequently in UI renders, so keep extra work small and opt-in:

- Normalize config arrays into lookup objects in `createConfigUtils` when they need fast querying.
- Avoid scanning or balancing brackets in validators when a cheap prefix or character check can reject most inputs.
- Put specialized syntax checks in `src/lib/validators.ts` when they are reusable or need direct tests.
- Add comments only for non-obvious behavior, especially when a config entry compensates for parser ambiguity.

For slash syntax, remember that tailwind-merge initially treats the part after `/` as a possible postfix modifier. If the full class can belong to a different group, use a generic config mechanism rather than a syntax-specific parser branch.

The Tailwind CSS v4.3 named container query support is the reference pattern:

- `@container-size` is a container type class.
- `@container-size/sidebar` combines container type and container name.
- The parser already exposes a possible postfix modifier, so no bracket-counting parser change is needed.
- `container-named` creates a conflict with `container-type`, but not the reverse, because a later type-only class should preserve the earlier container name.
- `postfixLookupClassGroups: ['container-type']` tells merge logic to try resolving the full slash class only after the pre-slash class resolves to `container-type`.

## Testing checklist

Add or update tests based on the kind of change:

- Tailwind version compatibility: `tests/tailwind-css-versions.test.ts`
- Default config class map coverage: `tests/class-map.test.ts`
- Class group conflicts: `tests/class-group-conflicts.test.ts` and `tests/conflicts-across-class-groups.test.ts`
- Parser or modifier semantics: `tests/modifiers.test.ts`, `tests/arbitrary-variants.test.ts`, `tests/experimental-parse-class-name.test.ts`
- Validators: `tests/validators.test.ts`
- Public exports and config API: `tests/public-api.test.ts`, `tests/type-generics.test.ts`, `tests/merge-configs.test.ts`
- Docs examples: `tests/docs-examples.test.ts`

For new utility support, include tests for:

- Last class wins within the new class group.
- Cross-group conflicts in both orders when conflicts are asymmetric.
- Arbitrary values and arbitrary variables only when Tailwind source confirms support.
- Important modifier and variant combinations when parser or conflict behavior is involved.
- Unknown or invalid classes remaining untouched.

For TypeScript config changes, remember that `pnpm tsc --noEmit` only checks `src`. Use the test tsconfig as an additional check when touching public types:

```sh
pnpm tsc --noEmit -p tests/tsconfig.json --moduleResolution bundler
```

The plain `tests/tsconfig.json` currently inherits `moduleResolution: Node`, which can surface Vitest package export resolution errors unrelated to tailwind-merge types.

## Documentation checklist

Update docs in the same change when behavior or public API changes:

- `docs/configuration.md` for config behavior.
- `docs/api-reference.md` for exported validators, config fields, or public types.
- `docs/changelog/v3-changelog.md` when preparing a release note.
- `AGENTS.md` and `agents/*` when the update process or repo guidance changes.

Do not regenerate `README.md` during normal development; it is generated from `docs/README.md` during the release flow.

## Validation checklist

Run targeted tests while iterating, then run the full validation set before finalizing:

```sh
pnpm lint
pnpm tsc --noEmit
pnpm test
git diff --check
```

Run `pnpm build && pnpm test:exports` when touching package exports, build tooling, or generated declaration behavior.
