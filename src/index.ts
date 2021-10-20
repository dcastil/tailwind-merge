import { createTailwindMerge } from './tailwind-merge'

export const twMerge = createTailwindMerge((defaultConfig) => defaultConfig())
export { createTailwindMerge }
export * as validators from './validators'
