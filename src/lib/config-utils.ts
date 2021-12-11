import { getLruCache } from './lru-cache'
import { Config } from './types'
import { createClassUtils } from './class-utils'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createConfigUtils(config: Config) {
    return {
        cache: getLruCache<string>(config.cacheSize),
        ...createClassUtils(config),
    }
}
