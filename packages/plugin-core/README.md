# @tailwind-merge/plugin-core

The shared core of the tailwind-merge bundler plugins, currently [@tailwind-merge/vite](../vite/README.md). It owns what every plugin needs regardless of bundler: finding the project's Tailwind CSS entrypoint, generating the runtime module from it through [@tailwind-merge/configurator](../configurator/README.md), and the generation session that decides when a served module can be reused, re-pruned, or must be regenerated.

**Status: internal, unpublished.** Each plugin inlines this package into its bundle at build time, so there is nothing to install. Its API changes with the plugins; see the [plugin core development guide](../../agents/plugin-core.md) for the invariants it upholds and how to work on it.
