# Guide to migrate from v0 to v1

## Overview

tailwind-merge v1 drops support for Tailwind CSS v2 and in turn adds support for Tailwind CSS v3.

There are no breaking changes in the tailwind-merge types and some breaking changes for a small number of users in the return values, so you should get through smoothly.

## Breaking changes

### `twMerge` and `extendTailwindMerge`

-   Outline utilities from Tailwind v2 don't get merged anymore since they were replaced by outline width, outline style, outline offset and outline color in Tailwind v3 ([`55ab167`](https://github.com/dcastil/tailwind-merge/commit/55ab167b7167519873c5dd4d258dc62212d1659a), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
-   The classes `overflow-ellipsis` and `overflow-clip` will not get merged with class `truncate` anymore, but the new Tailwind v3 classes `text-ellipsis` and `text-clip` will. ([`65b03e4`](https://github.com/dcastil/tailwind-merge/commit/65b03e48914ac5d7d52eea9ec178b204d30609c9), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
-   The classes `decoration-slice` and `decoration-clone` won't get merged anymore and `box-decoration-slide` nad `box-decoration-clone` will ([`bfe2cc9`](https://github.com/dcastil/tailwind-merge/commit/bfe2cc9bb221107fa0bf363cc325ddbb04677f43), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

### `getDefaultConfig`

-   Removed class group `outline` since it was removed in Tailwind v3 ([`55ab167`](https://github.com/dcastil/tailwind-merge/commit/55ab167b7167519873c5dd4d258dc62212d1659a), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
-   Renamed class group `vertival-alignment` (yes, the typo was in the code) to `vertical-align` ([`1269ce6`](https://github.com/dcastil/tailwind-merge/commit/1269ce68ae39807ceadbecc98c0929fdfdb446d0), [#63](https://github.com/dcastil/tailwind-merge/pull/63))
-   Renamed class groups `flex-basis`, `flex-grow` and `flex-shrink` to `basis`, `grow` and `shrink` to stay consistent with Tailwind v3 ([`e6d8912`](https://github.com/dcastil/tailwind-merge/commit/e6d8912e47bf9a89346b9b0cc822fb2bff2af172), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

### `validators`

-   `isCustomLength` and `isCustomValue` were renamed to `isArbitraryLength` and `isArbitraryValue` to be consistent with naming in Tailwind v3 documentation ([`adc3c02`](https://github.com/dcastil/tailwind-merge/commit/adc3c02c7f035069beec1c62777ec008172587ab), [#63](https://github.com/dcastil/tailwind-merge/pull/63))

## Steps to upgrade

-   Upgrade to Tailwind CSS v3
-   Upgrade to tailwind-merge v1
