import { createClassGroupUtils } from './class-group-utils'
import { createLruCache } from './lru-cache'
import { createParseClassName } from './parse-class-name'
import { createSortModifiers } from './sort-modifiers'
import { AnyClassGroupIds, AnyConfig } from './types'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export const createConfigUtils = (config: AnyConfig) => ({
    cache: createLruCache<string, string>(config.cacheSize),
    parseClassName: createParseClassName(config),
    sortModifiers: createSortModifiers(config),
    postfixLookupClassGroupIds: createPostfixLookupClassGroupIds(config),
    ...createClassGroupUtils(config),
})

const createPostfixLookupClassGroupIds = (config: AnyConfig) => {
    const lookup: Partial<Record<AnyClassGroupIds, true>> = Object.create(null)
    const classGroupIds = config.postfixLookupClassGroups

    if (classGroupIds) {
        for (let i = 0; i < classGroupIds.length; i++) {
            lookup[classGroupIds[i]!] = true
        }
    }

    return lookup
}
