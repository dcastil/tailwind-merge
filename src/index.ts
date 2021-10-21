import { createTailwindMerge } from './create-tailwind-merge'
import { getDefaultConfig } from './default-config'

export const twMerge = createTailwindMerge(getDefaultConfig)

export { createTailwindMerge, getDefaultConfig }
export { extendTailwindMerge } from './extend-tailwind-merge'
export type { Config } from './types'
export * as validators from './validators'
export { mergeConfigs } from './merge-configs'
