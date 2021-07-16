import { createConfigUtils } from './config/config-utils'
import { getDefaultConfig } from './config/default-config'

import { Config } from './config/types'
import { getLruCache } from './lru-cache'
import { mergeClassList } from './merge-classlist'

type CreateConfig = (getDefault: typeof getDefaultConfig) => Config

export function createTailwindMerge(createConfig: CreateConfig) {
    const config = createConfig(getDefaultConfig)
    const configUtils = createConfigUtils(config)
    const cache = getLruCache<string>(config.cacheSize)

    return function tailwindMerge(...classLists: string[]) {
        const classList = classLists.join(' ')
        const cachedResult = cache.get(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cache.set(classList, result)

        return result
    }
}
