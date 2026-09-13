# @tailwind-merge/next

A [Next.js](https://nextjs.org) plugin that configures [tailwind-merge](https://github.com/dcastil/tailwind-merge) for your project's own [Tailwind CSS](https://tailwindcss.com) theme — automatically, at build time, with nothing to maintain by hand. Works with Turbopack and webpack.

```ts
// next.config.ts
import { withTailwindMerge } from '@tailwind-merge/next'

export default withTailwindMerge({
    // your Next.js config
})
```

```ts
import { twMerge } from '@tailwind-merge/next/runtime'

// With `--text-huge: 2.5rem` in your @theme:
twMerge('text-huge text-sm')
// → 'text-sm' — plain tailwind-merge would keep both, misreading text-huge as a color
```

- Zero configuration: your Tailwind CSS entrypoint is auto-detected, the merge config is generated from the theme Tailwind actually resolves
- One package to add: tailwind-merge is supplied as the plugin's runtime dependency
- Nothing written to disk: the generated module replaces the runtime import inside the bundler pipeline, so no checked-in artifacts and no TypeScript-server churn
- Consistent everywhere: server components, server rendering, and the browser all get the same generated module
- Quiet in development: the config regenerates only when your Tailwind configuration changes
- Small in production: the config is pruned to the classes found in your sources — the same files Tailwind scans — with substantial savings in the [measured project samples](../../agents/configurator-performance.md)
- Declares support for Next.js 16 with Turbopack or webpack and the Tailwind CSS v4.3 line; see [coverage limits](./docs/limitations.md)

> **Status: pre-release, pre-1.0.** There is no stable release yet. Dev builds are published to npm under the `dev` tag for evaluation, manually for now — see [Getting started](./docs/getting-started.md#availability-and-installation). Treat the plugin as not production-ready until 1.0.0 — see [Versioning](./docs/versioning.md).

## Get started

- [What is it for](./docs/what-is-it-for.md)
- [Getting started](./docs/getting-started.md)
- [How it works](./docs/how-it-works.md)
- [API reference](./docs/api-reference.md)
- [Limitations](./docs/limitations.md)
- [Versioning](./docs/versioning.md)

Using Vite instead? [@tailwind-merge/vite](../vite/README.md) is the same idea for Vite apps. For work on the plugin itself, read the [Next.js development guide](../../agents/next-plugin.md).
