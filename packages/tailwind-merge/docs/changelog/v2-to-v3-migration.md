# Guide to migrate from tailwind-merge v2 to v3

This document is only about breaking changes between v2 and v3. For a full list of changes, see the [v3.0.0 release](./v3-changelog.md#v300).

## Overview

tailwind-merge v3 drops support for Tailwind CSS v3 and in turn adds support for Tailwind CSS v4. That means you should upgrade to Tailwind CSS v4 and tailwind-merge v3 together. All breaking changes are related to the Tailwind CSS v4 support.

The highlights:

- No breaking changes to `twMerge` other than it expecting classes supported in Tailwind CSS v4.
- The `theme` scales tailwind-merge supports were changed and now match the Tailwind CSS v4 [theme variable namespace](https://tailwindcss.com/docs/theme#theme-variable-namespaces).

If you have feedback of any kind regarding this release, feel free to [open an issue or discussion](https://github.com/dcastil/tailwind-merge/issues/new/choose). I'm always happy to hear from you!

## Breaking changes

By exports:

- All
    - [Supported Tailwind CSS version range changes from v3 to v4](#supported-tailwind-css-version-range-changes-from-v3-to-v4)
- `extendTailwindMerge`
    - [Allowed theme keys changed](#extendtailwindmerge-allowed-theme-keys-changed)
    - [Custom separators are no longer supported](#extendtailwindmerge-and-createtailwindmerge-custom-separators-are-no-longer-supported)
    - [Prefix defined in config shouldn't include combining character anymore](#extendtailwindmerge-and-createtailwindmerge-prefix-defined-in-config-shouldnt-include-combining-character-anymore)
- `createTailwindMerge`
    - [Custom separators are no longer supported](#extendtailwindmerge-and-createtailwindmerge-custom-separators-are-no-longer-supported)
    - [Prefix defined in config shouldn't include combining character anymore](#extendtailwindmerge-and-createtailwindmerge-prefix-defined-in-config-shouldnt-include-combining-character-anymore)
    - [Mandatory field `orderSensitiveModifiers` added](#createtailwindmerge-mandatory-field-ordersensitivemodifiers-added)
- `validators`
    - [`isLength`: Removed](#validatorsislength-removed)
- `DefaultThemeGroupIds`
    - [Type union changed literals](#defaultthemegroupids-type-union-changed-literals)

### Supported Tailwind CSS version range changes from v3 to v4

tailwind-merge v3.0.0 is expected to be used together with Tailwind CSS v4. That means only features that work in Tailwind CSS v4 are supported. If you intend to stay on Tailwind CSS v3, don't upgrade to tailwind-merge v3.0.0 because there are some breaking changes in expected class syntax.

### `extendTailwindMerge`: Allowed theme keys changed

In Tailwind CSS v3 tailwind-merge was in a difficult position with Tailwind's theme scales. If tailwind-merge implemented support for all theme scales, the bundle size would become twice as large. If it didn't support any theme scales, users would have had a difficult time extending scales that are used in many class groups, like in the case of the `spacing` scale. tailwind-merge went with an awkward middle ground where it only supported theme scales that were used in multiple class groups.

Tailwind CSS v4 reduced the number of theme scales to only 18 (called [theme variable namespaces](https://tailwindcss.com/docs/theme#theme-variable-namespaces) now) which makes it possible for tailwind-merge to support all of them.

That means if you add the CSS variable `--inset-shadow-deep` to your Tailwind CSS theme, you can add it to the `theme` object in tailwind-merge like in the following example:

```ts
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            'inset-shadow': ['deep'],
        },
    },
})
```

#### Upgrade

Here's how to proceed with upgrading each individual theme scale that got removed or renamed. Just keep in mind that theme scales should only define the custom part of a class (i.e. `deep` for the class `inset-shadow-deep`) whereas class groups should define the whole class (i.e. `inset-shadow-deep` for the class `inset-shadow-deep`). Sometimes you might find that values you configured manually before are now supported by Tailwind CSS v4 by default in which case you can remove them from your tailwind-merge config.

| Theme scale in tailwind-merge v2 | What to use in tailwind-merge v3 instead                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| `borderColor`                    | theme scale `color`                                                        |
| `borderRadius`                   | theme scale `radius`                                                       |
| `borderSpacing`                  | theme scale `spacing` or class groups `border-spacing-*`                   |
| `borderWidth`                    | class groups `border-w-*`                                                  |
| `brightness`                     | class groups `brightness` and `backdrop-brightness`                        |
| `colors`                         | theme scale `color`                                                        |
| `contrast`                       | class groups `contrast` and `backdrop-contrast`                            |
| `gap`                            | class groups `gap-*`                                                       |
| `gradientColorStopPositions`     | class groups `gradient-from-pos`, `gradient-via-pos` and `gradient-to-pos` |
| `gradientColorStops`             | class groups `gradient-from`, `gradient-via` and `gradient-to`             |
| `grayscale`                      | class groups `grayscale` and `backdrop-grayscale`                          |
| `hueRotate`                      | class groups `hue-rotate` and `backdrop-hue-rotate`                        |
| `inset`                          | theme scale `spacing` or class groups `inset-*`                            |
| `invert`                         | class groups `invert` and `backdrop-invert`                                |
| `margin`                         | theme scale `spacing` or class groups `m-*`                                |
| `opacity`                        | class groups `opacity` and `backdrop-opacity`                              |
| `padding`                        | theme scale `spacing` or class groups `p-*`                                |
| `saturate`                       | class groups `saturate` and `backdrop-saturate`                            |
| `scale`                          | class groups `scale-*`                                                     |
| `sepia`                          | class groups `sepia` and `backdrop-sepia`                                  |
| `skew`                           | class groups `skew-*`                                                      |
| `space`                          | theme scale `spacing` or class groups `space-*`                            |
| `translate`                      | theme scale `spacing` or class groups `translate-*`                        |

In case you were modifying class groups in tailwind-merge v2 because their theme scale was previously not implemented, it is highly likely that you can move those definitions to the `theme` object in tailwind-merge v3. E.g. if you previously modified the `font-family` class group to add a custom font class, you can now use `theme.font` instead. Check out the [theme documentation](../configuration.md#theme) for more info.

### `extendTailwindMerge` and `createTailwindMerge`: Custom separators are no longer supported

Tailwind CSS v4 removed support for custom separators for modifiers in Tailwind CSS classes and now only the default separator `:` is allowed. Therefore tailwind-merge also removed support for custom separators and doesn't use the `separator` key in its config anymore. If you use TypeScript, you'll see a type error if you try to use the `separator` key in your config.

#### Upgrade

Remove the `separator` key from your tailwind-merge config.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

  const twMerge = extendTailwindMerge({
-     separator: '_',
      …
  })
```

```diff
  import { createTailwindMerge } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => ({
-     separator: '_',
      …
  }))
```

### `extendTailwindMerge` and `createTailwindMerge`: Prefix defined in config shouldn't include combining character anymore

In Tailwind CSS v4 the optional prefix syntax of classes changed from being in front of the base class like in `hover:*:tw-class` to looking like the first modifier of a class like in `tw:hover:*:class`.

In tailwind-merge v2 you had to specify the prefix including the final dash character `-` that combined the prefix with the base class. Due to the new syntax this combining character changes to `:`. To prevent having to change your config if the combining character changes in the future, tailwind-merge v3 expects you to specify the prefix without the combining character.

#### Upgrade

Remove the dash character from the prefix in your tailwind-merge config.

```diff
  import { extendTailwindMerge } from 'tailwind-merge'

  const twMerge = extendTailwindMerge({
-     prefix: 'tw-',
+     prefix: 'tw',
      …
  })
```

```diff
  import { createTailwindMerge } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => ({
-     prefix: 'tw-',
+     prefix: 'tw',
      …
  }))
```

### `createTailwindMerge`: Mandatory field `orderSensitiveModifiers` added

tailwind-merge v3 adds a new mandatory field `orderSensitiveModifiers` to the config to specify which modifiers should be considered order-sensitive. Learn more about order-sensitive modifiers in the [documentation](../configuration.md#order-sensitive-modifiers).

#### Minimal upgrade

Add the `orderSensitiveModifiers` field to your tailwind-merge config.

```diff
  import { createTailwindMerge } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => ({
+     orderSensitiveModifiers: [],
      …
  }))
```

#### Full upgrade

If you have any order-sensitive modifiers in Tailwind, add them to the new `orderSensitiveModifiers` field in your tailwind-merge config.

```diff
  import { createTailwindMerge } from 'tailwind-merge'

  const twMerge = createTailwindMerge(() => ({
      …
+     orderSensitiveModifiers: ['before', '*', …],
  }))
```

### `validators.isLength`: Removed

The validator `isLength` was used to check whether a class part is a number (`3`, `1.5`), a fraction (`3/4`), or one of the strings `px`, `full` or `screen`. This was used for most length-based scales but the name was not really precise in explaining what it allows.

Due to how length-based scales were changed in Tailwind CSS v4, tailwind-merge v3 now uses `isNumber` and `isFraction` instead depending on what each scale supports and strings like `px`, `full` and `screen` are instead specified manually in the scales themselves. This makes it more obvious what those validators do.

#### Minimal upgrade

You can rebuild the previous validator yourself.

```ts
import { validators } from 'tailwind-merge'

function isLength(value: string) {
    return (
        validators.isNumber(value) ||
        validators.isFraction(value) ||
        value === 'full' ||
        value === 'px' ||
        value === 'screen'
    )
}
```

#### Full upgrade

Replace all uses of `validators.isLength` with `validators.isNumber`, `validators.isFraction` and the strings `full`, `px` and `screen` depending on which of those your scale supports.

```diff
  import { validators } from 'tailwind-merge'

- [validators.isLength]
+ [validators.isNumber, validators.isFraction, 'full', 'px', 'screen']
```

### `DefaultThemeGroupIds`: Type union changed literals

Due to the default theme keys changing, the string union of `DefaultThemeGroupIds` changed as well. Since this is a TypeScript type, errors in TypeScript will determine how to handle this change.
