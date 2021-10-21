import { createTailwindMerge } from './tailwind-merge'
import { getDefaultConfig } from './default-config'

export const twMerge = createTailwindMerge(getDefaultConfig)
export { createTailwindMerge, getDefaultConfig }
export * as validators from './validators'
