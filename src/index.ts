import { twJoin } from './lib/tw-join'

export { twMerge } from './lib/tw-merge'
export { twJoin } from './lib/tw-join'
export { getDefaultConfig } from './lib/default-config'
export { extendTailwindMerge } from './lib/extend-tailwind-merge'
export { createTailwindMerge } from './lib/create-tailwind-merge'
export type { Config } from './lib/types'
export * as validators from './lib/validators'
export { mergeConfigs } from './lib/merge-configs'
export { fromTheme } from './lib/from-theme'

/**
 * @deprecated Will be removed in next major version. Use `twJoin` instead.
 */
export const join = twJoin
