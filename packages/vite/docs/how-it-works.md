# How it works

## Finding your Tailwind CSS

At startup the plugin scans the Vite root for CSS files with Tailwind markers (`@import 'tailwindcss'`, `@theme`, `@config`, `@plugin`, …). Files that are `@import`ed by another marker file are layers, not roots — what remains is your entrypoint. Exactly one candidate wins; several independent roots produce a hard error asking for the [`css` option](./api-reference.md#options) rather than a guess; none found logs a warning and serves default tailwind-merge behavior so your app keeps working.

This scan is deliberately independent of Vite's module graph: the runtime module can be requested before any CSS has been processed, so the plugin must know the entrypoint up front.

## Generating the configuration

The CSS is loaded through Tailwind's own APIs from your project's Tailwind installation — the exact theme your build resolves, with defaults merged, overrides applied, and resets executed. From that, the generator derives a complete tailwind-merge configuration: exact theme scales (compressed where patterns allow), classes from compat sub-namespaces, custom `@utility` and `@plugin` utilities including inferred conflict relationships, and prefix support. Generation takes roughly 0.1–1.3 s depending on theme size and hides behind the dev server's first page load.

## Serving without files

Imports of `@tailwind-merge/vite/runtime` are redirected to an in-memory module containing the generated code. Nothing is written into your project — no generated file to commit, ignore, or confuse the TypeScript server. Types always come from the real on-disk module through normal package resolution, and its export surface is identical to the generated one, so editors and `tsc` need zero configuration.

## The dev loop

The generated config depends only on your Tailwind **configuration** — never on which classes your app uses — so editing components can't churn it. When a file of the CSS configuration graph changes (the entrypoint, an `@import`ed stylesheet even outside the Vite root, an `@config`/`@plugin` module), the plugin regenerates and compares the result by hash:

- **Output unchanged** — adding utility classes, comments, formatting: nothing happens. Tailwind's own CSS hot update runs as usual; the merge config stays put.
- **Output changed** — a real theme change: the plugin invalidates the runtime module and triggers a full page reload. A full reload is deliberate: merged class strings are already baked into the rendered DOM, so hot-swapping `twMerge` alone couldn't fix what's on screen — the same reasoning behind `@tailwindcss/vite`'s full reloads.

If a regeneration fails (broken CSS mid-edit), the last good config keeps serving and the error is logged — the dev server never crashes over the merge config.

## Builds

`vite build` generates once, deterministically — client and SSR passes get byte-identical modules, keeping server and client merging in sync. The default tailwind-merge configuration is never imported by the generated module, so bundlers tree-shake it away entirely; you ship only your own theme's config.

## Version alignment

The plugin reads your theme with its own Tailwind engine (`@tailwindcss/node`), while `@tailwindcss/vite` compiles your CSS with the version it pins. Fresh installs resolve both to the same version. If a lockfile update leaves them apart — typically after upgrading `@tailwindcss/vite` — the plugin warns at startup that the generated config may not match your build, and tells you which side to update.
