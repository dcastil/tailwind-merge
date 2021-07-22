import { createConfigUtils } from './config-utils'
import { getDefaultConfig } from './default-config'
import { Config } from './types'
import { mergeClassList } from './merge-classlist'

type CreateConfig = (getDefault: typeof getDefaultConfig) => Config
type TailwindMerge = (...classLists: Array<string | undefined>) => string

export function createTailwindMerge(createConfig: CreateConfig): TailwindMerge {
    const configUtils = createConfigUtils(createConfig(getDefaultConfig))

    const {
        cache: { get: cacheGet, set: cacheSet },
    } = configUtils

    return function tailwindMerge(...classLists) {
        const classList = classLists.filter(Boolean).join(' ')
        const cachedResult = cacheGet(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cacheSet(classList, result)

        return result
    }
}
