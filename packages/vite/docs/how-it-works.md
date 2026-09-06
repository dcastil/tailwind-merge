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

`vite build` generates once, deterministically — client and SSR passes get byte-identical modules, keeping server and client merging in sync. The default tailwind-merge configuration is never imported by the generated module, so bundlers tree-shake it away entirely; you ship only your own theme's config — and by default only the part of it your code uses, see below.

If configuration generation fails — for example, the explicit `css` path is missing or a configured plugin cannot be loaded — the build fails, including when nothing imports the runtime module. A failed `vite build --watch` regeneration also fails that rebuild instead of emitting the previous configuration; fixing the CSS allows the next rebuild to succeed. Source-scanning failures still use the full generated configuration, as described below.

## Pruning to the classes you use

In production builds the plugin prunes the generated configuration to the classes found in your sources: class groups no used class belongs to are dropped, and within the remaining groups only the scale values and patterns your classes reach survive. Across real projects this removes 30–55% of the whole bundle (configuration plus tailwind-merge's engine, brotli-compressed).

"Found in your sources" means found the way Tailwind finds them. The plugin runs Tailwind's own candidate scanner (`@tailwindcss/oxide`) over the same sources Tailwind uses — automatic detection from the Vite root (gitignored files, `node_modules`, binaries, CSS, and lock files skipped), your CSS's `source(…)` and every `@source` directive — and adds the `@source inline(…)` safelist. That gives a simple rule: **every class Tailwind generates CSS for merges exactly like under the full configuration, and everything else has no styles and passes through untouched.** The only thing pruning changes is what happens to class names Tailwind never saw — and those render nothing.

What this means in practice:

- **Dev serves the full configuration.** Pruning depends on which classes your code uses, so with it the dev-time module would change on every edit. Instead, dev keeps the usage-independent configuration described above, and production builds prune. The behavior differs only for class names that don't appear in your sources (which have no styles either way). To see the pruned configuration in dev — for example to debug a production-only difference — set `prune: { dev: true }`: the plugin then re-scans on every source change (milliseconds) and regenerates and reloads when the used classes actually changed.
- **Class names from outside your sources.** If class names reach `twMerge` from outside the scanned sources *and* get their styles from somewhere else than this Tailwind build — markup delivered by a CMS styled by a separately built stylesheet, module federation, micro-frontends — set `prune: false`. Classes that are safelisted with `@source inline(…)` or listed in any file Tailwind scans need nothing: they are covered. Dynamically assembled class names alone are no reason to opt out: if Tailwind can't see them, they don't render.
- **`vite build --watch`** rebuilds regenerate when the CSS graph or the used classes changed, and the scanned files are registered with the watcher so edits to files outside the module graph (Markdown, HTML partials) count too.
- **A build logs one line** saying what pruning did (`Pruned the tailwind-merge config to 92 of 379 class groups from the 618 classes found in your sources`), so the behavior is visible in build and CI output. `prune: { log: false }` silences it.
- **If the sources can't be scanned** — no `@tailwindcss/oxide` binary for the platform, a `source(…)` path that doesn't exist — the build logs a warning and uses the full configuration. Pruning is an optimization; the full configuration is always correct.

### Library mode

A Vite build in library mode (`build.lib`) produces a package other apps consume, and a component library's `twMerge` calls receive class strings from the consuming app (`twMerge('rounded px-3', className)`), which no scan from inside the library can see. Pruning such a build would drop exactly the classes consumers pass in, so library builds are **not pruned by default** — the plugin says so with one log line and serves the full configuration. `prune: { build: true }` forces pruning for the rare library that only merges its own class names.

## Version alignment

The plugin reads your theme with its own Tailwind engine (`@tailwindcss/node`), while `@tailwindcss/vite` compiles your CSS with the version it pins. Both must sit on the same Tailwind minor line for the generated config to be trustworthy, and the plugin states that coupling explicitly: `@tailwindcss/vite` and `tailwindcss` are peer dependencies pinned to the supported line (currently `~4.3`). When you upgrade Tailwind past what the plugin has been validated against, your package manager reports the unmet peer — the fix is updating `@tailwind-merge/vite` to a release that supports the new line. The peer on `@tailwindcss/vite` is optional, so setups that run Tailwind through PostCSS inside Vite aren't asked to install it; when it is present, its version is still validated.
