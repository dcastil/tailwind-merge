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

Why no object support? [Read here](https://github.com/dcastil/tailwind-merge/discussions/137#discussioncomment-3481605).

## `getDefaultConfig`

```ts
function getDefaultConfig(): satisfies Config<DefaultClassGroupIds, DefaultThemeGroupIds>
```

Function which returns the default config used by tailwind-merge. The tailwind-merge config is different from the Tailwind config. It is optimized for small bundle size and fast runtime performance because it is expected to run in the browser.

## `fromTheme`

```ts
function fromTheme<
    AdditionalThemeGroupIds extends string = never,
    DefaultThemeGroupIdsInner extends string = DefaultThemeGroupIds,
>(key: NoInfer<DefaultThemeGroupIdsInner | AdditionalThemeGroupIds>): ThemeGetter
```

Function to retrieve values from a theme scale, to be used in class groups.

`fromTheme` doesn't return the values from the theme scale, but rather another function which is used by tailwind-merge internally to retrieve the theme values. tailwind-merge can differentiate the theme getter function from a validator because it has a `isThemeGetter` property set to `true`.

When using TypeScript, the function only allows passing the default theme group IDs as the `key` argument. If you use custom theme group IDs, you need to pass them as the generic type argument `AdditionalThemeGroupIds`. In case you aren't using the default tailwind-merge config and use a different set of theme group IDs entirely, you can also pass them as the generic type argument `DefaultThemeGroupIdsInner`. If you want to allow any keys, you can call it as `fromTheme<string>('anything-goes-here')`.

`fromTheme` can be used like this:

```ts
type AdditionalClassGroupIds = 'my-group' | 'my-group-x'
type AdditionalThemeGroupIds = 'my-scale'

extendTailwindMerge<AdditionalClassGroupIds, AdditionalThemeGroupIds>({
    extend: {
        theme: {
            'my-scale': ['foo', 'bar'],
        },
        classGroups: {
            'my-group': [
                {
                    'my-group': [
                        fromTheme<AdditionalThemeGroupIds>('my-scale'),
                        fromTheme('spacing'),
                    ],
                },
            ],
            'my-group-x': [{ 'my-group-x': [fromTheme<AdditionalThemeGroupIds>('my-scale')] }],
        },
    },
})
```

## `extendTailwindMerge`

```ts
function extendTailwindMerge<
    AdditionalClassGroupIds extends string = never,
    AdditionalThemeGroupIds extends string = never,
>(
    configExtension: ConfigExtension<
        DefaultClassGroupIds | AdditionalClassGroupIds,
        DefaultThemeGroupIds | AdditionalThemeGroupIds
    >,
    ...createConfig: ((config: GenericConfig) => GenericConfig)[]
): TailwindMerge
function extendTailwindMerge<
    AdditionalClassGroupIds extends string = never,
    AdditionalThemeGroupIds extends string = never,
>(...createConfig: ((config: GenericConfig) => GenericConfig)[]): TailwindMerge
```

Function to create merge function with custom config which extends the default config. Use this if you use the default Tailwind config and just modified it in some places.

> [!Note]
> The function `extendTailwindMerge` computes a large data structure based on the config passed to it. I recommend to call it only once and store the result in a top-level variable instead of calling it inline within another repeatedly called function.

You provide it a `configExtension` object which gets [merged](#mergeconfigs) with the default config.

When using TypeScript and you use custom class group IDs or theme group IDs, you need to pass them as the generic type arguments `AdditionalClassGroupIds` and `AdditionalThemeGroupIds`. This is enforced to prevent accidental use of non-existing class group IDs accidentally. If you want to allow any custom keys without explicitly defining them, you can pass as `string` to both arguments.

```ts
type AdditionalClassGroupIds = 'aspect-w' | 'aspect-h' | 'aspect-reset'
type AdditionalThemeGroupIds = never

const twMerge = extendTailwindMerge<AdditionalClassGroupIds, AdditionalThemeGroupIds>({
    // ↓ Optional cache size
    //   Here we're disabling the cache
    cacheSize: 0,
    // ↓ Optional prefix from TaiLwind config
    prefix: 'tw',

    // ↓ Optional config overrides
    //   Only elements from the second level onwards are overridden
    override: {
        // ↓ Theme scales to override
        theme: {
            colors: ['black', 'white', 'yellow-500'],
        },
        // ↓ Class groups to override
        classGroups: {
            // ↓ The `shadow` key here is the class group ID
            //      ↓ Creates group of classes which have conflicting styles
            //        Classes here: shadow-100, shadow-200, shadow-300, shadow-400, shadow-500
            shadow: [{ shadow: ['100', '200', '300', '400', '500'] }],
        },
        // ↓ Conflicts across different groups to override
        conflictingClassGroups: {
            // ↓ ID of class group which creates a conflict with…
            //           ↓ …classes from groups with these IDs
            //   Here we remove the default conflict between the font-size and leading class
            //   groups.
            'font-size': [],
        },
        // ↓ Conflicts between the postfix modifier of a group and a different class group to
        //   override
        conflictingClassGroupModifiers: {
            // You probably won't need this, but it follows the same shape as
            // `conflictingClassGroups`.
        },
        // ↓ Modifiers whose order among multiple modifiers should be preserved because their
        //   order changes which element gets targeted. Overrides default value.
        orderSensitiveModifiers: ['before'],
    },

    // ↓ Optional config extensions
    //   Follows same shape as the `override` object.
    extend: {
        // ↓ Theme scales to extend or create
        theme: {
            spacing: ['sm', 'md', 'lg'],
        },
        // ↓ Class groups to extend or create
        classGroups: {
            // ↓ The `animate` key here is the class group ID
            //       ↓ Adds class animate-shimmer to existing group with ID `animate` or creates
            //         new class group if it doesn't exist.
            animate: ['animate-shimmer'],
            // ↓ Functions can also be used to match classes
            //   They take the class part value as argument and return a boolean defining whether
            //   it is a match.
            //   Here we accept all string classes starting with `aspec-w-` followed by a number.
            'aspect-w': [{ 'aspect-w': [(value) => Boolean(value) && !isNaN(value)] }],
            'aspect-h': [{ 'aspect-h': [(value) => Boolean(value) && !isNaN(value)] }],
            'aspect-reset': ['aspect-none'],
            // ↓ You can also use validators exported by tailwind-merge
            'prose-size': [{ prose: ['base', validators.isTshirtSize] }],
        },
        // ↓ Conflicts across different groups to extend or create
        conflictingClassGroups: {
            // ↓ ID of class group which creates a conflict with…
            //              ↓ …classes from groups with these IDs
            //   In this case `twMerge('aspect-w-5 aspect-none') → 'aspect-none'`
            'aspect-reset': ['aspect-w', 'aspect-h'],
        },
        // ↓ Conflicts between the postfix modifier of a group and a different class group to
        //   extend or create
        conflictingClassGroupModifiers: {
            // You probably won't need this, but it follows the same shape as
            // `conflictingClassGroups`.
        },
        // ↓ Modifiers whose order among multiple modifiers should be preserved because their
        //   order changes which element gets targeted. Extends default value.
        orderSensitiveModifiers: ['before'],
    },
})
```

Additionally, you can pass multiple `createConfig` functions (more to that in [`createTailwindMerge`](#createtailwindmerge)) which is convenient if you want to combine your config with third-party plugins.

```ts
const twMerge = extendTailwindMerge({ … }, withSomePlugin)
```

If you only use plugins, you can omit the `configExtension` object as well.

```ts
const twMerge = extendTailwindMerge(withSomePlugin)
```

## `createTailwindMerge`

```ts
function createTailwindMerge(
    ...createConfig: [() => Config, ...Array<(config: Config) => Config>]
): TailwindMerge
```

Function to create merge function with custom config. Use this function instead of [`extendTailwindMerge`](#extendtailwindmerge) if you don't need the default config or want more control over the config.

> [!Note]
> The function `createTailwindMerge` computes a large data structure based on the config passed to it. I recommend to call it only once and store the result in a top-level variable instead of calling it inline within another repeatedly called function.

You need to provide a function which resolves to the config tailwind-merge should use for the new merge function. You can either extend from the default config or create a new one from scratch.

```ts
// ↓ Callback passed to `createTailwindMerge` is called when
//   `twMerge` gets called the first time.
const twMerge = createTailwindMerge(() => {
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
        orderSensitiveModifiers: [...defaultConfig.orderSensitiveModifiers, 'before'],
    }
})
```

Same as in [`extendTailwindMerge`](#extendtailwindmerge) you can use multiple `createConfig` functions which is convenient if you want to combine your config with third-party plugins. Just keep in mind that the first `createConfig` function does not get passed any arguments, whereas the subsequent functions get each passed the config from the previous function.

```ts
const twMerge = createTailwindMerge(getDefaultConfig, withSomePlugin, (config) => ({
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
function mergeConfigs<ClassGroupIds extends string, ThemeGroupIds extends string = never>(
    baseConfig: GenericConfig,
    configExtension: ConfigExtension<ClassGroupIds, ThemeGroupIds>,
): GenericConfig
```

Helper function to merge multiple tailwind-merge configs. Properties with the value `undefined` are skipped.

When using TypeScript, you need to pass a union of all class group IDs and theme group IDs used in `configExtension` as generic arguments to `mergeConfigs` or pass `string` to both arguments to allow any IDs.

```ts
const twMerge = createTailwindMerge(getDefaultConfig, (config) =>
    mergeConfigs<'shadow' | 'animate' | 'prose'>(config, {
        override: {
            classGroups: {
                // ↓ Overriding existing class group
                shadow: [{ shadow: ['100', '200', '300', '400', '500'] }],
            },
        }
        extend: {
            classGroups: {
                // ↓ Adding value to existing class group
                animate: ['animate-shimmer'],
                // ↓ Adding new class group
                prose: [{ prose: ['', validators.isTshirtSize] }],
            }
        },
    }),
)
```

## `validators`

```ts
interface Validators {
    isAny(value: string): boolean
    isAnyNonArbitrary(value: string): boolean
    isArbitraryImage(value: string): boolean
    isArbitraryLength(value: string): boolean
    isArbitraryNumber(value: string): boolean
    isArbitraryPosition(value: string): boolean
    isArbitraryShadow(value: string): boolean
    isArbitrarySize(value: string): boolean
    isArbitraryValue(value: string): boolean
    isArbitraryVariable(value: string): boolean
    isArbitraryVariableFamilyName(value: string): boolean
    isArbitraryVariableImage(value: string): boolean
    isArbitraryVariableLength(value: string): boolean
    isArbitraryVariablePosition(value: string): boolean
    isArbitraryVariableShadow(value: string): boolean
    isArbitraryVariableSize(value: string): boolean
    isFraction(value: string): boolean
    isInteger(value: string): boolean
    isNumber(value: string): boolean
    isPercent(value: string): boolean
    isTshirtSize(value: string): boolean
}
```

An object containing all the validators used in tailwind-merge. They are useful if you want to use a custom config with [`extendTailwindMerge`](#extendtailwindmerge) or [`createTailwindMerge`](#createtailwindmerge). E.g. the `classGroup` for padding is defined as

```ts
const paddingClassGroup = [{ p: [validators.isNumber] }]
```

A brief summary for each validator:

- `isAny` always returns true. Be careful with this validator as it might match unwanted classes. I use it primarily to match colors or when I'm certain there are no other class groups in a namespace.
- `isAnyNonArbitrary` checks if the class part is not an arbitrary value or arbitrary variable.
- `isArbitraryImage` checks whether class part is an arbitrary value which is an iamge, e.g. by starting with `image:`, `url:`, `linear-gradient(` or `url(` (`[url('/path-to-image.png')]`, `image:var(--maybe-an-image-at-runtime)]`) which is necessary for background-image classNames.
- `isArbitraryLength` checks for arbitrary length values (`[3%]`, `[4px]`, `[length:var(--my-var)]`).
- `isArbitraryNumber` checks whether class part is an arbitrary value which starts with `number:` or is a number (`[number:var(--value)]`, `[450]`) which is necessary for font-weight and stroke-width classNames.
- `isArbitraryPosition` checks whether class part is an arbitrary value which starts with `position:` (`[position:200px_100px]`) which is necessary for background-position classNames.
- `isArbitraryShadow` checks whether class part is an arbitrary value which starts with the same pattern as a shadow value (`[0_35px_60px_-15px_rgba(0,0,0,0.3)]`), namely with two lengths separated by a underscore, optionally prepended by `inset`.
- `isArbitrarySize` checks whether class part is an arbitrary value which starts with `size:` (`[size:200px_100px]`) which is necessary for background-size classNames.
- `isArbitraryValue` checks whether the class part is enclosed in brackets (`[something]`)
- `isArbitraryVariable` checks whether the class part is an arbitrary variable (`(--my-var)`)
- `isArbitraryVariableFamilyName` checks whether class part is an arbitrary variable with the `family-name` label (`(family-name:--my-font)`)
- `isArbitraryVariableImage` checks whether class part is an arbitrary variable with the `image` or `url` label (`(image:--my-image)`)
- `isArbitraryVariableLength` checks whether class part is an arbitrary variable with the `length` label (`(length:--my-length)`)
- `isArbitraryVariablePosition` checks whether class part is an arbitrary variable with the `position` label (`(position:--my-position)`)
- `isArbitraryVariableShadow` checks whether class part is an arbitrary variable with the `shadow` label or not label at all (`(shadow:--my-shadow)`, `(--my-shadow)`)
- `isArbitraryVariableSize` checks whether class part is an arbitrary variable with the `size`, `length` or `percentage` label (`(size:--my-size)`)
- `isFraction` checks whether class part is a fraction of two numbers (`1/2`, `127/256`)
- `isInteger` checks for integer values (`3`).
- `isNumber` checks for numbers (`3`, `1.5`)
- `isPercent` checks for percent values (`12.5%`) which is used for color stop positions.
- `isTshirtSize`checks whether class part is a T-shirt size (`sm`, `xl`), optionally with a preceding number (`2xl`).

## `Config`

```ts
interface Config<ClassGroupIds extends string, ThemeGroupIds extends string> { … }
```

TypeScript type for config object. Useful if you want to build a `createConfig` function but don't want to define it inline in [`extendTailwindMerge`](#extendtailwindmerge) or [`createTailwindMerge`](#createtailwindmerge).

## `DefaultClassGroupIds`

```ts
type DefaultClassGroupIds = 'accent' | 'align-content' | 'align-items' | …
```

TypeScript type for all class group IDs defined in the default config of tailwind-merge.

## `DefaultThemeGroupIds`

```ts
type DefaultThemeGroupIds = 'blur' | 'borderColor' | 'borderRadius' | …
```

TypeScript type for all theme group IDs defined in the default config of tailwind-merge.

## `ClassNameValue`

```ts
type ClassNameValue = string | null | undefined | 0 | false | ClassNameValue[]
```

TypeScript type for arguments accepted by [`twMerge`](#twmerge) and [`twJoin`](#twjoin). You might want to use it if you wrap any of those with your own function.

```ts
function myWrappedTwMerge(...args: ClassNameValue[]) {
    doSomething()
    return twMerge(...args)
}
```

## `ClassValidator`

```ts
type ClassValidator = (value: string) => boolean
```

TypeScript type for class validators accepted in class definitions within [`extendTailwindMerge`](#extendtailwindmerge) and [`createTailwindMerge`](#createtailwindmerge).

---

Next: [Writing plugins](./writing-plugins.md)

Previous: [Recipes](./recipes.md)

[Back to overview](./README.md)
