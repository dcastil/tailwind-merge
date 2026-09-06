# Versioning

The package is currently unreleased. Its initial planned version is `0.1.0`, after a matching tailwind-merge library release. The following policy describes that release series.

This package follows [SemVer](https://semver.org), with the pre-1.0 reading spelled out:

- **While the version is 0.x, minor releases can contain breaking changes** — to plugin options, the runtime module's exports, generated merge behavior, or supported Tailwind/Vite ranges. Patch releases contain only fixes.
- **Consider the package not production-ready until 1.0.0.** It works and is tested, but the API surface and behavior are still being validated against real-world projects — that's what the 0.x phase is for. Pin an exact version if you use it anywhere you care about.
- The stable surface the versioning promises apply to is the **plugin's options** and the **`@tailwind-merge/vite/runtime` exports**. Everything else — the shape of the generated module, the internal `/tailwind-merge` subpath, the config-generation machinery — is internal and may change in any release.
- The tailwind-merge dependency is an implementation detail: plugin releases must select a compatible library version for both generation and runtime. Before the first release, local trials must supply matching checkout builds; the old registry library does not satisfy the generator's new API requirements.

Once 1.0.0 ships, breaking changes will only happen in major releases, following the same practice as [tailwind-merge's versioning](https://github.com/dcastil/tailwind-merge/blob/v3.6.0/docs/versioning.md).
