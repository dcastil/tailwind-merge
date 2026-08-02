import { createConfigUtils } from './config-utils'
import { mergeClassList } from './merge-classlist'
import { ClassNameValue, twJoin } from './tw-join'
import { AnyConfig } from './types'

type CreateConfigFirst = () => AnyConfig
type CreateConfigSubsequent = (config: AnyConfig) => AnyConfig
type TailwindMerge = (...classLists: ClassNameValue[]) => string
type ConfigUtils = ReturnType<typeof createConfigUtils>

// The shortest Tailwind class is 3 characters (e.g. `m-0`), so a class list
// shorter than 7 characters (3 + space + 3) can't contain two classes and thus
// no merge. They're returned as-is instead of being parsed and cached.
const MIN_CACHEABLE_CLASS_LIST_LENGTH = 7

// Matches any whitespace that would need normalization by mergeClassList
const HAS_WHITESPACE_REGEX = /\s/

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
            // A single class can't conflict with itself, so it's already the merge
            // result — unless whitespace needs normalizing.
            if (!HAS_WHITESPACE_REGEX.test(classList)) {
                return classList
            }

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
