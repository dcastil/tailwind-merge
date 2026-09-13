# How it works

## Finding your Tailwind CSS

At startup the plugin scans the project directory for `.css`, `.pcss`, and `.postcss` files with Tailwind markers (`@import 'tailwindcss'`, `@theme`, `@config`, `@plugin`, …). Files reached through another marker file's local `@import` chain are treated as layers. Discovery follows intermediate stylesheets containing only imports, including mixed extensions, extensionless files, and explicit paths outside the project directory, so `app/globals.css → styles.pcss → tokens.postcss` resolves to `app/globals.css` when its nested tokens contain `@theme`. Exactly one remaining candidate wins; several independent roots produce a hard error asking for the [`css` option](./api-reference.md#options) rather than a guess; none found logs a warning and serves default tailwind-merge behavior so your app keeps working.

Use the `css` option for an entrypoint with another filename (including an extensionless file) or outside the scanned directories. Discovery skips dot-directories (so `.next` is never scanned), dependencies, and build outputs. This selects the input for merge configuration; Next.js and `@tailwindcss/postcss` still control CSS compilation.

Only active CSS directives participate in discovery. Comments and quoted examples cannot create a Tailwind root or link one stylesheet to another; comments between the tokens of a real directive are treated as whitespace. Custom variant declarations (`@custom-variant`) also mark an entrypoint, so a file importing a shared Tailwind base and adding a variant wins over that base, and the generated configuration includes the variant's ordering rules. Symlinked project roots and theme packages are compared by their real filesystem paths.

## Generating the configuration

