# Getting started

The configurator is currently an unpublished workspace package. Its JavaScript API and CLI are usable from this repository, but their shape can change before a standalone release. Vite users can use the [Vite integration](../../vite/docs/getting-started.md) instead of maintaining a generated file.

## Requirements

- Node.js 22.18 or newer on a supported LTS release, and the repository's pinned pnpm version.
- A Tailwind CSS v4 input stylesheet. The current development baseline is Tailwind 4.3.3; see [compatibility](./limitations.md#versions-and-runtime).
- The packages and files referenced by the stylesheet's `@import`, `@plugin`, and `@config` directives, installed where Tailwind can resolve them from that stylesheet.
- A matching local build of tailwind-merge. Until the next library release, use the library from this checkout for generation and for running the emitted module.

Tailwind's compiler comes from the configurator's installed `@tailwindcss/node`; CSS imports resolve relative to `base`. Keep that compiler aligned with the Tailwind version that builds the project's CSS.

## Generate from a checkout

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter tailwind-merge build

node packages/configurator/src/cli.ts \
    --input /path/to/app/src/app.css \
    --output /path/to/app/tw-merge.generated.ts
```

There is no published CLI binary yet. The command runs the TypeScript entrypoint with Node's built-in type stripping. The library build is necessary because generation imports the library through its package exports.

The generated module imports `createTailwindMerge` and `validators` from `tailwind-merge`. Make that dependency resolve to the matching library build in the consuming app. Tailwind and the configurator are build-time dependencies; neither is needed to execute the generated module.

Import the generated function in your app:

```ts
import { twMerge } from '../tw-merge.generated'

twMerge('text-huge text-sm') // 'text-sm' when your theme defines --text-huge
```

Keep generated files outside Tailwind's scanned sources, or exclude them explicitly. The file contains class-name literals which otherwise count as source usage. For example, if `app.css` and the generated module share a directory:

```css
@import 'tailwindcss';
@source not './tw-merge.generated.ts';
```

## Keep the output up to date

Regenerate after changes to the theme, its imported files, custom utilities, or the generator/library version. For a committed generated file, run the same command with `--check` in CI. It exits unsuccessfully when the file is missing or its contents differ, without writing it.

For an output generated during every build, add `--prune /path/to/app` to scan source usage. Use the same pruning, encoding, and format arguments with `--check`. Pruned output also changes as source classes change, so it usually fits a build artifact better than a committed file.

## Use the JavaScript API

Scripts inside `packages/configurator/` can import `@tailwind-merge/configurator` through the package's self-reference. Scripts in another workspace package must declare that dependency; an arbitrary script at the repository root does not automatically resolve every workspace package.

```ts
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { generate } from '@tailwind-merge/configurator'

const input = resolve('/path/to/app/src/app.css')
const { code, plan } = await generate({
    css: await readFile(input, 'utf8'),
    base: dirname(input),
    encoding: 'exact',
})

for (const entry of plan.report.unassignedClasses) {
    console.warn(`Unassigned class: ${entry.className} (${entry.reason})`)
}

await writeFile('/path/to/app/tw-merge.generated.ts', code)
```

See the [API reference](./api-reference.md) for scanning, result fields, and composition. The [CLI reference](./cli.md) covers file generation without a script.
