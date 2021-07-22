import { createConfigUtils } from './config-utils'
import { getDefaultConfig } from './default-config'
import { Config } from './types'
import { mergeClassList } from './merge-classlist'

type CreateConfig = (getDefault: typeof getDefaultConfig) => Config
type ClassLists = Array<string | undefined>
type TailwindMerge = (...classLists: ClassLists) => string
type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createTailwindMerge(createConfig: CreateConfig): TailwindMerge {
    let configUtils: ConfigUtils
    let cacheGet: ConfigUtils['cache']['get']
    let cacheSet: ConfigUtils['cache']['set']
    let functionToCall = initTailwindMerge

    function initTailwindMerge(classLists: ClassLists) {
        configUtils = createConfigUtils(createConfig(getDefaultConfig))
        cacheGet = configUtils.cache.get
        cacheSet = configUtils.cache.set
        functionToCall = tailwindMerge

        return tailwindMerge(classLists)
    }

    function tailwindMerge(classLists: ClassLists) {
        const classList = classLists.filter(Boolean).join(' ')
        const cachedResult = cacheGet(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cacheSet(classList, result)

        return result
    }

    return function callTailwindMerge(...classLists) {
        return functionToCall(classLists)
    }
}
