import { createConfigUtils } from './config-utils'
import { Config } from './types'
import { mergeClassList } from './merge-classlist'

type CreateConfigFirst = () => Config
type CreateConfigSubsequent = (config: Config) => Config
type ClassLists = ClassListElement[]
type ClassListElement = string | undefined | null | false
type TailwindMerge = (...classLists: ClassLists) => string
type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createTailwindMerge(
    ...createConfig: [CreateConfigFirst, ...CreateConfigSubsequent[]]
): TailwindMerge {
    let configUtils: ConfigUtils
    let cacheGet: ConfigUtils['cache']['get']
    let cacheSet: ConfigUtils['cache']['set']
    let functionToCall = initTailwindMerge

    function initTailwindMerge(classList: string) {
        const [firstCreateConfig, ...restCreateConfig] = createConfig

        const config = restCreateConfig.reduce(
            (previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig),
            firstCreateConfig()
        )

        configUtils = createConfigUtils(config)
        cacheGet = configUtils.cache.get
        cacheSet = configUtils.cache.set
        functionToCall = tailwindMerge

        return tailwindMerge(classList)
    }

    function tailwindMerge(classList: string) {
        const cachedResult = cacheGet(classList)

        if (cachedResult) {
            return cachedResult
        }

        const result = mergeClassList(classList, configUtils)
        cacheSet(classList, result)

        return result
    }

    return function callTailwindMerge() {
        let classList = ''
        let temp: ClassListElement

        // Credits → https://github.com/lukeed/clsx/blob/v1.1.1/src/index.js
        for (let index = 0; index < arguments.length; index += 1) {
            if ((temp = arguments[index])) {
                classList && (classList += ' ')
                classList += temp
            }
        }

        return functionToCall(classList)
    }
}
