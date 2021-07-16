import { getDefaultConfig } from './config/get-default-config'

import { Config } from './config/types'
import { getLruCache } from './get-lru-cache'
import { mergeClassList } from './merge-classlist'

type CreateConfig = (getDefault: typeof getDefaultConfig) => Config

export function createTailwindMerge(createConfig: CreateConfig) {
    const config = createConfig(getDefaultConfig)
    const cache = getLruCache<string>(config.cacheSize)

    return function tailwindMerge(...classLists: string[]) {
        const classList = classLists.join(' ')
        const cachedResult = cache.get(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList)
        cache.set(classList, result)

        return result
    }
}
