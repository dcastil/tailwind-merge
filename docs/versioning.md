# Versioning

This package follows the [SemVer](https://semver.org) versioning rules. More specifically:

-   Patch version gets incremented when unintended behavior is fixed, which doesn't break any existing API. Note that bug fixes can still alter which styles are applied. E.g. a bug gets fixed in which the conflicting classes `inline` and `block` weren't merged correctly so that both would end up in the result.

-   Minor version gets incremented when additional features are added which don't break any existing API. However, a minor version update might still alter which styles are applied if you use Tailwind features not yet supported by tailwind-merge. E.g. a new Tailwind prefix `magic` gets added to this package which changes the result of `twMerge('magic:px-1 magic:p-3')` from `magic:px-1 magic:p-3` to `magic:p-3`.

-   Major version gets incremented when breaking changes are introduced to the package API. E.g. the return type of `twMerge` changes.

-   `alpha` releases might introduce breaking changes on any update. Whereas `beta` releases only introduce new features or bug fixes.

-   Releases with major version 0 might introduce breaking changes on a minor version update.

-   A non-production-ready version of every commit pushed to the main branch is released under the `dev` tag for testing purposes. It has a format like [`0.0.0-dev.7c00bdf2594b02161291999463b5db6dc5159870`](https://www.npmjs.com/package/tailwind-merge/v/0.0.0-dev.7c00bdf2594b02161291999463b5db6dc5159870) in which the first numbers are the corresponding last release and the hash at the end is the git SHA of the commit.

-   A changelog is documented in [GitHub Releases](https://github.com/dcastil/tailwind-merge/releases).

---

Next: [Contributing](./contributing.md)

Previous: [Writing plugins](./writing-plugins.md)
