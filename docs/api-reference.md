# API reference

Reference to all exports of tailwind-merge.

## `twMerge`

```ts
function twMerge(
    ...classLists: Array<string | undefined | null | false | 0 | typeof classLists>
): string
```

Default function to use if you're using the default Tailwind config or are close enough to the default config. Check out [basic usage](./configuration.md#basic-usage) for more info.

If `twMerge` doesn't work for you, you can create your own custom merge function with [`extendTailwindMerge`](#extendtailwindmerge).

## `twJoin`

```ts
function twJoin(
    ...classLists: Array<string | undefined | null | false | 0 | typeof classLists>
): string
```

Function to join className strings conditionally without resolving conflicts.

```ts
twJoin(
    'border border-red-500',
    hasBackground && 'bg-red-100',
    hasLargeText && 'text-lg',
    hasLargeSpacing && ['p-2', hasLargeText ? 'leading-8' : 'leading-7'],
)
```

It is used internally within `twMerge` and a direct subset of [`clsx`](https://www.npmjs.com/package/clsx). If you use `clsx` or [`classnames`](https://www.npmjs.com/package/classnames) to apply Tailwind classes conditionally and don't need support for object arguments, you can use `twJoin` instead, it is a little faster and will save you a few hundred bytes in bundle size.

## `getDefaultConfig`

```ts
function getDefaultConfig(): Config
```

Function which returns the default config used by tailwind-merge. The tailwind-merge config is different from the Tailwind config. It is optimized for small bundle size and fast runtime performance because it is expected to run in the browser.

## `fromTheme`

```ts
function fromTheme(key: string): ThemeGetter
```

Function to retrieve values from a theme scale, to be used in class groups.

`fromTheme` doesn't return the values from the theme scale, but rather another function which is used by tailwind-merge internally to retrieve the theme values. tailwind-merge can differentiate the theme getter function from a validator because it has a `isThemeGetter` property set to `true`.

It can be used like this:

```ts
extendTailwindMerge({
    theme: {
        'my-scale': ['foo', 'bar']
    },
    classGroups: {
        'my-group': [{ 'my-group': [fromTheme('my-scale'), fromTheme('spacing')] }]
        'my-group-x': [{ 'my-group-x': [fromTheme('my-scale')] }]
    }
})
```

## `extendTailwindMerge`

```ts
function extendTailwindMerge(
    configExtension: Partial<Config>,
    ...createConfig: Array<(config: Config) => Config>
): TailwindMerge
function extendTailwindMerge(...createConfig: Array<(config: Config) => Config>): TailwindMerge
```

Function to create merge function with custom config which extends the default config. Use this if you use the default Tailwind config and just extend it in some places.

You provide it a `configExtension` object which gets [merged](#mergeconfigs) with the default config.

```ts
const customTwMerge = extendTailwindMerge({
    cacheSize: 0, // ← Disabling cache
    // ↓ Optional prefix from TaiLwind config
    prefix: 'tw-',
    // ↓ Optional separator from TaiLwind config
    separator: '_',
    // ↓ Add values to existing theme scale or create a new one
    //   Not all theme keys form the Tailwind config are supported by default.
    theme: {
        spacing: ['sm', 'md', 'lg'],
    },
    // ↓ Here you define class groups
    classGroups: {
        // ↓ The `foo` key here is the class group ID
        //   ↓ Creates group of classes which have conflicting styles
        //     Classes here: foo, foo-2, bar-baz, bar-baz-1, bar-baz-2
        foo: ['foo', 'foo-2', { 'bar-baz': ['', '1', '2'] }],
        //   ↓ Functions can also be used to match classes.
        //     Classes here: qux-auto, qux-1000, qux-1001,…
        bar: [{ qux: ['auto', (value) => Number(value) >= 1000] }],
        baz: ['baz-sm', 'baz-md', 'baz-lg'],
    },
    // ↓ Here you can define additional conflicts across different groups
    conflictingClassGroups: {
        // ↓ ID of class group which creates a conflict with…
        //     ↓ …classes from groups with these IDs
        // In this case `twMerge('qux-auto foo') → 'foo'`
        foo: ['bar'],
    },
    // ↓ Here you can define conflicts between the postfix modifier of a group and a different class group.
    conflictingClassGroupModifiers: {
        // ↓ ID of class group whose postfix modifier creates a conflict with…
        //     ↓ …classes from groups with these IDs
        // In this case `twMerge('qux-auto baz-sm/1000') → 'baz-sm/1000'`
        baz: ['bar'],
    },
})
```

Additionally, you can pass multiple `createConfig` functions (more to that in [`createTailwindMerge`](#createtailwindmerge)) which is convenient if you want to combine your config with third-party plugins.

```ts
const customTwMerge = extendTailwindMerge({ … }, withSomePlugin)
```

If you only use plugins, you can omit the `configExtension` object as well.

```ts
const customTwMerge = extendTailwindMerge(withSomePlugin)
```

## `createTailwindMerge`

```ts
function createTailwindMerge(
    ...createConfig: [() => Config, ...Array<(config: Config) => Config>]
): TailwindMerge
```

Function to create merge function with custom config. Use this function instead of [`extendTailwindMerge`](#extendtailwindmerge) if you don't need the default config or want more control over the config.

You need to provide a function which resolves to the config tailwind-merge should use for the new merge function. You can either extend from the default config or create a new one from scratch.

```ts
// ↓ Callback passed to `createTailwindMerge` is called when
//   `customTwMerge` gets called the first time.
const customTwMerge = createTailwindMerge(() => {
    const defaultConfig = getDefaultConfig()

    return {
        cacheSize: 0,
        classGroups: {
            ...defaultConfig.classGroups,
            foo: ['foo', 'foo-2', { 'bar-baz': ['', '1', '2'] }],
            bar: [{ qux: ['auto', (value) => Number(value) >= 1000] }],
            baz: ['baz-sm', 'baz-md', 'baz-lg'],
        },
        conflictingClassGroups: {
            ...defaultConfig.conflictingClassGroups,
            foo: ['bar'],
        },
        conflictingClassGroupModifiers: {
            ...defaultConfig.conflictingClassGroupModifiers,
            baz: ['bar'],
        },
    }
})
```

Same as in [`extendTailwindMerge`](#extendtailwindmerge) you can use multiple `createConfig` functions which is convenient if you want to combine your config with third-party plugins. Just keep in mind that the first `createConfig` function does not get passed any arguments, whereas the subsequent functions get each passed the config from the previous function.

```ts
const customTwMerge = createTailwindMerge(getDefaultConfig, withSomePlugin, (config) => ({
    // ↓ Config returned by `withSomePlugin`
    ...config,
    classGroups: {
        ...config.classGroups,
        mySpecialClassGroup: [{ special: ['1', '2'] }],
    },
}))
```

But don't merge configs like that. Use [`mergeConfigs`](#mergeconfigs) instead.

## `mergeConfigs`

```ts
function mergeConfigs(baseConfig: Config, configExtension: Partial<Config>): Config
```

Helper function to merge multiple config objects. Objects are merged, arrays are concatenated, scalar values are overridden and `undefined` does nothing. The function assumes that both parameters are tailwind-merge config objects and shouldn't be used as a generic merge function.

```ts
const customTwMerge = createTailwindMerge(getDefaultConfig, (config) =>
    mergeConfigs(config, {
        classGroups: {
            // ↓ Adding new class group
            mySpecialClassGroup: [{ special: ['1', '2'] }],
            // ↓ Adding value to existing class group
            animate: ['animate-magic'],
        },
    }),
)
```

## `validators`

```ts
interface Validators {
    isLength(value: string): boolean
    isArbitraryLength(value: string): boolean
    isNumber(value: string): boolean
    isInteger(value: string): boolean
    isPercent(value: string): boolean
    isArbitraryValue(value: string): boolean
    isTshirtSize(value: string): boolean
    isArbitrarySize(value: string): boolean
    isArbitraryPosition(value: string): boolean
    isArbitraryUrl(value: string): boolean
    isArbitraryNumber(value: string): boolean
    isArbitraryShadow(value: string): boolean
    isAny(value: string): boolean
}
```

An object containing all the validators used in tailwind-merge. They are useful if you want to use a custom config with [`extendTailwindMerge`](#extendtailwindmerge) or [`createTailwindMerge`](#createtailwindmerge). E.g. the `classGroup` for padding is defined as

```ts
const paddingClassGroup = [{ p: [validators.isLength] }]
```

A brief summary for each validator:

-   `isLength` checks whether a class part is a number (`3`, `1.5`), a fraction (`3/4`), a arbitrary length (`[3%]`, `[4px]`, `[length:var(--my-var)]`), or one of the strings `px`, `full` or `screen`.
-   `isArbitraryLength` checks for arbitrary length values (`[3%]`, `[4px]`, `[length:var(--my-var)]`).
-   `isNumber` checks for numbers (`3`, `1.5`)
-   `isArbitraryNumber` checks whether class part is an arbitrary value which starts with `number:` or is a number (`[number:var(--value)]`, `[450]`) which is necessary for font-weight and stroke-width classNames.
-   `isInteger` checks for integer values (`3`) and arbitrary integer values (`[3]`).
-   `isPercent` checks for percent values (`12.5%`) which is used for color stop positions.
-   `isArbitraryValue` checks whether the class part is enclosed in brackets (`[something]`)
-   `isTshirtSize`checks whether class part is a T-shirt size (`sm`, `xl`), optionally with a preceding number (`2xl`).
-   `isArbitrarySize` checks whether class part is an arbitrary value which starts with `size:` (`[size:200px_100px]`) which is necessary for background-size classNames.
-   `isArbitraryPosition` checks whether class part is an arbitrary value which starts with `position:` (`[position:200px_100px]`) which is necessary for background-position classNames.
-   `isArbitraryUrl` checks whether class part is an arbitrary value which starts with `url:` or `url(` (`[url('/path-to-image.png')]`, `url:var(--maybe-a-url-at-runtime)]`) which is necessary for background-image classNames.
-   `isArbitraryShadow` checks whether class part is an arbitrary value which starts with the same pattern as a shadow value (`[0_35px_60px_-15px_rgba(0,0,0,0.3)]`), namely with two lengths separated by a underscore.
-   `isAny` always returns true. Be careful with this validator as it might match unwanted classes. I use it primarily to match colors or when I'm certain there are no other class groups in a namespace.

## `Config`

```ts
interface Config { … }
```

TypeScript type for config object. Useful if you want to build a `createConfig` function but don't want to define it inline in [`extendTailwindMerge`](#extendtailwindmerge) or [`createTailwindMerge`](#createtailwindmerge).

---

Next: [Writing plugins](./writing-plugins.md)

Previous: [Recipes](./recipes.md)
