# Configuration

## Basic usage

If you're using Tailwind CSS without any extra config, you can use [`twMerge`](./api-reference.md#twmerge) right away. You can safely stop reading the documentation here.

## Usage with custom Tailwind config

If you're using a custom Tailwind config, you may need to configure tailwind-merge as well to merge classes properly.

The default [`twMerge`](./api-reference.md#twmerge) function is configured in a way that you can still use it if all the following points apply to your Tailwind config:

-   Only using color names which don't clash with other Tailwind class names
-   Only deviating by number values from number-based Tailwind classes
-   Only using font-family classes which don't clash with default font-weight classes
-   Sticking to default Tailwind config for everything else

If some of these points don't apply to you, you can test whether `twMerge` still works as intended with your custom classes. Otherwise, you need create your own custom merge function by either extending the default tailwind-merge config or using a completely custom one.

The tailwind-merge config is different from the Tailwind config because it's expected to be shipped and run in the browser as opposed to the Tailwind config which is meant to run at build-time. Be careful in case you're using your Tailwind config directly to configure tailwind-merge in your client-side code because that could result in an unnecessarily large bundle size.

### Shape of tailwind-merge config

The tailwind-merge config is an object with a few keys.

```ts
const tailwindMergeConfig = {
    // ↓ Set how many values should be stored in cache.
    cacheSize: 500,
    // ↓ Optional prefix from TaiLwind config
    prefix: 'tw-',
    // ↓ Optional separator from TaiLwind config
    separator: '_',
    theme: {
        // Theme scales are defined here
        // This is not the theme object from your Tailwind config
    },
    classGroups: {
        // Class groups are defined here
    },
    conflictingClassGroups: {
        // Conflicts between class groups are defined here
    },
}
```

### Class groups

The library uses a concept of _class groups_ which is an array of Tailwind classes which all modify the same CSS property. E.g. here is the position class group.

```ts
const positionClassGroup = ['static', 'fixed', 'absolute', 'relative', 'sticky']
```

tailwind-merge resolves conflicts between classes in a class group and only keeps the last one passed to the merge function call.

```ts
twMerge('static sticky relative') // → 'relative'
```

Tailwind classes often share the beginning of the class name, so elements in a class group can also be an object with values of the same shape as a class group (yes, the shape is recursive). In the object each key is joined with all the elements in the corresponding array with a dash (`-`) in between.

E.g. here is the overflow class group which results in the classes `overflow-auto`, `overflow-hidden`, `overflow-visible` and `overflow-scroll`.

```ts
const overflowClassGroup = [{ overflow: ['auto', 'hidden', 'visible', 'scroll'] }]
```

Sometimes it isn't possible to enumerate all elements in a class group. Think of a Tailwind class which allows arbitrary values. In this scenario you can use a validator function which takes a _class part_ and returns a boolean indicating whether a class is part of a class group.

E.g. here is the fill class group.

```ts
const isArbitraryValue = (classPart: string) => /^\[.+\]$/.test(classPart)
const fillClassGroup = [{ fill: ['current', isArbitraryValue] }]
```

Because the function is under the `fill` key, it will only get called for classes which start with `fill-`. Also, the function only gets passed the part of the class name which comes after `fill-`, this way you can use the same function in multiple class groups. tailwind-merge exports its own [validators](./api-reference.md#validators), so you don't need to recreate them.

You can use an empty string (`''`) as a class part if you want to indicate that the preceding part was the end. This is useful for defining elements which are marked as `DEFAULT` in the Tailwind config.

```ts
// ↓ Resolves to filter and filter-none
const filterClassGroup = [{ filter: ['', 'none'] }]
```

Each class group is defined under its ID in the `classGroups` object in the config. This ID is only used internally, and the only thing that matters is that it is unique among all class groups.

### Conflicting class groups

Sometimes there are conflicts across Tailwind classes which are more complex than "remove all those other classes when a class from this group is present in the class list string".

One example is the combination of the classes `px-3` (setting `padding-left` and `padding-right`) and `pr-4` (setting `padding-right`).

If they are passed to `twMerge` as `pr-4 px-3`, I think you most likely intend to apply `padding-left` and `padding-right` from the `px-3` class and want `pr-4` to be removed, indicating that both these classes should belong to a single class group.

But if they are passed to `twMerge` as `px-3 pr-4`, I assume you want to set the `padding-right` from `pr-4` but still want to apply the `padding-left` from `px-3`, so `px-3` shouldn't be removed when inserting the classes in this order, indicating they shouldn't be in the same class group.

To summarize, `px-3` should stand in conflict with `pr-4`, but `pr-4` should not stand in conflict with `px-3`. To achieve this, we need to define asymmetric conflicts across class groups.

This is what the `conflictingClassGroups` object in the tailwind-merge config is for. You define a key in it which is the ID of a class group which _creates_ a conflict and the value is an array of IDs of class group which _receive_ a conflict.

```ts
const conflictingClassGroups = {
    px: ['pr', 'pl'],
}
```

If a class group _creates_ a conflict, it means that if it appears in a class list string passed to `twMerge`, all preceding class groups in the string which _receive_ the conflict will be removed.

When we think of our example, the `px` class group creates a conflict which is received by the class groups `pr` and `pl`. This way `px-3` removes a preceding `pr-4`, but not the other way around.

### Theme

In the Tailwind config you can modify theme scales. tailwind-merge follows the same keys for the theme scales, but doesn't support all of them. tailwind-merge only supports theme scales which are used in multiple class groups to save bundle size (more info to that in [PR 55](https://github.com/dcastil/tailwind-merge/pull/55)). At the moment these are:

-   `colors`
-   `spacing`
-   `blur`
-   `brightness`
-   `borderColor`
-   `borderRadius`
-   `borderSpacing`
-   `borderWidth`
-   `contrast`
-   `grayscale`
-   `hueRotate`
-   `invert`
-   `gap`
-   `gradientColorStops`
-   `inset`
-   `margin`
-   `opacity`
-   `padding`
-   `saturate`
-   `scale`
-   `sepia`
-   `skew`
-   `space`
-   `translate`

If you modified one of these theme scales in your Tailwind config, you can add all your keys right here and tailwind-merge will take care of the rest. If you modified other theme scales, you need to figure out the class group to modify in the [default config](./api-reference.md#getdefaultconfig).

### Extending the tailwind-merge config

If you only need to extend the default tailwind-merge config, [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge) is the easiest way to extend the config. You provide it a `configExtension` object which gets [merged](./api-reference.md#mergeconfigs) with the default config. Therefore, all keys here are optional.

```ts
import { extendTailwindMerge } from 'tailwind-merge'

const customTwMerge = extendTailwindMerge({
    // ↓ Add values to existing theme scale or create a new one
    theme: {
        spacing: ['sm', 'md', 'lg'],
    },
    // ↓ Add values to existing class groups or define new ones
    classGroups: {
        foo: ['foo', 'foo-2', { 'bar-baz': ['', '1', '2'] }],
        bar: [{ qux: ['auto', (value) => Number(value) >= 1000] }],
    },
    // ↓ Here you can define additional conflicts across class groups
    conflictingClassGroups: {
        foo: ['bar'],
    },
})
```

### Using completely custom tailwind-merge config

If you need to modify the tailwind-merge config and need more control than [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge) gives you or don't want to use the default config (and tree-shake it out of your bundle), you can use [`createTailwindMerge`](./api-reference.md#createtailwindmerge).

The function takes a callback which returns the config you want to use and returns a custom `twMerge` function.

```ts
import { createTailwindMerge } from 'tailwind-merge'

const customTwMerge = createTailwindMerge(() => ({
    cacheSize: 500,
    theme: {},
    classGroups: {
        foo: ['foo', 'foo-2', { 'bar-baz': ['', '1', '2'] }],
        bar: [{ qux: ['auto', (value) => Number(value) >= 1000] }],
    },
    conflictingClassGroups: {
        foo: ['bar'],
    },
}))
```

The callback passed to `createTailwindMerge` will be called when `customTwMerge` is called the first time, so you don't need to worry about the computations in it affecting app startup performance in case you aren't using tailwind-merge at app startup.

### Using tailwind-merge plugins

You can use both [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge) and [`createTailwindMerge`](./api-reference.md#createtailwindmerge) with third-party plugins. Just add them as arguments after your config.

```ts
import { extendTailwindMerge, createTailwindMerge } from 'tailwind-merge'
import { withMagic } from 'tailwind-merge-magic-plugin'
import { withMoreMagic } from 'tailwind-merge-more-magic-plugin'

// With your own config
const twMerge1 = extendTailwindMerge({ … }, withMagic, withMoreMagic)

// Only using plugin with default config
const twMerge2 = extendTailwindMerge(withMagic, withMoreMagic)

// Using `createTailwindMerge`
const twMerge3 = createTailwindMerge(() => ({  … }), withMagic, withMoreMagic)
```

---

Next: [Recipes](./recipes.md)

Previous: [Features](./features.md)
