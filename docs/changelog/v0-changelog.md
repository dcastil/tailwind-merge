# Changelog for v0 releases

## v0.9.0

### New Features

-   Mimic theme from Tailwind config in tailwind-merge config by [@dcastil](https://github.com/dcastil) in [#55](https://github.com/dcastil/tailwind-merge/pull/55)
    -   Adds support for some theme properties like `spacing`, `borderRadius`, etc. More on that in the [theme docs](https://github.com/dcastil/tailwind-merge/tree/v0.9.0#theme).

**Full Changelog**: [`v0.8.2...v0.9.0`](https://github.com/dcastil/tailwind-merge/compare/v0.8.2...v0.9.0)

## v0.8.2

### Bug Fixes

-   Fix custom values for list-style-type missing in default config by [@dcastil](https://github.com/dcastil) in [#53](https://github.com/dcastil/tailwind-merge/pull/53)

**Full Changelog**: [`v0.8.1...v0.8.2`](https://github.com/dcastil/tailwind-merge/compare/v0.8.1...v0.8.2)

## v0.8.1

### Bug Fixes

-   Fix missing support for custom values in some class groups in default config by [@dcastil](https://github.com/dcastil) in [#52](https://github.com/dcastil/tailwind-merge/pull/52)
    -   Adds missing support for custom values in following class groups: Grid Auto Columns, Grid Auto Rows, Max-Width, Transition Property, Transition Timing Function, Animation, Fill, Stroke

**Full Changelog**: [`v0.8.0...v0.8.1`](https://github.com/dcastil/tailwind-merge/compare/v0.8.0...v0.8.1)

## v0.8.0

### Summary

This is a big release with breaking changes. These were necessary to improve the API before the coming v1.0.0 release and to add better plugin support. If you feel like writing a plugin, check out the [plugins section](https://github.com/dcastil/tailwind-merge/tree/v0.8.0#writing-plugins) in the docs!

### Breaking Changes

-   Previously there was a list of prefixes in the tailwind-merge config which was used to match Tailwind prefixes. I removed those and match all prefixes as valid Tailwind prefixes. This is only a breaking change if you use non-Tailwind classes with `:` in them which look like Tailwind classes after the prefix. tailwind-merge will treat those as Tailwind classes and resolve conflicts incorrectly. [#50](https://github.com/dcastil/tailwind-merge/pull/50))
-   `createTailwindMerge`
    -   If you added custom prefixes to your tailwind-merge config, you can remove them now. If you use TypeScript, you need to remove them. ([#50](https://github.com/dcastil/tailwind-merge/pull/50))
    -   Doesn't get passed the `getDefaultConfig` callback anymore. You need to call the exported function [`getDefaultConfig`](https://github.com/dcastil/tailwind-merge/tree/v0.8.0#getdefaultconfig) instead to get the default config. ([#42](https://github.com/dcastil/tailwind-merge/pull/42))
    -   You probably don't need `createTailwindMerge` anyway. Use the new and much simpler to use [`extendTailwindMerge`](https://github.com/dcastil/tailwind-merge/tree/v0.8.0#extendtailwindmerge) instead. ([#49](https://github.com/dcastil/tailwind-merge/pull/49))

### New Features

-   Add plugin documentation by [@dcastil](https://github.com/dcastil) in [#51](https://github.com/dcastil/tailwind-merge/pull/51)
-   (Breaking change) Consider all prefixes as valid Tailwind prefixes by [@dcastil](https://github.com/dcastil) in [#50](https://github.com/dcastil/tailwind-merge/pull/50)
-   Add `extendTailwindMerge` function by [@dcastil](https://github.com/dcastil) in [#49](https://github.com/dcastil/tailwind-merge/pull/49)
-   Add `mergeConfigs` function by [@dcastil](https://github.com/dcastil) in [#45](https://github.com/dcastil/tailwind-merge/pull/45)
-   (Breaking change) Code-split default config out by [@dcastil](https://github.com/dcastil) in [#42](https://github.com/dcastil/tailwind-merge/pull/42)
-   Enable multiple `createConfig` functions by [@dcastil](https://github.com/dcastil) in [#40](https://github.com/dcastil/tailwind-merge/pull/40)
-   Add validators to package exports by [@dcastil](https://github.com/dcastil) in [#38](https://github.com/dcastil/tailwind-merge/pull/38)

### Bug Fixes

-   Remove unwated side effects when mutating default config by [@dcastil](https://github.com/dcastil) in [#43](https://github.com/dcastil/tailwind-merge/pull/43)
    -   Also added the `Config` type to the package exports

**Full Changelog**: [`v0.7.1...v0.8.0`](https://github.com/dcastil/tailwind-merge/compare/v0.7.1...v0.8.0)

## v0.7.1

### Bug Fixes

-   Fix CommonJS imports not working by [@navin-moorthy](https://github.com/navin-moorthy) and [@dcastil](https://github.com/dcastil) in [#31](https://github.com/dcastil/tailwind-merge/pull/31)

**Full Changelog**: [`v0.7.0...v0.7.1`](https://github.com/dcastil/tailwind-merge/compare/v0.7.0...v0.7.1)

## v0.7.0

### New Features

-   Allow passing `false` to `twMerge` by [@dcastil](https://github.com/dcastil) in [#25](https://github.com/dcastil/tailwind-merge/pull/25)

**Full Changelog**: [`v0.6.0...v0.7.0`](https://github.com/dcastil/tailwind-merge/compare/v0.6.0...v0.7.0)

## v0.6.0

### New Features

-   Allow passing `null` as argument to `twMerge` by [@dcastil](https://github.com/dcastil) in [#20](https://github.com/dcastil/tailwind-merge/pull/20)

### Bug Fixes

-   Fix merges with important modifier not working when using prefixed classes by [@dcastil](https://github.com/dcastil) in [#22](https://github.com/dcastil/tailwind-merge/pull/22)

**Full Changelog**: [`v0.5.2...v0.6.0`](https://github.com/dcastil/tailwind-merge/compare/v0.5.2...v0.6.0)

## v0.5.2

### Bug Fixes

-   Add support for custom classes like `cursor-[grab]` by [@dcastil](https://github.com/dcastil) in [#19](https://github.com/dcastil/tailwind-merge/pull/19)
-   Fix incorrect conflicts in Font Variant Numeric classes by [@dcastil](https://github.com/dcastil) in [#18](https://github.com/dcastil/tailwind-merge/pull/18)

**Full Changelog**: [`v0.5.1...v0.5.2`](https://github.com/dcastil/tailwind-merge/compare/v0.5.1...v0.5.2)

## v0.5.1

### Bug Fixes

-   Fix incorrect conflict between ring and shadow by [@dcastil](https://github.com/dcastil) in [#15](https://github.com/dcastil/tailwind-merge/pull/15)
-   Fix not all JIT-enabled pseudo variants working by [@dcastil](https://github.com/dcastil) in [#14](https://github.com/dcastil/tailwind-merge/pull/14)

### Other

-   Add CodeQL security analysis to repo by [@dcastil](https://github.com/dcastil) in [#10](https://github.com/dcastil/tailwind-merge/pull/10)

**Full Changelog**: [`v0.5.0...v0.5.1`](https://github.com/dcastil/tailwind-merge/compare/v0.5.0...v0.5.1)

## v0.5.0

### New Features

-   Add support for Tailwind CSS v2.2.6 by [@dcastil](https://github.com/dcastil) in [#8](https://github.com/dcastil/tailwind-merge/pull/8)
-   Delay `twMerge` initialization until first call by [@dcastil](https://github.com/dcastil) in [#7](https://github.com/dcastil/tailwind-merge/pull/7)

### Other

-   Make logo in README version-specific by [@dcastil](https://github.com/dcastil) in [#6](https://github.com/dcastil/tailwind-merge/pull/6)

**Full Changelog**: [`v0.4.0...v0.5.0`](https://github.com/dcastil/tailwind-merge/compare/v0.4.0...v0.5.0)

## v0.4.0

### Breaking Changes

-   `createTailwindMerge`
    -   Config type changed and returned object from `getDefaultConfig` changed. ([#3](https://github.com/dcastil/tailwind-merge/pull/3))
        -   `dynamicClasses` and `standaloneClasses` were merged into `classGroups`
        -   `conflictingGroups` were renamed to `conflictingClassGroups`
        -   Class group IDs are keys of `classGroups` object instead of full path to class group. E.g. `dynamicClasses.foo.0` → `foo`.

### New Features

-   (Breaking change) Simplify config by [@dcastil](https://github.com/dcastil) in [#3](https://github.com/dcastil/tailwind-merge/pull/3)
-   Add support for Tailwind v2.2.5 by [@dcastil](https://github.com/dcastil) in [#2](https://github.com/dcastil/tailwind-merge/pull/2)

### Bug Fixes

-   Fix non-conflicting border classes being merged incorrectly by [@dcastil](https://github.com/dcastil) in [#5](https://github.com/dcastil/tailwind-merge/pull/5)

**Full Changelog**: [`v0.3.0...v0.4.0`](https://github.com/dcastil/tailwind-merge/compare/v0.3.0...v0.4.0)

## v0.3.0

### New Features

-   Enable named class group collections by [@dcastil](https://github.com/dcastil) in [`16a3175`](https://github.com/dcastil/tailwind-merge/commit/16a31751fdfd87c39683fb4506dec6a0bf118772)
    -   Class group collections in config can be an object, so you can use group references like `dynamicClasses.flex.direction` instead of just index-based ones like `dynamicClasses.flex.0`. More info on this in the [`createTailwindMerge()` API reference](https://github.com/dcastil/tailwind-merge/tree/v0.3.0#createtailwindmerge).

### Bug Fixes

-   Fix small typos in README by [@KeKs0r](https://github.com/KeKs0r) in [#1](https://github.com/dcastil/tailwind-merge/pull/1)

### Other

-   tailwind-merge now has a logo by [@dcastil](https://github.com/dcastil) in [`9402c8e`](https://github.com/dcastil/tailwind-merge/commit/9402c8ec1b19714bb8ecb158eb124b89a8c1ba64), [`b969979`](https://github.com/dcastil/tailwind-merge/commit/b96997942d4e92e045c9b08e7314843305b41fe2), [`dae2aaa`](https://github.com/dcastil/tailwind-merge/commit/dae2aaabf8c00b0d5086aff744aa2c53513daf33), [`e9e8806`](https://github.com/dcastil/tailwind-merge/commit/e9e88060578483a3ed4728430f7b188e51aaef49), [`4e2d9f1`](https://github.com/dcastil/tailwind-merge/commit/4e2d9f160dae00e18ebcbecf54f4dd33dc4264bb) <br /><br /><img src="https://github.com/dcastil/tailwind-merge/raw/v0.3.0/assets/logo.svg" alt="tailwind-merge" width="200px" />

**Full Changelog**: [`v0.2.0...v0.3.0`](https://github.com/dcastil/tailwind-merge/compare/v0.2.0...v0.3.0)

## v0.2.0

### New Features

-   Add support for important modifier by [@dcastil](https://github.com/dcastil) in [`17a9e9d`](https://github.com/dcastil/tailwind-merge/commit/17a9e9d9d805ba585372e01a9eefae1dba89368b)
-   Add support for per-side border colors by [@dcastil](https://github.com/dcastil) in [`6cd9ee2`](https://github.com/dcastil/tailwind-merge/commit/6cd9ee255e1a6fb42e5262b7835f876e2ce8e3ae)
-   Add support for content utiltites by [@dcastil](https://github.com/dcastil) in [`fd097c6`](https://github.com/dcastil/tailwind-merge/commit/fd097c611b5fa02ff6142b66f5ad96d596feed42)
-   Add support for caret color by [@dcastil](https://github.com/dcastil) in [`fd097c6`](https://github.com/dcastil/tailwind-merge/commit/fd097c611b5fa02ff6142b66f5ad96d596feed42)
-   Add support for JIT-only prefixes by [@dcastil](https://github.com/dcastil) in [`fd097c6`](https://github.com/dcastil/tailwind-merge/commit/fd097c611b5fa02ff6142b66f5ad96d596feed42)
-   Mark package as side effect-free by [@dcastil](https://github.com/dcastil) in [`6d00af3`](https://github.com/dcastil/tailwind-merge/commit/6d00af33049c3c7171bce3f1affd561986cc6bfe)

### Bug Fixes

-   Fix classes like `bottom-auto` not being detected as Tailwind classesby [@dcastil](https://github.com/dcastil) in [`ec65b84`](https://github.com/dcastil/tailwind-merge/commit/ec65b84f0aab57d1305019e4a143772d675798a2)

**Full Changelog**: [`v0.1.2...v0.2.0`](https://github.com/dcastil/tailwind-merge/compare/v0.1.2...v0.2.0)

## v0.1.2

### Bug Fixes

-   Fix errors when importing tailwind-merge as third party dependency. by [@dcastil](https://github.com/dcastil) in [`3335956`](https://github.com/dcastil/tailwind-merge/commit/3335956da15fdcc484904976864816413fad68f6)

**Full Changelog**: [`v0.1.1...v0.1.2`](https://github.com/dcastil/tailwind-merge/compare/v0.1.1...v0.1.2)

## v0.1.1

No changes here. Just testing automated npm publish.

**Full Changelog**: [`v0.1.0...v0.1.1`](https://github.com/dcastil/tailwind-merge/compare/v0.1.0...v0.1.1)

## v0.1.0

First published version of tailwind-merge. 🎉

**Full Changelog**: [`v0.1.0`](https://github.com/dcastil/tailwind-merge/commits/v0.1.0)
