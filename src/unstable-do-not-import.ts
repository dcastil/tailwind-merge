/**
 * DO NOT IMPORT FROM THIS MODULE unless you accept that everything in it can change or disappear in any release, including patch releases. See docs/versioning.md.
 *
 * This entry point exposes tailwind-merge internals for sibling tooling — e.g. the tailwind-merge configurator, which needs to classify class names exactly the way the runtime does. If you find yourself needing something from here in your own project, please open an issue at https://github.com/dcastil/tailwind-merge/issues so a supported API can be considered instead.
 */
export { createClassGroupUtils } from './lib/class-group-utils'
export { type AnyConfig, type ClassGroup, type ThemeGetter } from './lib/types'
