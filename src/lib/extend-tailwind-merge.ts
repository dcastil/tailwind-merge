import { createTailwindMerge } from './create-tailwind-merge'
import { getDefaultConfig } from './default-config'
import { mergeConfigs } from './merge-configs'
import { Config, ConfigExtension } from './types'

type CreateConfigSubsequent = (config: Config) => Config

export function extendTailwindMerge(
    configExtension: ConfigExtension | CreateConfigSubsequent,
    ...createConfig: CreateConfigSubsequent[]
) {
    return typeof configExtension === 'function'
        ? createTailwindMerge(getDefaultConfig, configExtension, ...createConfig)
        : createTailwindMerge(
              () => mergeConfigs(getDefaultConfig(), configExtension),
              ...createConfig,
          )
}
