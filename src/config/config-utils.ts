import { Config } from './types'
import { createClassUtils } from './class-utils'
import { createPrefixUtils } from './prefix-utils'

export type ConfigUtils = ReturnType<typeof createConfigUtils>

export function createConfigUtils(config: Config) {
    return {
        prefix: createPrefixUtils(config),
        class: createClassUtils(config),
    }
}
