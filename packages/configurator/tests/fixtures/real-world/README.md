# Real-world CSS fixtures

Pinned copies of real Tailwind CSS v4 configurations, used by `real-world.test.ts` to run the generator against setups nobody would invent in a hand-written fixture. Most come from permissively licensed open-source projects; one (`replit/`) was provided directly by its owner with permission to include it here. Each generated module is snapshotted, so these also document what the configurator's output looks like for real projects.

Every entrypoint carries a header with its exact provenance (repository, commit, and path for the open-source ones; sharing context and permission for the provided one) and the list of deviations from the original, marked inline where they occur: stripped `@import`/`@plugin`/`@config` references to npm packages this workspace does not install (`tw-animate-css`, `flowbite/plugin`, `@tailwindcss/typography`, …), or an added `@import 'tailwindcss'` where the shared file was a theme-only excerpt. Everything else is verbatim content.

| Fixture        | Source                                                                                                                   | License    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `shadcn/`      | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `apps/v4/app/` @ `6261bd89f72d`                                          | MIT        |
| `supabase/`    | [supabase/supabase](https://github.com/supabase/supabase) `packages/config/` + `packages/ui/build/css/` @ `5b68af172045` | Apache-2.0 |
| `openai-fm/`   | [openai/openai-fm](https://github.com/openai/openai-fm) `src/app/` @ `434b7f762290`                                      | MIT        |
| `flowbite/`    | [themesberg/flowbite-svelte](https://github.com/themesberg/flowbite-svelte) `src/` + `static/styles/` @ `85f20a048ec5`   | MIT        |
| `kite/`        | [kagisearch/kite-public](https://github.com/kagisearch/kite-public) `src/` @ `c4fc3b579c3b`                              | MIT        |
| `remix-store/` | [remix-run/remix-store](https://github.com/remix-run/remix-store) `app/` @ `f0d979cb55ef`                                | MIT        |
| `replit/`      | Provided directly by Replit (work-in-progress theme, not from a public repository), 2026-08-11                           | Included with permission |

The copies are deliberately frozen: upstream changes must not silently change test behavior. To refresh one, re-download the files at a new commit, re-apply the documented strips, update the header and this table, and review the resulting snapshot diff like any behavior change.
