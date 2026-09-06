# Getting started

## Requirements

- Vite 6, 7, or 8
- Tailwind CSS v4 processed by Vite — the usual [`@tailwindcss/vite`](https://tailwindcss.com/docs/installation/using-vite) setup (the currently supported Tailwind line is v4.3)
- The published plugin will supply tailwind-merge as a dependency. Before release, local evaluation must explicitly resolve the plugin and library to matching checkout builds.

## Availability and installation

The plugin is currently unreleased. Use matching local builds from this repository for evaluation; the [development guide](../../../agents/vite-plugin.md#build-and-packaging) describes building and verifying them, and the [release guide](../../../agents/release-workflow.md#first-vite-release) records the dependency prerequisite. Installing only a plugin tarball against the old registry library will not work.

Build and verify the local packages from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter tailwind-merge build
pnpm --filter @tailwind-merge/vite build
pnpm --filter @tailwind-merge/vite test:exports
```

For a separate test app, make its package manager resolve both packages to these local builds, including the plugin's transitive `tailwind-merge` dependency. The packed-package check demonstrates that paired setup; it does not install the plugin into your app.

After the first release, installation will be:

```bash
pnpm add -D @tailwind-merge/vite
```

(or `npm install -D` / `yarn add -D` / `bun add -D`)

## Set up

Add the plugin next to `@tailwindcss/vite`:

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import tailwindMerge from '@tailwind-merge/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [tailwindcss(), tailwindMerge()],
})
```

Then import `twMerge` from the runtime subpath anywhere in your app:

```ts
import { twMerge } from '@tailwind-merge/vite/runtime'

export function Button({ className, ...props }) {
    return <button className={twMerge('rounded bg-blue-600 px-3 py-1', className)} {...props} />
}
```

That's it. The plugin finds your Tailwind CSS entrypoint on its own — only projects with several independent Tailwind roots need to point it at the right one via the [`css` option](./api-reference.md#options).

## Migrating from tailwind-merge

If your project already uses tailwind-merge directly (every shadcn/ui template does), migration is two steps:

1. Rewire application imports to the runtime subpath, typically in one place as shown below.
2. Once all direct uses are migrated, remove the application's `tailwind-merge` dependency. Keeping imports from both modules can retain the default config alongside the generated one. For pre-release local evaluation, keep any dependency override that supplies the matching library build.

```diff
 // lib/utils.ts
 import { clsx, type ClassValue } from 'clsx'
-import { twMerge } from 'tailwind-merge'
+import { twMerge } from '@tailwind-merge/vite/runtime'

 export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
 }
```

If you used `extendTailwindMerge` to teach tailwind-merge about your theme, you can most likely delete that configuration — the generated config already knows your theme, including custom utilities. Keep only extensions for class groups that don't come from your CSS at all, and layer them via the runtime's [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge), which extends the generated config instead of the default one.

## Tests and other tools

The runtime subpath is a real module, so imports keep working everywhere:

- **Vitest** uses generated behavior when its resolved configuration includes this plugin. If a separate Vitest config replaces your Vite config, include or merge the plugin configuration there too. Dev pruning defaults apply to these tests.
- **Jest, plain Node scripts, tools without the plugin** resolve the real runtime subpath and get default tailwind-merge behavior. The module is ESM; the test runner and Node version must support the package's module format. Tests relying on custom-theme behavior need the plugin-enabled pipeline.
