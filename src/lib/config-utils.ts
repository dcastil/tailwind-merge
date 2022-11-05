import { createLruCache } from './lru-cache'
import { Config } from './types'
import { createClassUtils } from './class-utils'
import { createSplitModifiers } from './modifier-utils'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createConfigUtils(config: Config) {
    return {
        cache: createLruCache<string, string>(config.cacheSize),
        splitModifiers: createSplitModifiers(config),
        ...createClassUtils(config),
    }
}
