# Getting started

## Requirements

- Next.js 16, with Turbopack (the default) or webpack (`--webpack`)
- Tailwind CSS v4 processed by Next.js — the usual [`@tailwindcss/postcss`](https://tailwindcss.com/docs/installation/framework-guides/nextjs) setup (the currently supported Tailwind line is v4.3)
- A `tsconfig.json` or `jsconfig.json` in your project, which every `create-next-app` project has — see [why](./how-it-works.md#turbopack-and-your-compiler-config)
- Nothing else: tailwind-merge comes with the plugin as its runtime dependency, so your app needs no direct dependency on it

## Availability and installation

There is no stable release yet. Every commit on `main` is published to npm as a dev build under the `dev` tag, with a version like `0.0.0-dev.<commit sha>`: the first part is the last stable release the build corresponds to (`0.0.0` until the first one), the hash is the git commit. Dev builds are meant for evaluation, not production. Pin the exact version you tested rather than the tag, because the next commit replaces what `dev` points to.

```bash
pnpm add -D @tailwind-merge/next@dev
```

(or `npm install -D` / `yarn add -D` / `bun add -D`)

Each dev build depends on the exact tailwind-merge dev build of the same commit rather than on a released library version, because the plugin's generator relies on library internals that can change between commits. That keeps generation and runtime consistent, and it means your app may end up with a second, dev copy of tailwind-merge next to any release it depends on directly. Import `twMerge` from `@tailwind-merge/next/runtime` and the plugin uses its own copy.

After the first stable release, installation will be the same command without the `@dev` suffix.

To work against local checkout builds instead, the [development guide](../../../agents/next-plugin.md#build-and-packaging) describes building and verifying the packages.

## Set up

Wrap your Next.js config:

```ts
// next.config.ts
import { withTailwindMerge } from '@tailwind-merge/next'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // your existing config
}

export default withTailwindMerge(nextConfig)
```

`withTailwindMerge` accepts an object or the [function form](https://nextjs.org/docs/app/api-reference/config/next-config-js#configuration-as-a-function) of the config, and composes with other wrappers — put it outermost if another wrapper cannot handle a function config, or wrap the object form directly.

Then set `twMerge` up in one file of your project and import it from there everywhere else — in server components, client components, and route handlers alike:

```ts
// tw-merge.ts
export { twMerge } from '@tailwind-merge/next/runtime'
```

```ts
import { twMerge } from './tw-merge'

export function Button({ className, ...props }) {
    return <button className={twMerge('rounded bg-blue-600 px-3 py-1', className)} {...props} />
}
```

Importing the runtime subpath directly in every component works too, but a single file you control keeps later changes local to that file: wrapping `twMerge` in another function, [extending the generated configuration](./api-reference.md#extendtailwindmerge), or adopting a future change to the plugin's API such as the runtime import. If you already have a `cn` helper (every shadcn/ui project does), that file serves the same purpose.

That's it. The plugin finds your Tailwind CSS entrypoint on its own (typically `app/globals.css`) — only projects with several independent Tailwind roots need to point it at the right one via the [`css` option](./api-reference.md#options).

## Migrating from tailwind-merge

If your project already uses tailwind-merge directly (every shadcn/ui template does), migration is two steps:

1. Rewire application imports to the runtime subpath, typically in one place as shown below. If your components still import `tailwind-merge` directly, this is the moment to route them through [one file](#set-up) instead.
2. Once all direct uses are migrated, remove the application's `tailwind-merge` dependency. Keeping imports from both modules can retain the default config alongside the generated one. For pre-release local evaluation, keep any dependency override that supplies the matching library build.

```diff
 // lib/utils.ts
 import { clsx, type ClassValue } from 'clsx'
-import { twMerge } from 'tailwind-merge'
+import { twMerge } from '@tailwind-merge/next/runtime'

 export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
 }
```

If you used `extendTailwindMerge` to teach tailwind-merge about your theme, you can most likely delete that configuration — the generated config already knows your theme, including custom utilities. Keep only extensions for class groups that don't come from your CSS at all, and layer them via the runtime's [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge), which extends the generated config instead of the default one.

## Tests and other tools

The runtime subpath is a real module, so imports keep working everywhere:

- **Next.js** (`next dev`, `next build`, and everything they compile: server components, server rendering, the browser bundle, the edge runtime) serves the generated module.
- **Jest, Vitest, plain Node scripts, tools that don't run the Next.js compiler** resolve the real runtime subpath and get default tailwind-merge behavior. The module is ESM; the test runner and Node version must support the package's module format. Tests relying on custom-theme behavior need to run through the Next.js compiler — or generate a module for them with [@tailwind-merge/configurator](../../configurator/README.md).
