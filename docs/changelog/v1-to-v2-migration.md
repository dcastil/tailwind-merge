# Guide to migrate from v1 to v2

This document is only about breaking changes between v1 and v2. For a full list of changes, see the [v2.0.0 release](./v2-changelog.md#v200).

## Overview

The tailwind-merge v2 release focuses on making it easier to configure the library for new users.

Over the past one and a half years since the v1 release, the biggest source of issues was the initial configuration of the library. That will unfortunately not change since most of the inconvenience comes from keeping the bundle size to a minimum. However, a few ideas with breaking changes accumulated over time to make the configuration a little bit more straight forward without increasing the bundle size. Those ideas were implemented in this release.

The highlights:

-   No changes to `twMerge` and supported Tailwind CSS versions.
-   You can now override class groups with the object notation in `extendTailwindMerge`.
-   TypeScript types of configuration object passed to `extendTailwindMerge` are stricter and prevent you from using unknown theme groups and class groups unless specified otherwise.
-   The library now exports a bundle using modern JS syntax to further reduce its size. There is also an additional bundle with ES5-only syntax for compatibility with older browsers.

If you have feedback of any kind regarding this release, feel free to [open an issue or discussion](https://github.com/dcastil/tailwind-merge/issues/new/choose). I'm always happy to hear from you!

## Breaking changes

By exports:

-   All
    -   [Modern JS syntax](#modern-js-syntax)
    -   [Module resolution](#module-resolution)
-   `extendTailwindMerge`
    -   [Object shape changed](#extendtailwindmerge-object-shape-changed)
    -   [Stricter TypeScript types](#extendtailwindmerge-stricter-typescript-types)
-   `validators`
    -   [`isLength`: Does not check for arbitrary values anymore](#validatorsislength-does-not-check-for-arbitrary-values-anymore)
    -   [`isInteger`: Does not check for arbitrary values anymore](#validatorsisinteger-does-not-check-for-arbitrary-values-anymore)
    -   [`isArbitraryWeight`: Removed](#validatorsisarbitraryweight-removed)
-   `createTailwindMerge`
    -   [Mandatory elements added](#createtailwindmerge-mandatory-elements-added)
-   `fromTheme`
    -   [Stricter TypeScript types](#fromtheme-stricter-typescript-types)
-   `mergeConfigs`
    -   [Object shape changed](#mergeconfigs-object-shape-changed)
    -   [Stricter TypeScript types](#mergeconfigs-stricter-typescript-types)
-   `join`
    -   [Removed](#join-removed)

### Modern JS syntax

Related: [#286](https://github.com/dcastil/tailwind-merge/pull/286), [#287](https://github.com/dcastil/tailwind-merge/pull/287)

The build of tailwind-merge was updated to output more modern JS syntax. This removes a lot of code to substitute modern JS features like object spread or arrow functions, but also means that the new bundle doesn't work in older browsers anymore in case you don't transpile your dependencies.

The exact [browserslist](https://github.com/browserslist/browserslist) query used to define how tailwind-merge gets transpiled from now on is

```
> 0.5%, last 2 versions, Firefox ESR, not dead, maintained node versions
```

which corresponds to the browserslist query `defaults` with the addition of `maintained node versions`.

In case you need to support older browsers and don't transpile your dependencies, you can use the new `tailwind-merge/es5` bundle which includes all of the tailwind-merge exports and is transpiled to ES5 syntax using the browserslist query `supports es5`.

#### Minimal upgrade

Replace all imports of `tailwind-merge` with `tailwind-merge/es5`.

```diff
- import { … } from 'tailwind-merge'
+ import { … } from 'tailwind-merge/es5'
```

#### Full upgrade

Check whether the browserslist query `> 0.5%, last 2 versions, Firefox ESR, not dead, maintained node versions` includes all browsers you need to support. If not, replace all imports of `tailwind-merge` with `tailwind-merge/es5` as shown in the minimal upgrade above.

### Module resolution

Related: [#289](https://github.com/dcastil/tailwind-merge/issues/289)

The `module` field was removed from the `package.json` file of tailwind-merge.

This field was briefly introduced by bundlers to import the ES module version of a library. But it was ultimately succeeded by the `exports` field which became a standard in Node.js and is also used by tailwind-merge. All major bundlers support the `exports` field, so removing the `module` field should hopefully not affect anyone. However, if you encounter any problems with this change, please open an issue.

#### Upgrade

If you can import tailwind-merge and your module resolution system doesn't complain, there is nothing you need to do. If you encounter issues, make sure that you resolve the tailwind-merge library via the `exports` or `main` field of its `package.json` file.

### `extendTailwindMerge`: Object shape changed

Related: [#294](https://github.com/dcastil/tailwind-merge/pull/294)

In the object passed to `extendTailwindMerge` it is now possible to not just extend groups, but also to override them. To distinguish between extending and overriding, there are two new top level keys in the object: `extend` and `override`. Both of these objects can define a `theme`, `classGroups`, `conflictingClassGroups` and `conflictingClassGroupModifiers` object whose groups will either override or extend the corresponding groups in the default config.

You might remember the `extend` key in your `tailwind.config.js`, now it works similarly in tailwind-merge as well. However, you need to use the `override` object instead of defining groups at the top level to override. This was done to make overriding more explicit and to prevent accidentally overriding groups when migrating to tailwind-merge v2.

#### Minimal upgrade

To get the same behavior as before, move `theme`, `classGroups`, `conflictingClassGroups` and `conflictingClassGroupModifiers` into an `extend` object.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

  const twMerge = extendTailwindMerge({
      cacheSize: 1000,
-     theme: { … },
-     classGroups: { … },
-     conflictingClassGroups: { … },
-     conflictingClassGroupModifiers: { … },
+     extend: {
+         theme: { … },
+         classGroups: { … },
+         conflictingClassGroups: { … },
+         conflictingClassGroupModifiers: { … },
+     }
  })
```

#### Full upgrade

If you override groups in your `tailwind.config.js`, you can now do the same in tailwind-merge. Move the groups you want to override into the `override` object and the rest into the `extend` object.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

  const twMerge = extendTailwindMerge({
-     classGroups: {
-         // Here we actually meant to override this group
-         shadow: [{ shadow: ['none', '100', '200', '300'] }],
-         // Here we really meant to extend this group
-         animate: ['animate-shimmer'],
-     },
+     override: {
+         classGroups: {
+             // Now we can override this group
+             shadow: [{ shadow: ['none', '100', '200', '300'] }],
+         },
+     },
+     extend: {
+         classGroups: {
+             // And we can still extend this group
+             animate: ['animate-shimmer'],
+         },
+     },
  })
```

### `extendTailwindMerge`: Stricter TypeScript types

Related: [#279](https://github.com/dcastil/tailwind-merge/pull/279)

One of the more annoying things about configuring tailwind-merge is to find the right IDs of groups to edit. Some users also fall into the trap that [not all theme groups from Tailwind CSS are supported in tailwind-merge](../configuration.md#theme).

To add some guidance to the process, all the group objects passed to `extendTailwindMerge` don't accept any string keys in TypeScript anymore but only a set of specific keys which are defined in the default config.

```ts
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            // ↓ No problem
            shadow: [{ shadow: ['100', '200', '300'] }],
            // ↓ Error: Object literal may only specify known properties, and 'animation' does not
            //   exist in type 'Partial<Record<DefaultClassGroupIds, ClassGroup<DefaultThemeGroupIds>>>'.
            animation: ['animate-shimmer'],
        },
    },
})
```

This means you can't accidentally extend or override a group with a typo in the ID anymore without noticing and you get code completion when you start typing the ID of a group in your editor.

But this also means that you can't add any new groups to the configuration object anymore. To allow custom class group IDs, you can use generic arguments to `extendTailwindMerge` to pass additional allowed IDs for class groups and theme groups separately.

```ts
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge<
    // ↓ Add additional class group IDs as the first generic argument
    'class-a' | 'class-b',
    // ↓ Optionally, you can add additional theme group IDs as the second generic argument
    'theme-c' | 'theme-d'
>({
    extend: {
        theme: {
          // ↓ No problem since we defined 'theme-c' as allowed theme group ID
          'theme-c': […],
          // ↓ No problem since we defined 'theme-d' as allowed theme group ID
          'theme-d': […],
        },
        classGroups: {
            // ↓ No problem since it's part of the default allowed class group IDs
            shadow: […],
            // ↓ No problem since we defined 'class-a' as allowed class group ID
            'class-a': […],
            // ↓ No problem since we defined 'class-b' as allowed class group ID
            'class-b': […],
        },
    },
})
```

#### Minimal upgrade

To get the the same behavior as before, allow any group IDs by passing `string` as generic arguments to `extendTailwindMerge`.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

- const twMerge = extendTailwindMerge({
+ const twMerge = extendTailwindMerge<string, string>({
      extend: {
          theme: { … },
          classGroups: { … },
      },
  })
```

#### Full upgrade

If you aren't using any custom groups, there is nothing you need to do to upgrade.

If you use any custom class group or theme group IDs in your tailwind-merge config, pass them as generic arguments to `extendTailwindMerge`.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

+ type AdditionalClassGroupIds = 'class-a' | 'class-b'
+ type AdditionalThemeGroupIds = 'theme-c' | 'theme-d'

- const twMerge = extendTailwindMerge({
+ const twMerge = extendTailwindMerge<AdditionalClassGroupIds, AdditionalThemeGroupIds>({
      // your config
  })
```

You can also pass `never` to any argument if you don't use any custom groups of that type.

If you still see TypeScript errors on object keys of class groups or theme groups, check in the [default config](../../src/lib/default-config.ts) whether the group ID is defined there. It might be that you configured tailwind-merge incorrectly.

### `validators.isLength`: Does not check for arbitrary values anymore

Related: [#292](https://github.com/dcastil/tailwind-merge/pull/292)

To be consistent with other validators and to make validators more composable, each validator only checks for class parts with either arbitrary values or non-arbitrary values. The `isLength` validator previously checked for both which made it inconsistent with the rest. Now, `isLength` does not check for arbitrary lengths anymore.

#### Upgrade

Compose the `isLength` and `isArbitraryLength` validators to get the same behavior as before. You can use one of several options:

```diff
  import { validators } from 'tailwind-merge'

+ function isLengthOrArbitraryLength(value: string) {
+     return validators.isLength(value) || validators.isArbitraryLength(value)
+ }

- validators.isLength
+ isLengthOrArbitraryLength
```

```diff
  import { validators } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => ({
      cacheSize: 500,
      separator: ':',
      theme: {},
      classGroups: {
-         mySpecialGroup: [{ special: [validators.isLength] }],
+         mySpecialGroup: [{ special: [validators.isLength, validators.isArbitraryLength] }],
      },
      conflictingClassGroups: {},
      conflictingClassGroupModifiers: {},
  }))
```

### `validators.isInteger`: Does not check for arbitrary values anymore

Related: [#292](https://github.com/dcastil/tailwind-merge/pull/292)

Same as the `isLength` validator: To be consistent with other validators and to make validators more composable, each validator only checks for class parts with either arbitrary values or non-arbitrary values. The `isInteger` validator previously checked for both which made it inconsistent with the rest. Now, `isInteger` does not check for arbitrary integers anymore.

#### Minimal upgrade

tailwind-merge doesn't export an `isArbitraryInteger` validator because it doesn't use one in the default config (it uses `isArbitraryValue` instead because there are no ambiguous arbitrary values in the default config). You'll need to rebuild the previous functionality.

```diff
  import { validators } from 'tailwind-merge'

+ function isIntegerOrArbitraryInteger(value: string) {
+     return validators.isInteger(value) || /^\[(number:.+|-?\d+)\]$/.test(value)
+ }

- validators.isInteger
+ isIntegerOrArbitraryInteger
```

#### Full upgrade

If the classes where you previously used `validators.isInteger` don't use arbitrary values, you can continue to use it without any changes.

If those classes use arbitrary values but there is only a single class group that could use the arbitrary value, you don't need to check that the arbitrary value is an integer, only that it is any arbitrary value. E.g. for the class `px-[<any-value-in-here>]` we don't need to know what is between the brackets because only the `px` class group uses the `px-` prefix. In that case you can compose `isInteger` and `isArbitraryValue` as shown in the upgrade section for `validators.isLength`.

Otherwise, proceed as shown in the minimal upgrade.

### `validators.isArbitraryWeight`: Removed

Related: [#288](https://github.com/dcastil/tailwind-merge/pull/288)

The validator was renamed to `validators.isArbitraryNumber` in `v1.6.2` to better reflect what it's doing. `validators.isArbitraryWeight` has been deprecated since then and was removed in this release.

#### Upgrade

Replace all uses of `validators.isArbitraryWeight` with `validators.isArbitraryNumber`.

```diff
  import { validators } from 'tailwind-merge'

- validators.isArbitraryWeight
+ validators.isArbitraryNumber
```

### `createTailwindMerge`: Mandatory elements added

Related: [#290](https://github.com/dcastil/tailwind-merge/pull/290), [#291](https://github.com/dcastil/tailwind-merge/pull/291)

The `separator` and `conflictingClassGroupModifiers` keys became mandatory in the configuration object returned in the `createTailwindMerge` callback since tailwind-merge defines those defaults only in its default config. This change makes processing for plugins easier.

#### Upgrade

If you don't have those keys defined in the configuration object, add them with their default values.

```diff
  import { createTailwindMerge } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => {
      return {
          cacheSize: 500,
+         separator: ':',
          theme: {},
          classGroups: {},
          conflictingClassGroups: {},
+         conflictingClassGroupModifiers: {},
      }
  })
```

### `fromTheme`: Stricter TypeScript types

Related: [#279](https://github.com/dcastil/tailwind-merge/pull/279)

Matching the stricter types in `extendTailwindMerge`, the `fromTheme` function now only accepts theme group IDs that are defined in the default config.

You can define additional allowed theme group IDs by passing them as generic arguments to `fromTheme`. If you don't use the default config, you can also redefine the default theme group IDs by passing them as a second generic arguments to `fromTheme`.

#### Minimal upgrade

To get the the same behavior as before, allow any theme group IDs by passing `string` as generic arguments to `fromTheme`.

```diff
  import { fromTheme } from 'tailwind-merge'

- const myThemeGroup = fromTheme('my-theme-group')
+ const myThemeGroup = fromTheme<string>('my-theme-group')
```

#### Full upgrade

If you don't use any custom theme groups, there is nothing you need to do to upgrade.

If you use any custom theme groups in your tailwind-merge config, pass them as a generic argument to `fromTheme`.

```diff
  import { fromTheme } from 'tailwind-merge'

+ type AdditionalThemeGroupIds = 'my-theme-group' | 'my-other-theme-group'

- const customThemeGroup = fromTheme('my-theme-group')
+ const customThemeGroup = fromTheme<AdditionalThemeGroupIds>('my-theme-group')
```

In case you're not extending the default config but defining a config from scratch with `createTailwindMerge`, you can also redefine the default theme group IDs by passing them as the second generic arguments to `fromTheme`.

```diff
  import { fromTheme } from 'tailwind-merge'

+ type ThemeGroupIds = 'my-theme-group' | 'my-other-theme-group'

- const customThemeGroup = fromTheme('my-theme-group')
+ const customThemeGroup = fromTheme<never, ThemeGroupIds>('my-theme-group')
```

### `mergeConfigs`: Object shape changed

Related: [#279](https://github.com/dcastil/tailwind-merge/pull/279)

`mergeConfigs` is used internally within `extendTailwindMerge`, therefore the object shape change in `extendTailwindMerge` applies to `mergeConfigs` as well. Please read [`extendTailwindMerge`: Object shape changed](#extendtailwindmerge-object-shape-changed) for the details and upgrade instructions.

### `mergeConfigs`: Stricter TypeScript types

Related: [#279](https://github.com/dcastil/tailwind-merge/pull/279)

The reason and effect of the stricter TypeScript types is the same as in [`extendTailwindMerge`: Stricter TypeScript types](#extendtailwindmerge-stricter-typescript-types). The main difference in `mergeConfigs` is that the generic arguments don't accept additional group IDs but rather all allowed group IDs since `mergeConfigs` is independent of the default config.

#### Minimal upgrade

To get the the same behavior as before, allow any group IDs by passing `string` as generic arguments to `mergeConfigs`.

```diff
  import { mergeConfigs } from 'tailwind-merge'

- mergeConfigs(baseConfig, {
+ mergeConfigs<string, string>(baseConfig, {
      extend: {
          theme: { … },
          classGroups: { … },
      }
  })
```

#### Full upgrade

You need to define all the class group IDs and theme group IDs you use in two string literal union types and pass them as generic arguments to `mergeConfigs` unless TypeScript inference can infer the types.

```diff
  import { mergeConfigs } from 'tailwind-merge'

+ type ClassGroupIds = 'class-a' | 'class-b'
+ type ThemeGroupIds = 'theme-c' | 'theme-d'

- mergeConfigs(baseConfig, {
+ mergeConfigs<ClassGroupIds, ThemeGroupIds>(baseConfig, {
      extend: {
          theme: { … },
          classGroups: { … },
      }
  })
```

### `join`: Removed

Related: [#288](https://github.com/dcastil/tailwind-merge/pull/288)

The `join` function was renamed to `twJoin` in `v1.8.0` to distinguish it better from other functions with the same name in your codebase. `join` has been deprecated since then and was removed in this release.

#### Upgrade

Replace all uses of `join` with `twJoin`.

```diff
- import { join } from 'tailwind-merge'
+ import { twJoin } from 'tailwind-merge'

- join
+ twJoin
```
