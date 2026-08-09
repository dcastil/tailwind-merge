# @tailwind-merge/vite

A [Vite](https://vite.dev) plugin that configures [tailwind-merge](https://github.com/dcastil/tailwind-merge) for your project's own [Tailwind CSS](https://tailwindcss.com) theme — automatically, at build time, with nothing to maintain by hand.

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import tailwindMerge from '@tailwind-merge/vite'

export default {
    plugins: [tailwindcss(), tailwindMerge()],
}
```

```ts
import { twMerge } from '@tailwind-merge/vite/runtime'

// With `--text-huge: 2.5rem` in your @theme:
twMerge('text-huge text-sm')
// → 'text-sm' — plain tailwind-merge would keep both, misreading text-huge as a color
```

- Zero configuration: your Tailwind CSS entrypoint is auto-detected, the merge config is generated from the theme Tailwind actually resolves
- One install: tailwind-merge ships inside the plugin, you don't add it yourself
- Nothing written to disk: the generated module is served in-memory, so no checked-in artifacts and no TypeScript-server churn
- Quiet in development: the config regenerates only when your Tailwind configuration changes, and reloads only when the result actually differs
- Requires Vite 6+ and Tailwind CSS v4

> **Status: pre-1.0.** The plugin works and is tested, but treat it as not production-ready until 1.0.0 — see [Versioning](./docs/versioning.md).

## Get started

- [What is it for](./docs/what-is-it-for.md)
- [Getting started](./docs/getting-started.md)
- [How it works](./docs/how-it-works.md)
- [API reference](./docs/api-reference.md)
- [Limitations](./docs/limitations.md)
- [Versioning](./docs/versioning.md)
