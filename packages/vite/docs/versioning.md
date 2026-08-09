# Versioning

This package follows [SemVer](https://semver.org), with the pre-1.0 reading spelled out:

- **While the version is 0.x, minor releases can contain breaking changes** — to plugin options, the runtime module's exports, generated merge behavior, or supported Tailwind/Vite ranges. Patch releases contain only fixes.
- **Consider the package not production-ready until 1.0.0.** It works and is tested, but the API surface and behavior are still being validated against real-world projects — that's what the 0.x phase is for. Pin an exact version if you use it anywhere you care about.
- The stable surface the versioning promises apply to is the **plugin's options** and the **`@tailwind-merge/vite/runtime` exports**. Everything else — the shape of the generated module, the internal `/tailwind-merge` subpath, the config-generation machinery — is internal and may change in any release.
- The bundled tailwind-merge version is an implementation detail: the plugin upgrades it deliberately, and generated code and runtime always ship in lockstep, so they cannot drift apart.

Once 1.0.0 ships, breaking changes will only happen in major releases, following the same practice as [tailwind-merge's versioning](https://github.com/dcastil/tailwind-merge/blob/main/docs/versioning.md).
