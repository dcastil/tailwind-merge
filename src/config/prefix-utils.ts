import { Config } from './types'

export function createPrefixUtils(config: Config) {
    const prefixToIndexMap = Object.fromEntries(
        config.prefixes.map((prefix, index) => [prefix, index])
    )

    function isValid(maybePrefix: string) {
        return prefixToIndexMap[maybePrefix] !== undefined
    }

    function compare(firstPrefix: string, secondPrefix: string) {
        return prefixToIndexMap[firstPrefix]! - prefixToIndexMap[secondPrefix]!
    }

    return {
        isValid,
        compare,
    }
}
