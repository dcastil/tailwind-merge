import { createConfigUtils } from './config/config-utils'
import { getDefaultConfig } from './config/default-config'
import { Config } from './config/types'
import { getLruCache } from './lru-cache'
import { mergeClassList } from './merge-classlist'

type CreateConfig = (getDefault: typeof getDefaultConfig) => Config
type TailwindMerge = (...classLists: Array<string | undefined>) => string

export function createTailwindMerge(createConfig: CreateConfig): TailwindMerge {
    const config = createConfig(getDefaultConfig)
    const configUtils = createConfigUtils(config)
    const cache = getLruCache<string>(config.cacheSize)

    return function tailwindMerge(...classLists) {
        const classList = classLists.filter(Boolean).join(' ')
        const cachedResult = cache.get(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cache.set(classList, result)

        return result
    }
}
