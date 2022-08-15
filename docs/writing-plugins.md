# Writing plugins

This library supports classes of the core Tailwind library out of the box, but not classes of any plugins. But it's possible and hopefully easy to write third-party plugins for tailwind-merge. In case you want to write a plugin, I invite you to follow these steps:

-   Create a package called `tailwind-merge-magic-plugin` with tailwind-merge as peer dependency which exports a function `withMagic` and replace "magic" with your plugin name.
-   This function would be ideally a `createConfig` function which takes a config object as argument and returns the modified config object.
-   If you create new class groups, prepend them with `magic.` (your plugin name with a dot at the end) so they don't collide with class group names from other plugins or even future class groups in tailwind-merge itself.
-   Use the [`validators`](./api-reference.md#validators) and [`mergeConfigs`](./api-reference.md#mergeconfigs) from tailwind-merge to extend the config with magic.

Here is an example of how a plugin could look like:

```ts
import { mergeConfigs, validators, Config } from 'tailwind-merge'

export function withMagic(config: Config): Config {
    return mergeConfigs(config, {
        classGroups: {
            'magic.my-group': [{ magic: [validators.isLength, 'wow'] }],
        },
    })
}
```

This plugin can then be used like this:

```ts
import { extendTailwindMerge } from 'tailwind-merge'
import { withMagic } from 'tailwind-merge-magic-plugin'

const twMerge = extendTailwindMerge(withMagic)
```

Also, feel free to check out [tailwind-merge-rtl-plugin](https://www.npmjs.com/package/tailwind-merge-rtl-plugin) as a real example of a tailwind-merge plugin.

---

Next: [Versioning](./versioning.md)

Previous: [API reference](./api-reference.md)
