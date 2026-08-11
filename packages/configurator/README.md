# @tailwind-merge/configurator

A build tool that generates a project-specific [tailwind-merge](https://github.com/dcastil/tailwind-merge) setup from your [Tailwind CSS](https://tailwindcss.com) v4 entrypoint. It loads your fully resolved theme through Tailwind's own APIs and emits a standalone module exporting a `twMerge` that knows your design system exactly — custom scales, utility-specific color namespaces like `--text-color-*`, resets, prefixes, `@config`/`@plugin` contributions, and custom `@utility` definitions included, with nothing to maintain by hand.

```ts
import { readFile, writeFile } from 'node:fs/promises'
import { generate } from '@tailwind-merge/configurator'

const { code, plan } = await generate({
    css: await readFile('src/app.css', 'utf8'),
    // Directory Tailwind resolves imports from — usually the entrypoint's directory. Your project's own tailwindcss installation is used.
    base: 'src',
})

await writeFile('src/lib/tw-merge.generated.ts', code)
```

```ts
// Anywhere in your app:
import { twMerge } from './lib/tw-merge.generated'

// With `--text-huge: 2.5rem` in your @theme:
twMerge('text-huge text-sm')
// → 'text-sm' — plain tailwind-merge would keep both, misreading text-huge as a color
```

> **Status: unpublished prototype with an unstable API.** This package works and is thoroughly tested (see below), but it is not on npm yet and its API may change shape while we figure out the right one. The stable way to consume it is the [@tailwind-merge/vite](../vite/README.md) plugin, which wraps this tool with a minimal surface. Use the configurator directly when your pipeline can't use Vite — just expect to follow API changes until it gets a real release. Design and implementation notes live in [PROPOSAL.md](./PROPOSAL.md).

## What you need

- Node.js 22.18 or newer (the package runs straight from TypeScript sources; Node's built-in type stripping handles them).
- Tailwind CSS v4 — `tailwindcss` and `@tailwindcss/node` installed in the project whose CSS you generate from. Verified against `^4.3.3`.
- **At generation time:** the in-repo version of tailwind-merge. Generation uses two APIs that ship with tailwind-merge `3.7.0` (`themeKey` on theme getters and the `tailwind-merge/unstable-do-not-import` entry point). Until 3.7.0 is on npm, run generation from a checkout of this repository, where the workspace wires everything up.
- **At runtime:** any published tailwind-merge `>=3.6.0`. The generated module imports only the stable public API (`createTailwindMerge` and `validators`), so you can commit it into a project that installs tailwind-merge normally — the configurator's version constraints don't follow it there.

## Running from this repository

While unpublished, use a checkout of this branch:

```bash
git clone --branch feature/add-tailwind-merge-configurator https://github.com/dcastil/tailwind-merge.git
cd tailwind-merge
pnpm install --frozen-lockfile
# Builds the in-repo tailwind-merge the configurator imports at generation time (one-time):
pnpm --filter tailwind-merge build
```

Then either script against the JS API (a plain `.mjs`/`.ts` file importing `@tailwind-merge/configurator` works anywhere inside the workspace), or use the CLI directly:

```bash
node packages/configurator/src/cli.ts --input path/to/app.css --output path/to/tw-merge.generated.ts
```

The emitted file is self-contained — copy it into any project. Regenerate whenever your theme changes.

## JS API

```ts
import { generate } from '@tailwind-merge/configurator'

const { code, config, plan } = await generate(options)
```

Options:

| Option | Required | What it does |
| --- | --- | --- |
| `css` | yes | Content of your Tailwind CSS entrypoint — the file containing `@import 'tailwindcss'` and your `@theme` customizations. |
| `base` | yes | Directory used to resolve imports in the CSS (local files, `tailwindcss` itself, `@plugin`/`@config` references), usually the entrypoint's directory. |
| `cacheSize` | no | LRU cache size passed through to the generated config. Defaults to tailwind-merge's default. |
| `banner` | no | Extra comment lines below the generated-file notice, e.g. provenance info. |
| `format` | no | `'ts'` (default) or `'js'` — the emitted module's language. |
| `importSource` | no | Module specifier the emitted code imports tailwind-merge from. Defaults to `'tailwind-merge'`; override when you re-export tailwind-merge from somewhere else (the Vite plugin uses this). |

Results:

- `code` — source text of the generated module. It exports `twMerge` (ready to use) and `getConfig` (the config factory, for composing further via `createTailwindMerge(getConfig, ...extensions)` or `mergeConfigs`).
- `config` — the same config as a runtime object, so you can build a merge function in-process without writing a file: `createTailwindMerge(() => config)`.
- `plan` — the intermediate representation including `plan.report`, which tells you what the generator did: chosen scale encodings, pruned groups, classes added beyond the standard namespaces, resolved name collisions, custom-utility handling, and — most importantly — `unassignedClasses`: theme-created classes no group could be determined for. An empty list means every class the theme creates is covered; surface non-empty ones as warnings in your pipeline.

## CLI

```
node packages/configurator/src/cli.ts --input <tailwind-css-entrypoint> --output <generated-module-path> [--format ts|js] [--check]
```

- Without `--format`, the emitted language follows the output file's extension.
- `--check` regenerates in memory and compares against the file on disk without writing, exiting non-zero when it's missing or out of date — wire it into CI to catch a theme changing without the generated module being refreshed.
- The report (including `unassignedClasses` warnings) is printed to the console.
- Output is deterministic per input state, and the header records a content hash of the input, so diffs only appear when behavior actually changes.

## Distributing a config with a design system

The generated module is a good fit for shipping alongside a design system: generate against your system's CSS entrypoint, publish the emitted file (or its built output) in your package, and consumers get a `twMerge` that understands your tokens with zero setup — they only need tailwind-merge `>=3.6.0` installed, or none at all if you bundle it. Exporting `getConfig` keeps them free to layer their own extensions on top.

## What it handles, and known limits

Everything is derived from the design system Tailwind itself resolves — there is no hand-maintained mapping to drift out of date. That includes theme overrides and extensions, namespace resets (`--color-*: initial`), Tailwind's undocumented compat sub-namespaces (`--text-color-*`, `--background-color-*`, `--border-width-*`, `--z-index-*`, …), the `--spacing` multiplier semantics, import prefixes, `@config`/`@plugin` contributions, and custom `@utility` definitions (classified empirically: utilities matching a built-in group join it, the rest get their own group plus inferred override relationships where their declarations fully cover another group's).

Correctness is enforced by a conformance sweep that checks every consecutive pair of the design system's class list against Tailwind's own compiled CSS, run over synthetic fixtures, a stress fixture, and seven real-world project configurations (see [tests/fixtures/real-world/](./tests/fixtures/real-world/README.md)).

Known limits:

- Packages referenced via `@import`/`@plugin`/`@config` must be installed where generation runs — Tailwind resolves them for real.
- Only Tailwind CSS v4 entrypoints; `^4.3.3` is the verified range so far (a wider version matrix is planned).
- Generation relies on Tailwind's `__unstable__loadDesignSystem` API — the same contract editor tooling like Tailwind's IntelliSense builds on, but not covered by Tailwind's semver.
- Custom utilities whose declarations only partially overlap a built-in group deliberately stay side by side instead of merging — removing either class could lose part of its effect.
