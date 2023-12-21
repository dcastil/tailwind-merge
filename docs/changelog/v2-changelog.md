# Changelog for v2 releases

## v2.2.0

### New Features

-   Add support for Tailwind CSS v3.4 by [@dcastil](https://github.com/dcastil) in [#360](https://github.com/dcastil/tailwind-merge/pull/360)

**Full Changelog**: [`v2.1.0...v2.2.0`](https://github.com/dcastil/tailwind-merge/compare/v2.1.0...v2.2.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@ErwinAI](https://github.com/ErwinAI) and [@langy](https://github.com/langy) for sponsoring tailwind-merge! ❤️

## v2.1.0

### New Features

-   Add `ClassValidator` type to package exports by [@dcastil](https://github.com/dcastil) in [#348](https://github.com/dcastil/tailwind-merge/pull/348)

### Bug Fixes

-   Fix display class not removed when it precedes line-clamp class by [@dcastil](https://github.com/dcastil) in [#347](https://github.com/dcastil/tailwind-merge/pull/347)

### Documentation

-   Fix curly bracket typo in config docs by [@Kosai106](https://github.com/Kosai106) in [#349](https://github.com/dcastil/tailwind-merge/pull/349)

**Full Changelog**: [`v2.0.0...v2.1.0`](https://github.com/dcastil/tailwind-merge/compare/v2.0.0...v2.1.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@ErwinAI](https://github.com/ErwinAI) and [@langy](https://github.com/langy) for sponsoring tailwind-merge! ❤️

## v2.0.0

The tailwind-merge v2 release has been sitting here almost finished for 2 months already. But the timing was never quite right, especially thinking about the increased support needed after the release. In the meantime, the product of the company I work at [launched in public beta](https://medium.com/@risecal/meet-rise-the-calendar-that-works-for-you-were-launching-the-public-beta-today-bc07555a2191) and I married. Thank you for your patience.

This release focuses on making it easier to configure the library for new users. Check out the [migration guide](./v1-to-v2-migration.md) and if you have any questions, feel free to [create an issue](https://github.com/dcastil/tailwind-merge/issues/new/choose).

### Breaking Changes

-   Fix `background-image` and `background-position` being merged incorrectly by [@dcastil](https://github.com/dcastil) in [#300](https://github.com/dcastil/tailwind-merge/pull/300)
    -   Values for `background-position` and `background-size` can look very similar and Tailwind CSS uses the same `bg-` prefix for both groups. This results in some [limitations](../limitations.md) for tailwind-merge. If you use background position or background size with arbitrary values, please read [this section](../limitations.md#you-need-to-use-label-in-arbitrary-background-position-and-background-size-classes) about how to use them.
-   Make types of available keys more strict and configurable through generics by [@kachkaev](https://github.com/kachkaev) in [#279](https://github.com/dcastil/tailwind-merge/pull/279)
-   Make it possible to override elements with `extendTailwindMerge` by [@dcastil](https://github.com/dcastil) in [#294](https://github.com/dcastil/tailwind-merge/pull/294)
-   Separate validators better by [@dcastil](https://github.com/dcastil) in [#292](https://github.com/dcastil/tailwind-merge/pull/292)
-   Make `conflictingClassGroupModifiers` in config non-optional by [@dcastil](https://github.com/dcastil) in [#291](https://github.com/dcastil/tailwind-merge/pull/291)
-   Move separator to config by [@dcastil](https://github.com/dcastil) in [#290](https://github.com/dcastil/tailwind-merge/pull/290)
-   Remove `module` field from package.json by [@dcastil](https://github.com/dcastil) in [#289](https://github.com/dcastil/tailwind-merge/pull/289)
-   Remove deprecated exports by [@dcastil](https://github.com/dcastil) in [#288](https://github.com/dcastil/tailwind-merge/pull/288)
-   Transpile lib to more modern JS by [@dcastil](https://github.com/dcastil) in [#287](https://github.com/dcastil/tailwind-merge/pull/287)

### New Features

-   Make types of available keys more strict and configurable through generics by [@kachkaev](https://github.com/kachkaev) in [#279](https://github.com/dcastil/tailwind-merge/pull/279)
-   Make it possible to override elements with `extendTailwindMerge` by [@dcastil](https://github.com/dcastil) in [#294](https://github.com/dcastil/tailwind-merge/pull/294)
-   Separate validators better by [@dcastil](https://github.com/dcastil) in [#292](https://github.com/dcastil/tailwind-merge/pull/292)
-   Make `conflictingClassGroupModifiers` in config non-optional by [@dcastil](https://github.com/dcastil) in [#291](https://github.com/dcastil/tailwind-merge/pull/291)
-   Move separator to config by [@dcastil](https://github.com/dcastil) in [#290](https://github.com/dcastil/tailwind-merge/pull/290)
-   Remove `module` field from package.json by [@dcastil](https://github.com/dcastil) in [#289](https://github.com/dcastil/tailwind-merge/pull/289)
-   Remove deprecated exports by [@dcastil](https://github.com/dcastil) in [#288](https://github.com/dcastil/tailwind-merge/pull/288)
-   Transpile lib to more modern JS by [@dcastil](https://github.com/dcastil) in [#287](https://github.com/dcastil/tailwind-merge/pull/287)
-   Add ES5 bundle by [@dcastil](https://github.com/dcastil) in [#286](https://github.com/dcastil/tailwind-merge/pull/286)

### Bug Fixes

-   Fix touch action classes overriding each other incorrectly by [@dcastil](https://github.com/dcastil) in [#313](https://github.com/dcastil/tailwind-merge/pull/313)
-   Fix `background-image` and `background-position` being merged incorrectly by [@dcastil](https://github.com/dcastil) in [#300](https://github.com/dcastil/tailwind-merge/pull/300)
-   Fix number validators accidentally returning `true` for empty strings by [@dcastil](https://github.com/dcastil) in [#295](https://github.com/dcastil/tailwind-merge/pull/295)
-   Fix typo in test filename by [@CrutchTheClutch](https://github.com/CrutchTheClutch) in [#284](https://github.com/dcastil/tailwind-merge/pull/284)

### Documentation

-   Explain limitations of arbitrary values in `bg-size` and `bg-position` class groups in docs by [@dcastil](https://github.com/dcastil) in [#328](https://github.com/dcastil/tailwind-merge/pull/328)

**Full Changelog**: [`v1.14.0...v2.0.0`](https://github.com/dcastil/tailwind-merge/compare/v1.14.0...v2.0.0)

Thanks to [@quezlatch](https://github.com/quezlatch), [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990) and [@ErwinAI](https://github.com/ErwinAI) for sponsoring tailwind-merge! ❤️
