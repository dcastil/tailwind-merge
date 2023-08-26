# Guide to migrate from v1 to v2

This document is only about breaking changes between v1 and v2. For a full list of changes, see the [v2.0.0 release](./v2-changelog.md#v200).

## Overview

The tailwind-merge v2 release focuses on making it easier to configure the library.

Over the past one and a half years since the v1 release the biggest source of issues was the initial configuration of the library. That will unfortunately not change since most of the inconvenience comes from keeping the bundle size to a minimum. However, a few ideas with breaking changes accumulated over time to make the configuration a little bit more straight forward without increasing the bundle size. Those ideas were implemented in this release.

The highlights:

-   No changes to `twMerge` and supported Tailwind CSS versions.
-   You can now override class groups with the object notation in `extendTailwindMerge`.
-   TypeScript types of configuration object passed to `extendTailwindMerge` are stricter and prevent you from using unknown theme groups and class groups unless specified otherwise.
-   The library now exports a bundle using modern JS syntax to further reduce its size. There is also an additional bundle with ES5-only syntax for compatibility with older browsers.

If you have feedback of any kind to this release, feel free to open an [issue or discussion](https://github.com/dcastil/tailwind-merge/issues/new/choose). I'm always happy to hear from you!

## Breaking changes

### Modern JS syntax

Related: [#286](https://github.com/dcastil/tailwind-merge/pull/286), [#287](https://github.com/dcastil/tailwind-merge/pull/287)

The build of tailwind-merge was updated to output more modern JS syntax. This removes a lot of code to substitute modern JS features like object spread or arrow functions, but also means that the new bundle doesn't work on older browsers anymore (in case you don't transpile your dependencies).

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

This field was briefly introduced by bundlers to import the ES module version of a library but ultimately succeeded by the `exports` field which became a standard in Node.js and is also used by tailwind-merge. All major bundlers support the `exports` field, so this should hopefully not affect anyone. However, if you encounter any problems with this change, please open an issue.

#### Upgrade

Make sure that you resolve the tailwind-merge module via the `exports` or `main` field in the `package.json` file.

### `createTailwindMerge`: mandatory elements added

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

### `validators.isLength`: does not check for arbitrary values anymore

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

### `validators.isInteger`: does not check for arbitrary values anymore

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

### `validators.isArbitraryWeight`: removed

Related: [#288](https://github.com/dcastil/tailwind-merge/pull/288)

The validator was renamed to `validators.isArbitraryNumber` in `v1.6.2` to better reflect what it's doing. `validators.isArbitraryWeight` has been deprecated since then and was removed in this release.

#### Upgrade

Replace all uses of `validators.isArbitraryWeight` with `validators.isArbitraryNumber`.

```diff
  import { validators } from 'tailwind-merge'

- validators.isArbitraryWeight
+ validators.isArbitraryNumber
```

### `join`: removed

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
