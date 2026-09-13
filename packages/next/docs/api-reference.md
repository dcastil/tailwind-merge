# API reference

## Plugin

```ts
import { withTailwindMerge } from '@tailwind-merge/next'

withTailwindMerge(nextConfig?: NextConfig, options?: TailwindMergeOptions): NextConfig
withTailwindMerge(nextConfig: NextConfigFunction, options?: TailwindMergeOptions): NextConfigFunction
```

Wraps a Next.js config. An object config comes back as an object with the plugin's additions; a config function (`(phase, { defaultConfig }) => config`, sync or async) comes back as an async function that applies the same additions to whatever the original returns. The additions are:

- `turbopack.rules` — a loader rule on the plugin's own runtime module for Turbopack, one for `next dev` and one for `next build`. Existing rules are kept and run first.
- `webpack` — a hook adding the same loader rule for webpack builds, then calling your own `webpack` hook if you have one.
- `transpilePackages` — the plugin package itself, so the Pages Router's server bundle processes the runtime module instead of loading it from disk at request time.

Everything else in your config passes through untouched.

### Options

All options are optional — the zero-argument form is the intended everyday use.

| Option      | Type                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `css`       | `string`                  | Path to your Tailwind CSS entrypoint, relative to the project directory. Discovery scans `.css`, `.pcss`, and `.postcss` files. Set this for several independent roots, another filename (including extensionless files), or an entrypoint outside the scanned directories. See [discovery](./how-it-works.md#finding-your-tailwind-css).                                                                                                                                    |
| `cacheSize` | `number`                  | LRU cache size of the generated `twMerge`, passed through to the generated configuration. Defaults to tailwind-merge's default (500).                                                                                                                                                                                                                                                                                                                                        |
| `encoding`  | `'compact' \| 'exact'`    | How theme scales are encoded. `'compact'` (default) picks the smallest matcher even when it accepts names beyond your theme; `'exact'` enumerates finite names to avoid that overmatching, at a size cost. Arbitrary-value typing remains approximate; see [encoding](./how-it-works.md#encoding).                                                                                                                                                                           |
| `prune`     | `boolean \| PruneOptions` | Prunes the generated configuration to the classes found in your sources in production builds — see [how it works](./how-it-works.md#pruning-to-the-classes-you-use). `true` (default): prune in `next build`, full configuration in `next dev`. `false`: never prune. The object form has `build` (default `true`), `dev` (default `false` — also prune in the dev server, for debugging), and `log` (default `true` — one log line per generation saying what pruning did). |

The plugin entry also exports the types `TailwindMergeOptions`, `PruneOptions`, and `NextConfigFunction`.

## The runtime module

```ts
import { twMerge } from '@tailwind-merge/next/runtime'
```

The stable import surface. While Next.js compiles your app, it serves the module generated from your theme; outside the Next.js compiler it falls back to tailwind-merge's default behavior with the same exports. Import it from [one file you control](./getting-started.md#set-up) rather than in every component, so that composing or replacing `twMerge` later stays a one-file change. The surface mirrors tailwind-merge's public API with your project's configuration swapped in:

### `twMerge`

[tailwind-merge's `twMerge`](https://github.com/dcastil/tailwind-merge/blob/tailwind-merge@3.7.0/packages/tailwind-merge/docs/api-reference.md#twmerge), configured for your theme.

### `getConfig`

Returns the generated configuration object, freshly built per call. Useful for composing with wrapper libraries or inspecting what was generated.

### `extendTailwindMerge`

Like [tailwind-merge's `extendTailwindMerge`](https://github.com/dcastil/tailwind-merge/blob/tailwind-merge@3.7.0/packages/tailwind-merge/docs/api-reference.md#extendtailwindmerge), but it extends **your generated configuration** instead of the default one — which is what you want when adding class groups that don't come from your CSS:

```ts
import { extendTailwindMerge } from '@tailwind-merge/next/runtime'

const customTwMerge = extendTailwindMerge<'text-style'>({
    extend: {
        classGroups: {
            'text-style': ['text-style-heading', 'text-style-body'],
        },
    },
})
```

Generated configurations carry resolved scales inline, so changing only `theme` does not change those existing groups. With pruning, an extension referencing an absent group does not recreate it: add the group explicitly or use `prune: false`.

### `twJoin`, `createTailwindMerge`, `mergeConfigs`, `validators`

Re-exported unchanged from tailwind-merge, so customization never requires a direct tailwind-merge dependency. See the [tailwind-merge API reference](https://github.com/dcastil/tailwind-merge/blob/tailwind-merge@3.7.0/packages/tailwind-merge/docs/api-reference.md).

### Types

`ClassNameValue`, `ClassValidator`, `Config`, and `ConfigExtension` are re-exported.

`fromTheme` is deliberately **not** part of the surface: generated configurations materialize theme scales inline and carry an empty `theme` object, so theme getters would never match anything. Extend with literal class groups instead.