The plugin loads CSS using its `@tailwindcss/node` compiler, with imports resolved from your stylesheet's directory the way Tailwind's PostCSS plugin resolves them (package fields and conditions included; Next.js path aliases from `tsconfig.json` do not apply to CSS imports in either). Tailwind merges defaults, overrides, and resets; the configurator then derives theme scales, compat sub-namespace classes, custom-utility groups and conflicts, and prefix support. Keep the compiler aligned with the version building your CSS, as described under [version alignment](#version-alignment).

## Serving without files

Neither Turbopack nor webpack offers virtual modules through the Next.js config, but both run webpack-style loaders. The plugin registers a loader rule for its own runtime module (`@tailwind-merge/next/runtime`, the file that ships in the package) with whichever bundler compiles your app, and the loader replaces that file's content with the generated module. Nothing is written into your project — no generated file to commit, ignore, or confuse the TypeScript server. Types always come from the real on-disk module through normal package resolution, and its export surface is identical to the generated one, so editors and `tsc` need zero configuration.

Next.js compiles the app several times — server components, server rendering, the browser bundle, and the edge runtime where used — and the loader runs once per compilation. It generates once and hands the same module to every compilation, so the server and the browser always merge classes identically; there is no hydration drift between them.

### Turbopack and your compiler config

Turbopack applies loader rules to code inside `node_modules` only when the project has a `tsconfig.json` or `jsconfig.json` — even an empty one; the content does not matter. Every `create-next-app` project has one, and Next.js writes a `tsconfig.json` on first run when it finds TypeScript files. Without either file, Turbopack would compile the on-disk runtime module as-is and your app would silently get tailwind-merge's default behavior. The plugin checks for the two files when your config loads and warns if neither exists; add an empty `jsconfig.json` in that case. webpack is not affected.

## The dev loop

By default, the generated config depends only on your Tailwind **configuration**, so editing components cannot change it. `prune: { dev: true }` also makes it depend on source usage, as described below. The loader registers every file of the CSS configuration graph (the entrypoint, `@import`ed stylesheets even outside the project directory, `@config`/`@plugin` modules) as a dependency of the runtime module, so Next.js re-runs it when one of them changes:

- **Output unchanged** — adding utility classes, comments, formatting: the regenerated module is byte-identical, the bundler sees no change, and nothing downstream updates. Tailwind's own CSS hot update runs as usual.
- **Output changed** — a real theme change: the runtime module changes, and Next.js propagates the update the way it does for any changed module — server components re-render on the next request, client components refresh.

If a regeneration fails during development, the last good config keeps serving and the error is logged in the terminal. If generation has never succeeded, the runtime serves the default config and logs the error. The files that took part in the failed attempt stay registered as dependencies, including missing stylesheet imports and JavaScript `@config`/`@plugin` targets through the directories they would appear in, so repairing a dependency or creating a missing file retries generation without restarting the server.

## Builds

`next build` generates from the resolved theme and sources, once per build, and hands the same module to the server and browser compilations. Identical inputs produce identical module code. The default tailwind-merge configuration is never imported by the generated module, so bundlers tree-shake it away entirely; you ship only your own theme's config — and by default only the part of it your code uses, see below.

If configuration generation fails — for example, the explicit `css` path is missing or a configured plugin cannot be loaded — the build fails with the error. Source-scanning failures still use the full generated configuration, as described below.

## Pruning to the classes you use

In production builds the plugin prunes the generated configuration to the classes found in your sources: class groups no used class belongs to are dropped, and within the remaining groups only the scale values and patterns your classes reach survive. The historical [project measurements](../../../agents/configurator-performance.md) show substantial compressed-size savings; the result depends on source usage and encoding.

"Found in your sources" means found the way Tailwind finds them. The plugin runs Tailwind's own candidate scanner (`@tailwindcss/oxide`) over the same sources Tailwind uses — automatic detection from the project directory, where Tailwind's PostCSS plugin starts as well (gitignored files, `node_modules`, binaries, CSS, and lock files skipped), your CSS's `source(…)` and every `@source` directive — and adds the `@source inline(…)` safelist. The contract is that **class lists drawn from the scanned candidates merge identically to the full generated configuration**. This relies on matching Tailwind's source configuration and scanner behavior. Pruning inherits the full config's semantics and limitations. Retained validators may still match unscanned names, so pruning is not a strict class-name allowlist.

What this means in practice:

- **Dev serves the full configuration.** Pruning depends on which classes your code uses, so with it the dev-time module would change on every edit. Instead, dev keeps the usage-independent configuration described above, and production builds prune. The behavior differs only for class names that don't appear in your sources (which have no styles either way). To see the pruned configuration in dev — for example to debug a production-only difference — set `prune: { dev: true }`: the scanned source directories then become dependencies of the runtime module, every source change re-scans (milliseconds), and the module regenerates when the used classes actually changed.
- **Class names from outside your sources.** If class names reach `twMerge` from outside the scanned sources _and_ get their styles from somewhere else than this Tailwind build — markup delivered by a CMS styled by a separately built stylesheet, module federation, micro-frontends — set `prune: false`. Classes that are safelisted with `@source inline(…)` or listed in any file Tailwind scans need nothing: they are covered. Dynamically assembled class names alone are no reason to opt out: if Tailwind can't see them, they don't render.
- **A build logs one line** saying what pruning did (`Pruned the tailwind-merge config to 92 of 379 class groups from the 618 classes found in your sources`), so the behavior is visible in build and CI output. `prune: { log: false }` silences it.
- **If the sources can't be scanned** — no `@tailwindcss/oxide` binary for the platform, a `source(…)` path that doesn't exist — the build logs a warning and uses the full configuration. Pruning is an optimization; falling back preserves the full generated configuration's behavior.
- **Turbopack's filesystem cache** sees the scanned source directories as dependencies of the runtime module, so a cached build cannot serve a module pruned for other sources.

## Encoding

`encoding: 'compact'` is the default in dev and builds. It favors small matchers, which can also recognize nonexistent names in finite theme scales. Those names can evict real classes even though they produce no CSS. `encoding: 'exact'` enumerates finite names and avoids that overmatching, at a bundle-size cost. Arbitrary-value matching still approximates CSS types in both modes. See the configurator's [encoding explanation](../../configurator/docs/how-it-works.md#compact-and-exact-encoding) for an example.

## Version alignment

The plugin reads your theme with its own Tailwind engine (`@tailwindcss/node`), while `@tailwindcss/postcss` compiles your CSS with the version it pins. Both must sit on the same Tailwind minor line for the generated config to be trustworthy, and the plugin states that coupling explicitly: `@tailwindcss/postcss` and `tailwindcss` are peer dependencies pinned to the supported line (currently `~4.3`). When you upgrade Tailwind past what the plugin has been validated against, your package manager reports the unmet peer — the fix is updating `@tailwind-merge/next` to a release that supports the new line. The peer on `@tailwindcss/postcss` is optional, so setups that run Tailwind through another PostCSS integration aren't asked to install it; when it is present, its version is still validated.
