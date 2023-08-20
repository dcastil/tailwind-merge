import { createClassUtils } from './class-utils'
import { createLruCache } from './lru-cache'
import { createSplitModifiers } from './modifier-utils'
import { GenericConfig } from './types'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createConfigUtils(config: GenericConfig) {
    return {
        cache: createLruCache<string, string>(config.cacheSize),
        splitModifiers: createSplitModifiers(config),
        ...createClassUtils(config),
    }
}
