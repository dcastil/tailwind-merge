# Changelog for v3 releases

## v3.0.0

[Tailwind CSS v4 is here](https://tailwindcss.com/blog/tailwindcss-v4) and it's time to upgrade tailwind-merge to support it. tailwind-merge v3.0.0 is more accurate than ever and follows the Tailwind CSS spec more closely than in v2. That is thanks to Tailwind CSS v4 being more consistent than ever.

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

Thanks to [@brandonmcconnell](https://github.com/brandonmcconnell), [@manavm1990](https://github.com/manavm1990), [@langy](https://github.com/langy), [@jamesreaco](https://github.com/jamesreaco), [@roboflow](https://github.com/roboflow), [@syntaxfm](https://github.com/syntaxfm), [@getsentry](https://github.com/getsentry), [@codecov](https://github.com/codecov) and a private sponsor for sponsoring tailwind-merge! ❤️
