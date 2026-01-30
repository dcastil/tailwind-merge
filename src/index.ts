import {
    isAny,
    isAnyNonArbitrary,
    isArbitraryImage,
    isArbitraryLength,
    isArbitraryNumber,
    isArbitraryPosition,
    isArbitraryShadow,
    isArbitrarySize,
    isArbitraryValue,
    isArbitraryVariable,
    isArbitraryVariableFamilyName,
    isArbitraryVariableImage,
    isArbitraryVariableLength,
    isArbitraryVariablePosition,
    isArbitraryVariableShadow,
    isArbitraryVariableSize,
    isFraction,
    isInteger,
    isNumber,
    isPercent,
    isTshirtSize,
} from './lib/validators'

export { createTailwindMerge } from './lib/create-tailwind-merge'
export { getDefaultConfig } from './lib/default-config'
export { extendTailwindMerge } from './lib/extend-tailwind-merge'
export { fromTheme } from './lib/from-theme'
export { mergeConfigs } from './lib/merge-configs'
export { twJoin, type ClassNameValue } from './lib/tw-join'
export { twMerge } from './lib/tw-merge'
export {
    type ClassValidator,
    type Config,
    type ConfigExtension,
    type DefaultClassGroupIds,
    type DefaultThemeGroupIds,
    type ExperimentalParseClassNameParam,
    type ParsedClassName as ExperimentalParsedClassName,
} from './lib/types'

export const validators = {
    isAny,
    isAnyNonArbitrary,
    isArbitraryImage,
    isArbitraryLength,
    isArbitraryNumber,
    isArbitraryPosition,
    isArbitraryShadow,
    isArbitrarySize,
    isArbitraryValue,
    isArbitraryVariable,
    isArbitraryVariableFamilyName,
    isArbitraryVariableImage,
    isArbitraryVariableLength,
    isArbitraryVariablePosition,
    isArbitraryVariableShadow,
    isArbitraryVariableSize,
    isFraction,
    isInteger,
    isNumber,
    isPercent,
    isTshirtSize,
}
