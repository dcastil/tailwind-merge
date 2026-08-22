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
| `encoding`  | `'compact' \| 'exact'` | How theme scales are encoded. `'compact'` (default) picks the smallest matcher even when it accepts names beyond your theme; `'exact'` only matches names that exist, so a class that produces no CSS can never evict one that does — at a small size cost (a few percent compressed; more for palette-heavy component libraries). |
| `prune`     | `boolean \| PruneOptions` | Prunes the generated configuration to the classes found in your sources in production builds — see [how it works](./how-it-works.md#pruning-to-the-classes-you-use). `true` (default, except in [library mode](./how-it-works.md#library-mode)): prune in `vite build`, full configuration in dev. `false`: never prune. The object form has `build` (default `true`, `false` in library mode), `dev` (default `false` — also prune in the dev server, for debugging), and `log` (default `true` — one log line per generation saying what pruning did). |

### Plugin API

The returned plugin carries an `api` object, Vite's convention for what a plugin exposes to other plugins and tooling:

```ts
const plugin = tailwindMerge()
const unsubscribe = plugin.api.onUpdate((update) => {
    // update: { trigger: 'config' | 'sources', regenerated: boolean, reloaded: boolean }
})
```

`onUpdate` reports what the dev server did in reaction to a file change once it has finished processing it — whether the configuration was regenerated and whether the served module changed and a full reload was sent. It exists for tooling (and this package's own tests) that needs to know when the plugin is done with an edit instead of guessing with timeouts; everyday use never needs it.

## The runtime module

```ts
import { twMerge } from '@tailwind-merge/vite/runtime'
```

The stable import surface. While Vite runs, it serves the module generated from your theme; outside Vite it falls back to tailwind-merge's default behavior with the same exports. The surface mirrors tailwind-merge's public API with your project's configuration swapped in:

### `twMerge`

The star of the show — [tailwind-merge's `twMerge`](https://github.com/dcastil/tailwind-merge/blob/v3.6.0/docs/api-reference.md#twmerge), configured for your theme.

### `getConfig`

Returns the generated configuration object, freshly built per call. Useful for composing with wrapper libraries or inspecting what was generated.

### `extendTailwindMerge`

Like [tailwind-merge's `extendTailwindMerge`](https://github.com/dcastil/tailwind-merge/blob/v3.6.0/docs/api-reference.md#extendtailwindmerge), but it extends **your generated configuration** instead of the default one — which is what you want when adding class groups that don't come from your CSS:

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

Re-exported unchanged from tailwind-merge, so customization never requires a direct tailwind-merge dependency. See the [tailwind-merge API reference](https://github.com/dcastil/tailwind-merge/blob/v3.6.0/docs/api-reference.md).

### Types

`ClassNameValue`, `ClassValidator`, `Config`, and `ConfigExtension` are re-exported.

`fromTheme` is deliberately **not** part of the surface: generated configurations materialize theme scales inline and carry an empty `theme` object, so theme getters would never match anything. Extend with literal class groups instead.
