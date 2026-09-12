# @tailwind-merge/configurator

Generate a project-specific [tailwind-merge](https://github.com/dcastil/tailwind-merge) module from a Tailwind CSS v4 entrypoint. The configurator reads your resolved theme, including custom scales, namespace resets, prefixes, `@config`, `@plugin`, and `@utility` definitions. The generated module exports `twMerge` and `getConfig` and uses the existing tailwind-merge runtime.

```ts
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generate } from '@tailwind-merge/configurator'

const { code } = await generate({
    css: await readFile('src/app.css', 'utf8'),
    base: resolve('src'),
})

await writeFile('tw-merge.generated.ts', code)
```

```ts
import { twMerge } from './tw-merge.generated'

// With --text-huge: 2.5rem in your @theme:
twMerge('text-huge text-sm') // → 'text-sm'
```

The default encoding favors bundle size; [exact encoding](./docs/how-it-works.md#compact-and-exact-encoding) avoids overmatching finite theme scales. Optional [pruning](./docs/how-it-works.md#pruning-to-source-usage) removes unused configuration using Tailwind's own sources and scanner.

**Status: unreleased, with an unstable API.** Use it from this repository for now. For Vite applications, prefer [@tailwind-merge/vite](../vite/README.md), which handles generation and watching automatically; that package has dev builds on npm ahead of its first stable release. Direct configurator use is useful for other build pipelines and generated files.

## Documentation

- [Getting started](./docs/getting-started.md)
- [JavaScript API](./docs/api-reference.md)
- [CLI](./docs/cli.md)
- [How it works: encoding, pruning, and custom utilities](./docs/how-it-works.md)
- [Limitations and compatibility](./docs/limitations.md)

For work on the package itself, read the [configurator development guide](../../agents/configurator.md).
