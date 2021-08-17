import { Config, Prefix } from './types'

export function createPrefixUtils(config: Config) {
    const prefixToIndexMap = Object.fromEntries(
        config.prefixes
            .flatMap((prefix) => getPrefixesRecursively('', prefix))
            .map((prefix, index) => [prefix, index])
    )

    function isPrefixValid(maybePrefix: string) {
        return prefixToIndexMap[maybePrefix] !== undefined
    }

    function comparePrefixes(firstPrefix: string, secondPrefix: string) {
        return prefixToIndexMap[firstPrefix]! - prefixToIndexMap[secondPrefix]!
    }

    return {
        isPrefixValid,
        comparePrefixes,
    }
}

function getPrefixesRecursively(path: string, prefixPart: Prefix): string | string[] {
    if (typeof prefixPart === 'string') {
        return path.concat(prefixPart)
    }

    return Object.entries(prefixPart).flatMap(([pathPart, nextPrefixParts]) =>
        nextPrefixParts.flatMap((nextPrefixPart) =>
            getPrefixesRecursively(`${path}${pathPart}-`, nextPrefixPart)
        )
    )
}
