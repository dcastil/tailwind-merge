# Changelog for v1 releases

## v1.14.0

### New Features

-   Improve support for arbitrary values by [@dcastil](https://github.com/dcastil) in [#263](https://github.com/dcastil/tailwind-merge/pull/263)
    -   Previously, tailwind-merge checked the content of the arbitrary value portion of a class in most cases to understand whether the type of the arbitrary value is correct (e.g. it checked for number followed by length unit for the length type). That lead to the issue that a class like `mt-[calc(theme(fontSize.4xl)/1.125)]` would not be recognized correctly because no length unit is present in the arbitrary value.
    -   I changed the check of the arbitrary value to also pass when a `calc()`, `min()`, `max()` and `clamp()` function is used in the arbitrary value.
    -   In ambiguous cases, you can use data type labels to mark the type of a class. [Read more](https://github.com/dcastil/tailwind-merge/blob/v1.14.0/docs/features.md#supports-arbitrary-values)
    -   Moreover, I removed the check where the type of the arbitrary value is unambiguous. In the class `mt-[…]` the arbitrary value can only be a length, so I don't check for it. A consequence of this is that if you use non-Tailwind classes like `mt-[this-is-totally-not-tailwind]`, tailwind-merge will recognize it as a Tailwind class from now on. **Please don't use classes that look like Tailwind classes with arbitrary value but aren't Tailwind classes with tailwind-merge (in default config) to prevent incorrect merging behavior**.

### Bug Fixes

-   Fix `col-span-full` class missing in default config by [@dcastil](https://github.com/dcastil) in [#267](https://github.com/dcastil/tailwind-merge/pull/267)
-   Fix arbitrary value with no present length unit not being recognized by [@dcastil](https://github.com/dcastil) in [#263](https://github.com/dcastil/tailwind-merge/pull/263)

### Documentation

-   Add missing info about where to call config functions to docs by [@dcastil](https://github.com/dcastil) in [#264](https://github.com/dcastil/tailwind-merge/pull/264)

**Full Changelog**: [`v1.13.2...v1.14.0`](https://github.com/dcastil/tailwind-merge/compare/v1.13.2...v1.14.0)

## v1.13.2

### Bug Fixes

-   Fix TypeScript issue when using `moduleResolution: node16` by [@LiamMartens](https://github.com/LiamMartens) in [#245](https://github.com/dcastil/tailwind-merge/pull/245)

### Documentation

-   Fix grammar and typos in docs by [@jmmarco](https://github.com/jmmarco) in [#249](https://github.com/dcastil/tailwind-merge/pull/249)
-   Add tailwind-merge-php to similar packages in docs by [@JamesHemery](https://github.com/JamesHemery) in [#246](https://github.com/dcastil/tailwind-merge/pull/246)

**Full Changelog**: [`v1.13.1...v1.13.2`](https://github.com/dcastil/tailwind-merge/compare/v1.13.1...v1.13.2)

Thanks to [@bluetch](https://github.com/bluetch) for sponsoring tailwind-merge! ❤️

## v1.13.1

### Bug Fixes

-   Fix `basis-auto` and `basis-full` not being merged correctly by [@lukasz-kapica](https://github.com/lukasz-kapica) in [#242](https://github.com/dcastil/tailwind-merge/pull/242)

**Full Changelog**: [`v1.13.0...v1.13.1`](https://github.com/dcastil/tailwind-merge/compare/v1.13.0...v1.13.1)

## v1.13.0

This release focuses on improvements to the docs.

### Bug Fixes

-   Fix arbitrary length `0` without unit not being recognized by [@dcastil](https://github.com/dcastil) in [#237](https://github.com/dcastil/tailwind-merge/pull/237)
-   Fix typo in comment in default-config.ts by [@CrutchTheClutch](https://github.com/CrutchTheClutch) in [#227](https://github.com/dcastil/tailwind-merge/pull/227)

### Documentation

-   Add intro video from Simon Vrachliotis to docs by [@dcastil](https://github.com/dcastil) in [#239](https://github.com/dcastil/tailwind-merge/pull/239)
    -   [@simonswiss](https://github.com/simonswiss) made an intro video to tailwind-merge which I added to the docs. Check it out [here](https://github.com/dcastil/tailwind-merge/blob/v1.13.0/docs/what-is-it-for.md#video-introduction)!
-   Add docs about when to use tailwind-merge by [@dcastil](https://github.com/dcastil) in [#230](https://github.com/dcastil/tailwind-merge/pull/230)
    -   I added a new page to the docs about [when and how to use tailwind-merge](https://github.com/dcastil/tailwind-merge/blob/v1.13.0/docs/when-and-how-to-use-it.md) which should help you to decide whether you should use it and what alternative approaches exist.
-   Make it clearer in docs that tailwind-merge supports composition of class strings by [@dcastil](https://github.com/dcastil) in [#229](https://github.com/dcastil/tailwind-merge/pull/229)

### Other

-   Add npm package provenance by [@dcastil](https://github.com/dcastil) in [#219](https://github.com/dcastil/tailwind-merge/pull/219)
    -   GitHub introduced a new security feature to verify which source commit and build file were used for a specific npm package version. tailwind-merge now publishes provenance signatures alongside all releases on npm. [Read more on the GitHub blog.](https://github.blog/2023-04-19-introducing-npm-package-provenance/)

**Full Changelog**: [`v1.12.0...v1.13.0`](https://github.com/dcastil/tailwind-merge/compare/v1.12.0...v1.13.0)

## v1.12.0

With this release tailwind-merge supports all features introduced in [Tailwind CSS v3.3](https://tailwindcss.com/blog/tailwindcss-v3-3).

### New Features

-   Add support for postfix modifier by [@dcastil](https://github.com/dcastil) in [#214](https://github.com/dcastil/tailwind-merge/pull/214)
    -   This adds support for `line-height` modifiers in `font-size` utilities like `text-lg/7` and more potential postfix modifiers in the future ([learn more](https://github.com/dcastil/tailwind-merge/blob/v1.12.0/docs/features.md#supports-postfix-modifiers)).
    -   All classes are checked for postfix modifiers since there will be more in the future and they'll be configurable with plugins.
    -   tailwind-merge can't know from the class syntax alone whether something is a modifier or not. E.g. there is `w-1/2` which doesn't contain a modifier. So tailwind-merge always checks whether class without potential modifier exists and if it doesn't it checks for full class. This behavior might get reversed in the next major version as a breaking change ([learn more](https://github.com/dcastil/tailwind-merge/issues/215)).
    -   Added `conflictingClassGroupModifiers` object to tailwind-merge config ([learn more](https://github.com/dcastil/tailwind-merge/blob/v1.12.0/docs/configuration.md#postfix-modifiers-conflicting-with-class-groups)).

**Full Changelog**: [`v1.11.0...v1.12.0`](https://github.com/dcastil/tailwind-merge/compare/v1.11.0...v1.12.0)

## v1.11.0

### New Features

-   Add support for Tailwind CSS v3.3 except line-height shorthand by [@dcastil](https://github.com/dcastil) in [#210](https://github.com/dcastil/tailwind-merge/pull/210)
    -   The line-height shorthand in font-size utilities (`text-lg/7`) [introduced in Tailwind CSS v3.3](https://tailwindcss.com/blog/tailwindcss-v3-3#new-line-height-shorthand-for-font-size-utilities) is not yet supported in tailwind-merge because that feature is a bit more involved. I'll add support for it in a future release. More info in [#211](https://github.com/dcastil/tailwind-merge/issues/211).
    -   Added new [validator](https://github.com/dcastil/tailwind-merge/blob/v1.11.0/docs/api-reference.md#validators) `isPercent` which is needed internally for the default scale of color stop positions.
    -   New [theme](https://github.com/dcastil/tailwind-merge/blob/v1.11.0/docs/configuration.md#theme) key `gradientColorStopPositions` supported in tailwind-merge.
    -   New logical properties like `ps-0` (`padding-inline-start: 0px;`) are de-duplicated away when using the matching property for all sides afterwards like in this case `p-0`, but not when using single axis sides like `px-0` because `padding-inline-start` can also be the top or bottom padding depending on writing mode.
        -   Basically `twMerge('ps-0 p-0') === 'p-0' && twMerge('ps-0 px-0') === 'ps-0 px-0'`.
        -   If you want to use logical properties and know which writing modes your app is limited to, add the right conflicts yourself to your tailwind-merge config.

**Full Changelog**: [`v1.10.0...v1.11.0`](https://github.com/dcastil/tailwind-merge/compare/v1.10.0...v1.11.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell) for sponsoring tailwind-merge! ❤️

## v1.10.0

### New Features

-   Add support for container query length units in arbitrary values by [@LesnoyPudge](https://github.com/LesnoyPudge) in [#204](https://github.com/dcastil/tailwind-merge/pull/204)

**Full Changelog**: [`v1.9.1...v1.10.0`](https://github.com/dcastil/tailwind-merge/compare/v1.9.1...v1.10.0)

## v1.9.1

### Bug Fixes

-   Fix arbitrary floats not supported in opacity, scale, etc. by [@dcastil](https://github.com/dcastil) in [#196](https://github.com/dcastil/tailwind-merge/pull/196)
    -   Up until now classes like `opacity-50 opacity-[.025]` weren't merged correctly. You might not have noticed since classes with arbitrary values are defined after the default ones in the output stylesheet, but merging it the other way around (`opacity-[.025] opacity-50`) would have led to a styling bug.
    -   This fix led to a new [validator](https://github.com/dcastil/tailwind-merge/blob/v1.9.1/docs/api-reference.md#validators) `isNumber`.
-   Fix arbitrary border color value being merged incorrectly by [@dcastil](https://github.com/dcastil) in [#195](https://github.com/dcastil/tailwind-merge/pull/195)

**Full Changelog**: [`v1.9.0...v1.9.1`](https://github.com/dcastil/tailwind-merge/compare/v1.9.0...v1.9.1)

## v1.9.0

### New Features

-   Support decimals in T-shirt sizes by [@farreldarian](https://github.com/farreldarian) in [#189](https://github.com/dcastil/tailwind-merge/pull/189)

### Documentation

-   Fixes typo in recipes docs by [@nicklemmon](https://github.com/nicklemmon) in [#181](https://github.com/dcastil/tailwind-merge/pull/181)

### Other

-   Added test case by [@chuanyu0201](https://github.com/chuanyu0201) in [#186](https://github.com/dcastil/tailwind-merge/pull/186)

**Full Changelog**: [`v1.8.1...v1.9.0`](https://github.com/dcastil/tailwind-merge/compare/v1.8.1...v1.9.0)

## v1.8.1

### Bug Fixes

-   Fix incorrect class group conflicts in grid-related classes by [@dcastil](https://github.com/dcastil) in [#177](https://github.com/dcastil/tailwind-merge/pull/177)

**Full Changelog**: [`v1.8.0...v1.8.1`](https://github.com/dcastil/tailwind-merge/compare/v1.8.0...v1.8.1)

Thanks to [@aniravi24](https://github.com/aniravi24) for sponsoring tailwind-merge! ❤️

## v1.8.0

### New Features

-   Add support for custom separator by [@dcastil](https://github.com/dcastil) in [#168](https://github.com/dcastil/tailwind-merge/pull/168)
-   Add support for dynamic viewport units in arbitrary lengths by [@dcastil](https://github.com/dcastil) in [#166](https://github.com/dcastil/tailwind-merge/pull/166)
-   Rename `join` to `twJoin` by [@dcastil](https://github.com/dcastil) in [#161](https://github.com/dcastil/tailwind-merge/pull/161)
    -   I deprecated the [`join`](https://github.com/dcastil/tailwind-merge/blob/v1.7.0/docs/api-reference.md#join) function and renamed it to [`twJoin`](https://github.com/dcastil/tailwind-merge/blob/v1.8.0/docs/api-reference.md#twjoin) to make replacing it via search and replace easier since `join` is a common function name. You don't need to change anything right now, but if you have some spare time, rename join → twJoin in your code since the `join` function will be removed in the next major release.

**Full Changelog**: [`v1.7.0...v1.8.0`](https://github.com/dcastil/tailwind-merge/compare/v1.7.0...v1.8.0)

Thanks to [@gjtorikian](https://github.com/gjtorikian) for sponsoring tailwind-merge! ❤️

## v1.7.0

### New Features

-   Add support for Tailwind CSS v3.2 by [@dcastil](https://github.com/dcastil) and [@brandonmcconnell](https://github.com/brandonmcconnell) in [#159](https://github.com/dcastil/tailwind-merge/pull/159)

**Full Changelog**: [`v1.6.2...v1.7.0`](https://github.com/dcastil/tailwind-merge/compare/v1.6.2...v1.7.0)

## v1.6.2

### Bug Fixes

-   Fix arbitrary numbers not working in stroke-width by [@dcastil](https://github.com/dcastil) in [#153](https://github.com/dcastil/tailwind-merge/pull/153)
    -   Now tailwind-merge handles classes like `stroke-[3]` correctly.
    -   I deprecated the [validator](https://github.com/dcastil/tailwind-merge/blob/v1.6.2/docs/api-reference.md#validators) `isArbitraryWeight` and renamed it to `isArbitraryNumber` to reflect its broader use case. You don't need to change anything right now, but if you have some spare time, rename `isArbitraryWeight` → `isArbitraryNumber` in your code since `isArbitraryWeight` will be removed in the next major release.

### Other

-   Add package version number to dev releases by [@dcastil](https://github.com/dcastil) in [#154](https://github.com/dcastil/tailwind-merge/pull/154)
    -   Now dev releases don't start with `0.0.0-dev` anymore and instead have the version number of the last release, like `1.6.1-dev`. That makes it easier for tools like [Renovate](https://renovatebot.com/) to understand which package version you're using in case you use dev releases.

**Full Changelog**: [`v1.6.1...v1.6.2`](https://github.com/dcastil/tailwind-merge/compare/v1.6.1...v1.6.2)

## v1.6.1

### Bug Fixes

-   Fix h-min not working by [@dcastil](https://github.com/dcastil) in [#146](https://github.com/dcastil/tailwind-merge/pull/146)

**Full Changelog**: [`v1.6.0...v1.6.1`](https://github.com/dcastil/tailwind-merge/compare/v1.6.0...v1.6.1)

## v1.6.0

### New Features

-   Add support for arrays as argument by [@dcastil](https://github.com/dcastil) in [#127](https://github.com/dcastil/tailwind-merge/pull/127)
    -   You can now use arbitrarily nested arrays as arguments to `twMerge`. That's especially handy for nested conditions.
        ```js
        twMerge('…', someBool && ['…', anotherBool && '…'])
        ```
    -   The joining of arguments is done with a new `join` function which [is present in the tailwind-merge exports](https://github.com/dcastil/tailwind-merge/blob/v1.6.0/docs/api-reference.md#join) as well. It has the same functionality as [clsx](https://github.com/lukeed/clsx) but without support for objects as arguments which makes it a little faster.
    -   Why no objects as arguments? You can read about my reasoning in [#137 (comment)](https://github.com/dcastil/tailwind-merge/discussions/137#discussioncomment-3481605).

### Bug Fixes

-   Replace matchAll with exec by [@dcastil](https://github.com/dcastil) in [#133](https://github.com/dcastil/tailwind-merge/pull/133)
    -   This makes tailwind-merge work in older browsers which don't support `String.prototype.matchAll()`

### Other

-   Add recipes section to docs by [@dcastil](https://github.com/dcastil) in [#134](https://github.com/dcastil/tailwind-merge/pull/134)
-   Split docs into multiple files by [@dcastil](https://github.com/dcastil) in [#131](https://github.com/dcastil/tailwind-merge/pull/131)
-   Add comments to released PRs and their related issues by [@dcastil](https://github.com/dcastil) in [#130](https://github.com/dcastil/tailwind-merge/pull/130)
-   Add tests to check actual CJS and ESM package exports by [@dcastil](https://github.com/dcastil) in [#129](https://github.com/dcastil/tailwind-merge/pull/129)
-   Remove ts files from npm package by [@dcastil](https://github.com/dcastil) in [#128](https://github.com/dcastil/tailwind-merge/pull/128)

**Full Changelog**: [`v1.5.1...v1.6.0`](https://github.com/dcastil/tailwind-merge/compare/v1.5.1...v1.6.0)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.5.1

### Bug Fixes

-   Fix arbitrary z-index value not being recognized by [@dcastil](https://github.com/dcastil) in [#116](https://github.com/dcastil/tailwind-merge/pull/116)

**Full Changelog**: [`v1.5.0...v1.5.1`](https://github.com/dcastil/tailwind-merge/compare/v1.5.0...v1.5.1)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.5.0

### New Features

-   Added missing ESM `types` subpath export condition by [@scott-lc](https://github.com/scott-lc) in [#113](https://github.com/dcastil/tailwind-merge/pull/113)
    -   This makes tailwind-merge work in TypeScript projects using [the new `nodenext` module type introduced in TypeScript 4.7](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#ecmascript-module-support-in-node-js).

**Full Changelog**: [`v1.4.0...v1.5.0`](https://github.com/dcastil/tailwind-merge/compare/v1.4.0...v1.5.0)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.4.0

### New Features

-   Optimize runtime performance by using Map by [@dcastil](https://github.com/dcastil) in [#105](https://github.com/dcastil/tailwind-merge/pull/105)

### Bug Fixes

-   Fix overriding w-full with w-fit not working by [@dcastil](https://github.com/dcastil) in [#112](https://github.com/dcastil/tailwind-merge/pull/112)

### Other

-   Publish dev releases of every commit on main branch by [@dcastil](https://github.com/dcastil) in [#104](https://github.com/dcastil/tailwind-merge/pull/104)

**Full Changelog**: [`v1.3.0...v1.4.0`](https://github.com/dcastil/tailwind-merge/compare/v1.3.0...v1.4.0)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.3.0

### New Features

-   Add support for Tailwind v3.1 by [@dcastil](https://github.com/dcastil) in [#103](https://github.com/dcastil/tailwind-merge/pull/103)

### Bug Fixes

-   Fix readme typos by [@oshi97](https://github.com/oshi97) in [#102](https://github.com/dcastil/tailwind-merge/pull/102)
-   Fix typos in comments by [@szamanr](https://github.com/szamanr) in [#89](https://github.com/dcastil/tailwind-merge/pull/89)

### Other

-   Add community health files by [@dcastil](https://github.com/dcastil) in [#93](https://github.com/dcastil/tailwind-merge/pull/93)

**Full Changelog**: [`v1.2.1...v1.3.0`](https://github.com/dcastil/tailwind-merge/compare/v1.2.1...v1.3.0)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.2.1

### Bug Fixes

-   Fix isArbitraryWeight incorrectly using `weight:` instead of `number:` for disambiguation for arbitrary values by [@liuqiang1357](https://github.com/liuqiang1357) in [#85](https://github.com/dcastil/tailwind-merge/pull/85)
-   Fix typos in README.md by [@Gri-ffin](https://github.com/Gri-ffin) in [#82](https://github.com/dcastil/tailwind-merge/pull/82)

**Full Changelog**: [`v1.2.0...v1.2.1`](https://github.com/dcastil/tailwind-merge/compare/v1.2.0...v1.2.1)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.2.0

### New Features

-   Add prefix support by [@dcastil](https://github.com/dcastil) in [#78](https://github.com/dcastil/tailwind-merge/pull/78)

**Full Changelog**: [`v1.1.1...v1.2.0`](https://github.com/dcastil/tailwind-merge/compare/v1.1.1...v1.2.0)

Thanks to [@charkour](https://github.com/charkour) for sponsoring tailwind-merge! ❤️

## v1.1.1

### Bug Fixes

-   Fix TypeScript types not being linked correctly in package.json by [@navin-moorthy](https://github.com/navin-moorthy) and [@dcastil](https://github.com/dcastil) in [#75](https://github.com/dcastil/tailwind-merge/pull/75)

**Full Changelog**: [`v1.1.0...v1.1.1`](https://github.com/dcastil/tailwind-merge/compare/v1.1.0...v1.1.1)

## v1.1.0

### New Features

-   Fix missing arbitrary value support in some class groups by [@dcastil](https://github.com/dcastil) in [#73](https://github.com/dcastil/tailwind-merge/pull/73)
    -   Adds arbitrary value support for class groups `grayscale`, `invert`, `sepia`, `grow`, `shrink`, `object-position`, `shadow`, `drop-shadow`, `rotate`, `skew` and `transform-origin`
    -   Fixes `break-inside` classes being merged incorrectly
    -   Adds missing classes `overline`, `underline-offset`, `content-none`
    -   Fixes typo in class group name `bg-repeeat` → `bg-repeat`
    -   Adds `isArbitraryShadow` validator
-   Improve tree-shaking by [@dcastil](https://github.com/dcastil) in [#65](https://github.com/dcastil/tailwind-merge/pull/65)
    -   I changed the build output significantly here and removed `"type": "module"` from the package.json. I did test the new npm package output in Node and in the browser, but it's hard to account for every possible build system tailwind-merge is used in. If some issues come up with bundling tailwind-merge, please open an issue!

### Bug Fixes

-   Fix stroke-color utilities being merged with stroke-width utilities by [@dcastil](https://github.com/dcastil) in [#72](https://github.com/dcastil/tailwind-merge/pull/72)
-   Fix mix-blend utilities getting merged incorrectly by [@dcastil](https://github.com/dcastil) in [#71](https://github.com/dcastil/tailwind-merge/pull/71)

**Full Changelog**: [`v1.0.0...v1.1.0`](https://github.com/dcastil/tailwind-merge/compare/v1.0.0...v1.1.0)

## v1.0.0

v1! 🎉

### Summary

After being 5 months on v0 I think it's time to release a stable version of tailwind-merge. Tailwind v3 was [released](https://github.com/tailwindlabs/tailwindcss/releases/tag/v3.0.0) yesterday and it's no coincidence that I'm releasing tailwind-merge v1 today. I added full support for Tailwind v3 so you can update both at once.

There are no breaking changes in the tailwind-merge types and some breaking changes for a small number of users in the return values, so you should get through smoothly.

By the way, you can now [sponsor](https://github.com/sponsors/dcastil) this project. 😊

### Breaking Changes

-   `twMerge`, `extendTailwindMerge`

    -   Outline utilities from Tailwind v2 don't get merged anymore since they were replaced by outline width, outline style, outline offset and outline color in Tailwind v3 ([`55ab167`](https://github.com/dcastil/tailwind-merge/commit/55ab167b7167519873c5dd4d258dc62212d1659a), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
    -   The classes `overflow-ellipsis` and `overflow-clip` will not get merged with class `truncate` anymore, but the new Tailwind v3 classes `text-ellipsis` and `text-clip` will. ([`65b03e4`](https://github.com/dcastil/tailwind-merge/commit/65b03e48914ac5d7d52eea9ec178b204d30609c9), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
    -   The classes `decoration-slice` and `decoration-clone` won't get merged anymore and `box-decoration-slide` nad `box-decoration-clone` will ([`bfe2cc9`](https://github.com/dcastil/tailwind-merge/commit/bfe2cc9bb221107fa0bf363cc325ddbb04677f43), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

-   `getDefaultConfig`

    -   Removed class group `outline` since it was removed in Tailwind v3 ([`55ab167`](https://github.com/dcastil/tailwind-merge/commit/55ab167b7167519873c5dd4d258dc62212d1659a), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
    -   Renamed class group `vertival-alignment` (yes, the typo was in the code) to `vertical-align` ([`1269ce6`](https://github.com/dcastil/tailwind-merge/commit/1269ce68ae39807ceadbecc98c0929fdfdb446d0), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
    -   Renamed class groups `flex-basis`, `flex-grow` and `flex-shrink` to `basis`, `grow` and `shrink` to stay consistent with Tailwind v3 ([`e6d8912`](https://github.com/dcastil/tailwind-merge/commit/e6d8912e47bf9a89346b9b0cc822fb2bff2af172), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

-   `validators`
    -   `isCustomLength` and `isCustomValue` were renamed to `isArbitraryLength` and `isArbitraryValue` to be consistent with naming in Tailwind v3 documentation ([`adc3c02`](https://github.com/dcastil/tailwind-merge/commit/adc3c02c7f035069beec1c62777ec008172587ab), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

### New Features

-   Add support for Tailwind v3 by [@dcastil](https://github.com/dcastil) in [#63](https://github.com/dcastil/tailwind-merge/pull/63)
    -   Support for all the new utility classes and variants in Tailwind v3.0.0
    -   Support for arbitrary properties like `[--my-var:20px]`
    -   Support for important modifiers in arbitrary properties like `![--my-very-important-var: 21px]`
    -   Support for new labels for classes with arbitrary value: `size`, `position`, `url`, `weight` and `family`
    -   New validators `isTshirtSize`, `isArbitrarySize`, `isArbitraryPosition`, `isArbitraryUrl` and `isArbitraryWeight`, check them out in the [documentation](https://github.com/dcastil/tailwind-merge/tree/v1.0.0#validators)! ([`fec2b18`](https://github.com/dcastil/tailwind-merge/commit/fec2b18870f6806e602009632b52b9fe89ebfb83), [`f8acd7c`](https://github.com/dcastil/tailwind-merge/commit/f8acd7ca5be6cc40ad4c1cbdee7522bbc44c7870), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

**Full Changelog**: [`v0.9.0...v1.0.0`](https://github.com/dcastil/tailwind-merge/compare/v0.9.0...v1.0.0)
