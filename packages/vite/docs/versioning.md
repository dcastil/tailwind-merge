# Versioning

The package has no stable release yet; the first one will be `0.1.0`. Until then, and afterwards for every commit on `main`, dev builds are published under the `dev` dist-tag with versions like `0.0.0-dev.<commit sha>`: the first part is the last stable release the build corresponds to, the hash is the git commit. Dev builds can change or break on any commit and are for evaluation only. The following policy describes the stable release series.

The plugin bundles the configurator, so configurator fixes are included in plugin releases and their changelogs.

This package follows [SemVer](https://semver.org), with the pre-1.0 reading spelled out:

- **While the version is 0.x, minor releases can contain breaking changes** — to plugin options, the runtime module's exports, generated merge behavior, or supported Tailwind/Vite ranges. Patch releases contain only fixes.
- **Consider the package not production-ready until 1.0.0.** It works and is tested, but the API surface and behavior are still being validated against real-world projects — that's what the 0.x phase is for. Pin an exact version if you use it anywhere you care about.
- The stable surface the versioning promises apply to is the **plugin's options** and the **`@tailwind-merge/vite/runtime` exports**. Everything else — the shape of the generated module, the internal `/tailwind-merge` subpath, the config-generation machinery — is internal and may change in any release.
- The tailwind-merge dependency is an implementation detail: plugin releases select a compatible library version for both generation and runtime. Dev builds pin the exact tailwind-merge dev build of the same commit, since the generator relies on library internals that can change between commits.

Once 1.0.0 ships, breaking changes will only happen in major releases, following the same practice as [tailwind-merge's versioning](https://github.com/dcastil/tailwind-merge/blob/tailwind-merge@3.7.0/packages/tailwind-merge/docs/versioning.md).
