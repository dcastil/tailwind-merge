import { createConfigUtils } from './config-utils'
import { mergeClassList } from './merge-classlist'
import { ClassNameValue, twJoin } from './tw-join'
import { AnyConfig } from './types'

type CreateConfigFirst = () => AnyConfig
type CreateConfigSubsequent = (config: AnyConfig) => AnyConfig
type TailwindMerge = (...classLists: ClassNameValue[]) => string
type ConfigUtils = ReturnType<typeof createConfigUtils>

// Class lists shorter than this can't contain two classes (the shortest Tailwind
// class is 3 characters, e.g. `m-0`, plus a space separator between classes), so
// there is nothing to merge and caching the result would just waste a cache slot
// on repeated single-class calls like `twMerge('flex')`.
const MIN_CACHEABLE_CLASS_LIST_LENGTH = 7

export const createTailwindMerge = (
    createConfigFirst: CreateConfigFirst,
    ...createConfigRest: CreateConfigSubsequent[]
): TailwindMerge => {
    let configUtils: ConfigUtils
    let cacheGet: ConfigUtils['cache']['get']
    let cacheSet: ConfigUtils['cache']['set']
    let functionToCall: (classList: string) => string

    const initTailwindMerge = (classList: string) => {
        const config = createConfigRest.reduce(
            (previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig),
            createConfigFirst() as AnyConfig,
        )

        configUtils = createConfigUtils(config)
        cacheGet = configUtils.cache.get
        cacheSet = configUtils.cache.set
        functionToCall = tailwindMerge

        return tailwindMerge(classList)
    }

    const tailwindMerge = (classList: string) => {
        if (classList.length < MIN_CACHEABLE_CLASS_LIST_LENGTH) {
            // Too short to contain a merge, so there is nothing to cache
            return mergeClassList(classList, configUtils)
        }

        const cachedResult = cacheGet(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cacheSet(classList, result)

        return result
    }

    functionToCall = initTailwindMerge

    return (...args: ClassNameValue[]) => functionToCall(twJoin(...args))
}
