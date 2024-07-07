import { createClassGroupUtils } from './class-group-utils'
import { createLruCache } from './lru-cache'
import { createParseClassName } from './parse-class-name'
import { GenericConfig } from './types'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createConfigUtils(config: GenericConfig) {
    return {
        cache: createLruCache<string, string>(config.cacheSize),
        parseClassName: createParseClassName(config),
        ...createClassGroupUtils(config),
    }
}
