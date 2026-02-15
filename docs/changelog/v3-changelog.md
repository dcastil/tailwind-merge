# Changelog for v3 releases

## v3.4.1

### Bug Fixes

- Prevent arbitrary font-family and font-weight from merging by [@roneymoon](https://github.com/roneymoon) in [#635](https://github.com/dcastil/tailwind-merge/pull/635)

**Full Changelog**: [`v3.4.0...v3.4.1`](https://github.com/dcastil/tailwind-merge/compare/v3.4.0...v3.4.1)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), a private sponsor, [@block](https://github.com/block), [@openclaw](https://github.com/openclaw), [@sourcegraph](https://github.com/sourcegraph) and more via [@thnxdev](https://github.com/thnxdev) for sponsoring tailwind-merge! ❤️

## v3.4.0

### New Features

- Performance optimizations which make tailwind-merge >10% faster
    - Vibe optimization by [@quantizor](https://github.com/quantizor) in [#547](https://github.com/dcastil/tailwind-merge/pull/547)
    - Additional optimizations by [@quantizor](https://github.com/quantizor) in [#619](https://github.com/dcastil/tailwind-merge/pull/619)

### Documentation

- Improve docs by clarifying things, adding more examples by [@dcastil](https://github.com/dcastil) in [#618](https://github.com/dcastil/tailwind-merge/pull/618)
- Make examples more realistic by [@dcastil](https://github.com/dcastil) in [#617](https://github.com/dcastil/tailwind-merge/pull/617)
- Add custom variant as an alternative to docs by [@kidonng](https://github.com/kidonng) in [#592](https://github.com/dcastil/tailwind-merge/pull/592)

### Other

- Improve benchmarking suite by [@quantizor](https://github.com/quantizor) in [#620](https://github.com/dcastil/tailwind-merge/pull/620)

**Full Changelog**: [`v3.3.1...v3.4.0`](https://github.com/dcastil/tailwind-merge/compare/v3.3.1...v3.4.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov) and a private sponsor for sponsoring tailwind-merge! ❤️

## v3.3.1

### Bug Fixes

- Fix arbitrary value using `color-mix()` not being detected as color by [@dcastil](https://github.com/dcastil) in [#591](https://github.com/dcastil/tailwind-merge/pull/591)

**Full Changelog**: [`v3.3.0...v3.3.1`](https://github.com/dcastil/tailwind-merge/compare/v3.3.0...v3.3.1)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph), a private sponsor, [@block](https://github.com/block) and [shawt3000](https://github.com/shawt3000) for sponsoring tailwind-merge! ❤️

## v3.3.0

### New Features

- Add support for tailwind CSS v4.1.5 by [@dcastil](https://github.com/dcastil) in [#575](https://github.com/dcastil/tailwind-merge/pull/575)

**Full Changelog**: [`v3.2.0...v3.3.0`](https://github.com/dcastil/tailwind-merge/compare/v3.2.0...v3.3.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph), a private sponsor and [@block](https://github.com/block) for sponsoring tailwind-merge! ❤️

## v3.2.0

### New Features

- Add support for Tailwind CSS v4.1 by [@dcastil](https://github.com/dcastil) in [#565](https://github.com/dcastil/tailwind-merge/pull/565)

**Full Changelog**: [`v3.1.0...v3.2.0`](https://github.com/dcastil/tailwind-merge/compare/v3.1.0...v3.2.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph) and a private sponsor for sponsoring tailwind-merge! ❤️

## v3.1.0

### New Features

- Add support for Tailwind CSS v4.0.10 by [@dcastil](https://github.com/dcastil) in [#546](https://github.com/dcastil/tailwind-merge/pull/546)

### Bug Fixes

- Fix length variable in `via-(length:*)` class being merged with `via-<color>` classes accidentally by [@dcastil](https://github.com/dcastil) in [#559](https://github.com/dcastil/tailwind-merge/pull/559)

### Documentation

- Fix typo in comment in types.ts by [@roottool](https://github.com/roottool) in [#549](https://github.com/dcastil/tailwind-merge/pull/549)
- Update shadow scale recipe to tailwind merge v3 API by [@dcastil](https://github.com/dcastil) in [#545](https://github.com/dcastil/tailwind-merge/pull/545)

### Other

- Fix metrics report action erroring on PRs from forks by [@dcastil](https://github.com/dcastil) in [#551](https://github.com/dcastil/tailwind-merge/pull/551)

**Full Changelog**: [`v3.0.2...v3.1.0`](https://github.com/dcastil/tailwind-merge/compare/v3.0.2...v3.1.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph) and a private sponsor for sponsoring tailwind-merge! ❤️

## v3.0.2

### Bug Fixes

- Fix `px` value not being recognized for some class groups by [@dcastil](https://github.com/dcastil) in [#538](https://github.com/dcastil/tailwind-merge/pull/538)
- Fix doc comment being in incorrect place in default config by [@gjtorikian](https://github.com/gjtorikian) in [#526](https://github.com/dcastil/tailwind-merge/pull/526)

**Full Changelog**: [`v3.0.1...v3.0.2](https://github.com/dcastil/tailwind-merge/compare/v3.0.1...v3.0.2)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph) and a private sponsor for sponsoring tailwind-merge! ❤️

## v3.0.1

### Bug Fixes

- Update info about supported Tailwind CSS version in README by [@dcastil](https://github.com/dcastil) in [`b9c136d`](https://github.com/dcastil/tailwind-merge/commit/b9c136df358ef6012f23bf08258dbf970c0aec43)
- Update incorrect link in v3 changelog by [@dcastil](https://github.com/dcastil) in [`e22885e`](https://github.com/dcastil/tailwind-merge/commit/e22885e41e1661f1493f9bf6fb829cfbe1b50281)

**Full Changelog**: [`v3.0.0...v3.0.1`](https://github.com/dcastil/tailwind-merge/compare/v3.0.0...v3.0.1)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph) and a private sponsor for sponsoring tailwind-merge! ❤️

## v3.0.0

[Tailwind CSS v4 is here](https://tailwindcss.com/blog/tailwindcss-v4) and it's time to upgrade tailwind-merge to support it. tailwind-merge v3.0.0 is more accurate than ever and follows the Tailwind CSS spec more closely than in v2. That is thanks to Tailwind CSS v4 being more consistent than ever.

This release drops support for Tailwind CSS v3 and in turn adds support for Tailwind CSS v4. That means you should upgrade to Tailwind CSS v4 and tailwind-merge v3 together. All breaking changes are related to the Tailwind CSS v4 support.

Check out the [migration guide](./v2-to-v3-migration.md) and if you have any questions, feel free to [create an issue](https://github.com/dcastil/tailwind-merge/issues/new/choose).

### Breaking Changes

- Dropping support for Tailwind CSS v3 in favor of support for Tailwind CSS v4 by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Theme scales keys changed and now match Tailwind CSS v4 theme variable namespace exactly by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- `isLength` validator was removed and split into separate validators `isNumber` and `isFraction` by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Prefix defined in config shouldn't include combining `-` character anymore by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Tailwind CSS v3 prefix position in class not supported anymore in favor of Tailwind CSS v4 position by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Custom separators are no longer supported by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- New mandatory `orderSensitiveModifiers` property in config when using `createTailwindMerge` by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- `DefaultThemeGroupIds` type union consists of different string literals than before by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Classes removed in Tailwind CSS v4 are not supported by tailwind-merge anymore by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)

### New Features

- Support for new important modifier position at the end of class by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- Support for arbitrary CSS variable syntax by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)
- There are a bunch of new validators used by tailwind-merge, primarily for new Tailwind CSS v4 features like arbitrary CSS variables by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)

### Bug Fixes

- Previously some order-sensitive modifiers like `before:` were treated as not order-sensitive. This is now fixed by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)

### Documentation

- Added section explaining order-sensitive modifiers to [configuration docs](../configuration.md#order-sensitive-modifiers) by [@dcastil](https://github.com/dcastil) in [#518](https://github.com/dcastil/tailwind-merge/pull/518)

**Full Changelog**: [`v2.6.0...v3.0.0`](https://github.com/dcastil/tailwind-merge/compare/v2.6.0...v3.0.0)

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov), [@sourcegraph](https://github.com/sourcegraph) and a private sponsor for sponsoring tailwind-merge! ❤️
