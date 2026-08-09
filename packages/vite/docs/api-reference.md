# API reference

## Plugin

```ts
import tailwindMerge from '@tailwind-merge/vite'

tailwindMerge(options?: TailwindMergeOptions): Plugin
```

The default export. Add the returned plugin to your Vite config, next to `@tailwindcss/vite`.

### Options

All options are optional — the zero-argument form is the intended everyday use.

| Option      | Type     | Description                                                                                                                                                                                             |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `css`       | `string` | Path to your Tailwind CSS entrypoint, relative to the Vite root. Only needed when auto-detection reports several independent Tailwind roots, or when your entrypoint lives outside the Vite root.        |
| `cacheSize` | `number` | LRU cache size of the generated `twMerge`, passed through to the generated configuration. Defaults to tailwind-merge's default (500).                                                                     |

## The runtime module

```ts
import { twMerge } from '@tailwind-merge/vite/runtime'
```

The stable import surface. While Vite runs, it serves the module generated from your theme; outside Vite it falls back to tailwind-merge's default behavior with the same exports. The surface mirrors tailwind-merge's public API with your project's configuration swapped in:

### `twMerge`

The star of the show — [tailwind-merge's `twMerge`](https://github.com/dcastil/tailwind-merge/blob/main/docs/api-reference.md#twmerge), configured for your theme.

### `getConfig`

Returns the generated configuration object, freshly built per call. Useful for composing with wrapper libraries or inspecting what was generated.

### `extendTailwindMerge`

Like [tailwind-merge's `extendTailwindMerge`](https://github.com/dcastil/tailwind-merge/blob/main/docs/api-reference.md#extendtailwindmerge), but it extends **your generated configuration** instead of the default one — which is what you want when adding class groups that don't come from your CSS:

```ts
import { extendTailwindMerge } from '@tailwind-merge/vite/runtime'

const customTwMerge = extendTailwindMerge<'text-style'>({
    extend: {
        classGroups: {
            'text-style': ['text-style-heading', 'text-style-body'],
        },
    },
})
```

### `twJoin`, `createTailwindMerge`, `mergeConfigs`, `validators`

Re-exported unchanged from tailwind-merge, so customization never requires a direct tailwind-merge dependency. See the [tailwind-merge API reference](https://github.com/dcastil/tailwind-merge/blob/main/docs/api-reference.md).

### Types

`ClassNameValue`, `ClassValidator`, `Config`, and `ConfigExtension` are re-exported.

`fromTheme` is deliberately **not** part of the surface: generated configurations materialize theme scales inline and carry an empty `theme` object, so theme getters would never match anything. Extend with literal class groups instead.
