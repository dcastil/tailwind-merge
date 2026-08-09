# What is it for

tailwind-merge resolves conflicts between Tailwind classes in JS — `twMerge('p-2 p-4')` keeps only `p-4`. To do that it must know, for every class, which group of conflicting styles it belongs to.

The standalone tailwind-merge package can't know *your* theme, so its default configuration approximates the **default** Tailwind theme with loose patterns. The moment you customize your theme, that approximation breaks down:

- A custom font size `--text-huge: 2.5rem` produces `text-huge`, which the default config misreads as a text **color** — so `twMerge('text-huge text-sm')` keeps both classes and your element gets an ambiguous font size ([tailwind-merge#684](https://github.com/dcastil/tailwind-merge/issues/684)).
- Whole namespaces the default config doesn't model — `--z-index-*`, `--border-width-*`, utility-specific colors like `--text-color-*` — silently fall through to wrong groups.
- The manual fix is [configuring tailwind-merge by hand](https://github.com/dcastil/tailwind-merge/blob/main/docs/configuration.md) and keeping that configuration in sync with your theme forever.

This plugin removes the whole problem class. At dev-server start and at build time, it loads your CSS through Tailwind's own APIs — the same resolution your real build performs, including theme overrides, resets, `@utility`, `@plugin`, `@config`, and prefixes — and generates a tailwind-merge configuration that matches it exactly. Custom utilities even get conflict inference: a `btn` utility that sets padding will correctly override an earlier `p-4`.

You import the result from one place:

```ts
import { twMerge } from '@tailwind-merge/vite/runtime'
```

Everything your Tailwind setup can produce merges correctly, and when your theme changes, the configuration follows automatically.
