# Getting started

## Requirements

- Vite 6, 7, or 8
- Tailwind CSS v4 processed by Vite — the usual [`@tailwindcss/vite`](https://tailwindcss.com/docs/installation/using-vite) setup (the currently supported Tailwind line is v4.3)
- You do **not** install tailwind-merge yourself — it ships inside the plugin, always in a version matching the generated code

## Install

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

1. Remove the `tailwind-merge` dependency from your package.json — otherwise you bundle two copies.
2. Rewire the import, typically in one place:

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

- **Vitest** picks the plugin up through your Vite config, so tests exercise the same generated `twMerge` as the app.
- **Jest, plain Node scripts, tools without your Vite config** fall back to tailwind-merge's default behavior — same API, just without project-specific precision. Nothing crashes, nothing needs mocking.
