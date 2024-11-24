# Changelog for v2 releases

## v2.5.5

### Bug Fixes

-   Fix typo "fractons" instead of "fractions" in "stacked-fractions" class by [@oliverhaas](https://github.com/oliverhaas) in [#492](https://github.com/dcastil/tailwind-merge/pull/492)

### Documentation

-   Add installation instructions to configuration docs by [@dcastil](https://github.com/dcastil) in [#486](https://github.com/dcastil/tailwind-merge/pull/486)

**Full Changelog**: [`v2.5.4...v2.5.5`](https://github.com/dcastil/tailwind-merge/compare/v2.5.4...v2.5.5)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov) and more via [@thnxdev](https://github.com/thnxdev) for sponsoring tailwind-merge! ❤️

## v2.5.4

### Bug Fixes

-   Fix incorrect paths within sourcemaps by [@dcastil](https://github.com/dcastil) in [#483](https://github.com/dcastil/tailwind-merge/pull/483)

**Full Changelog**: [`v2.5.3...v2.5.4`](https://github.com/dcastil/tailwind-merge/compare/v2.5.3...v2.5.4)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow) and [@codecov](https://github.com/codecov) for sponsoring tailwind-merge! ❤️

## v2.5.3

### Bug Fixes

-   Add missing logical border color properties by [@sherlockdoyle](https://github.com/sherlockdoyle) in [#478](https://github.com/dcastil/tailwind-merge/pull/478)

### Documentation

-   Add benchmark reporting to PRs and commits by [@XantreDev](https://github.com/XantreDev) in [#455](https://github.com/dcastil/tailwind-merge/pull/455)

### Other

-   Switch test suite to vitest by [@dcastil](https://github.com/dcastil) in [#461](https://github.com/dcastil/tailwind-merge/pull/461)

**Full Changelog**: [`v2.5.2...v2.5.3`](https://github.com/dcastil/tailwind-merge/compare/v2.5.2...v2.5.3)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@xeger](https://github.com/xeger) and [@MrDeatHHH](https://github.com/MrDeatHHH) for sponsoring tailwind-merge! ❤️

## v2.5.2

### Bug Fixes

-   Fix multiline input not working anymore by [@dcastil](https://github.com/dcastil) in [#459](https://github.com/dcastil/tailwind-merge/pull/459)

**Full Changelog**: [`v2.5.1...v2.5.2`](https://github.com/dcastil/tailwind-merge/compare/v2.5.1...v2.5.2)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco) and [@jamaluddinrumi](https://github.com/jamaluddinrumi) for sponsoring tailwind-merge! ❤️

## v2.5.1

### Bug Fixes

-   Fix space at beginning of input causing infinite loop by [@dcastil](https://github.com/dcastil) in [#457](https://github.com/dcastil/tailwind-merge/pull/457)

**Full Changelog**: [`v2.5.0...v2.5.1`](https://github.com/dcastil/tailwind-merge/compare/v2.5.0...v2.5.1)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco) and [@jamaluddinrumi](https://github.com/jamaluddinrumi) for sponsoring tailwind-merge! ❤️

## v2.5.0

### New Features

-   Performance improvements in mergeClassList by [@XantreDev](htttps://github.com/XantreDev) in [#450](https://github.com/dcastil/tailwind-merge/pull/450) and [@rortan134](https://github.com/rortan134) in [#445](https://github.com/dcastil/tailwind-merge/pull/445)
-   Use arrow functions where possible to help with minification by [@VIKTORVAV99](htttps://github.com/VIKTORVAV99) in [#449](https://github.com/dcastil/tailwind-merge/pull/449)

### Bug FIxes

-   Fix bg-opacity arbitrary percentages not being recognized properly by [@dcastil](https://github.com/dcastil) in [#451](https://github.com/dcastil/tailwind-merge/pull/451)

**Full Changelog**: [`v2.4.0...v2.5.0`](https://github.com/dcastil/tailwind-merge/compare/v2.4.0...v2.5.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy) and [@jamesreaco](https://github.com/jamesreaco) for sponsoring tailwind-merge! ❤️

## v2.4.0

### New Features

-   Allow hooking into class parsing logic (experimental) by [@dcastil](https://github.com/dcastil) in [#444](https://github.com/dcastil/tailwind-merge/pull/444)
    -   There is no info to this in the docs because this is experimental, but there is a new `experimentalParseClassName` property in the config that allows you to customize how tailwind-merge recognizes classes. If you're interested, you can read how to use it in the [inline JSDocs](https://github.com/dcastil/tailwind-merge/pull/444/files#diff-b8b77f5be18cf56dca425b3a5b8e9d2e754dd37fe0e3612b95cd4e9bccda08a5) and subscribe to https://github.com/dcastil/tailwind-merge/issues/385 for upcoming more powerful low-level functionality.
-   Create security policy by [@dcastil](https://github.com/dcastil) in [#439](https://github.com/dcastil/tailwind-merge/pull/439)
    -   Added documentation on how to report potential vulnerabilities
-   Avoid `@babel/runtime` dependency by [@dcastil](https://github.com/dcastil) in [#431](https://github.com/dcastil/tailwind-merge/pull/431)
    -   Now no dependencies in tailwind-merge anymore. This dependency was only used in the `tailwind-merge/es5` bundle anyway which I don't optimize for.

### Documentation

-   Comment/typo fixes by [@barvian](https://github.com/barvian) in [#443](https://github.com/dcastil/tailwind-merge/pull/443)
-   Fix typo in doc/recipes.md by [@dsernst](https://github.com/dsernst) in [#428](https://github.com/dcastil/tailwind-merge/pull/428)
-   Add tailwind-merge-dotnet to similar packages by [@desmondinho](https://github.com/desmondinho) in [#415](https://github.com/dcastil/tailwind-merge/pull/415)

### Other

-   Added GitHub Action that adds context-v2 label to every issue, discussion and PR by [@Pritam1211](https://github.com/Pritam1211) in [#434](https://github.com/dcastil/tailwind-merge/pull/434)
-   Replace size-limit action with own metrics-report action by [@dcastil](https://github.com/dcastil) in [#433](https://github.com/dcastil/tailwind-merge/pull/433)

**Full Changelog**: [`v2.3.0...v2.4.0`](https://github.com/dcastil/tailwind-merge/compare/v2.3.0...v2.4.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco) and [@microsoft](https://github.com/microsoft) for sponsoring tailwind-merge! ❤️

## v2.3.0

### New Features

-   Add support for mix-blend-plus-darker utility by [@dcastil](https://github.com/dcastil) in [#403](https://github.com/dcastil/tailwind-merge/pull/403)
-   Added support for bigint in ClassNameValue type by [@LarsArtmann](https://github.com/LarsArtmann) in [#402](https://github.com/dcastil/tailwind-merge/pull/402)

### Documentation

-   Add tailwind-merge-go to similar packages in docs by [@Oudwins](https://github.com/Oudwins) in [#396](https://github.com/dcastil/tailwind-merge/pull/396)

**Full Changelog**: [`v2.2.2...v2.3.0`](https://github.com/dcastil/tailwind-merge/compare/v2.2.2...v2.3.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy) and [@jamesreaco](https://github.com/jamesreaco) for sponsoring tailwind-merge! ❤️

## v2.2.2

### Bug Fixes

-   Fix arbitrary shadow with inset not recognized by [@dcastil](https://github.com/dcastil) in [#392](https://github.com/dcastil/tailwind-merge/pull/392)

### Documentation

-   Fix minor typos in `configuration.md` by [@stephan281094](https://github.com/stephan281094) in [#372](https://github.com/dcastil/tailwind-merge/pull/372)

**Full Changelog**: [`v2.2.1...v2.2.2`](https://github.com/dcastil/tailwind-merge/compare/v2.2.1...v2.2.2)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), a private sponsor and [@jamesreaco](https://github.com/jamesreaco) for sponsoring tailwind-merge! ❤️

## v2.2.1

### Bug Fixes

-   Fix stroke-color being incorrectly detected as stroke-width by [@dcastil](https://github.com/dcastil) in [#371](https://github.com/dcastil/tailwind-merge/pull/371)

**Full Changelog**: [`v2.2.0...v2.2.1`](https://github.com/dcastil/tailwind-merge/compare/v2.2.0...v2.2.1)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990) and [@langy](https://github.com/langy) for sponsoring tailwind-merge! ❤️

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
