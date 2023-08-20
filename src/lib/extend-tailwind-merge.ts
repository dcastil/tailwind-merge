import { createTailwindMerge } from './create-tailwind-merge'
import { getDefaultConfig } from './default-config'
import { mergeConfigs } from './merge-configs'
import { ConfigExtension, DefaultClassGroupIds, DefaultThemeGroupIds, GenericConfig } from './types'

type CreateConfigSubsequent = (config: GenericConfig) => GenericConfig

export function extendTailwindMerge<
    AdditionalClassGroupIds extends string = never,
    AdditionalThemeGroupIds extends string = never,
>(
    configExtension:
        | ConfigExtension<
              DefaultClassGroupIds | AdditionalClassGroupIds,
              DefaultThemeGroupIds | AdditionalThemeGroupIds
          >
        | CreateConfigSubsequent,
    ...createConfig: CreateConfigSubsequent[]
) {
    return typeof configExtension === 'function'
        ? createTailwindMerge(getDefaultConfig, configExtension, ...createConfig)
        : createTailwindMerge(
              () => mergeConfigs(getDefaultConfig(), configExtension),
              ...createConfig,
          )
}
