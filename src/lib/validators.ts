const arbitraryValueRegex = /^\[(.+)\]$/
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const tshirtUnitRegex = /^(\d+)?(xs|sm|md|lg|xl)$/
const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh)/
// Shadow always begins with x and y offset separated by underscore
const shadowRegex = /^-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/

export function isLength(classPart: string) {
    return (
        !Number.isNaN(Number(classPart)) ||
        stringLengths.has(classPart) ||
        fractionRegex.test(classPart) ||
        isArbitraryLength(classPart)
    )
}

export function isArbitraryLength(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    if (arbitraryValue) {
        return arbitraryValue.startsWith('length:') || lengthUnitRegex.test(arbitraryValue)
    }

    return false
}

export function isArbitrarySize(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    return arbitraryValue ? arbitraryValue.startsWith('size:') : false
}

export function isArbitraryPosition(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    return arbitraryValue ? arbitraryValue.startsWith('position:') : false
}

export function isArbitraryUrl(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    return arbitraryValue
        ? arbitraryValue.startsWith('url(') || arbitraryValue.startsWith('url:')
        : false
}

export function isArbitraryNumber(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    return arbitraryValue
        ? !Number.isNaN(Number(arbitraryValue)) || arbitraryValue.startsWith('number:')
        : false
}

/**
 * @deprecated Will be removed in next major version. Use `isArbitraryNumber` instead.
 */
export const isArbitraryWeight = isArbitraryNumber

export function isInteger(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    if (arbitraryValue) {
        return Number.isInteger(Number(arbitraryValue))
    }

    return Number.isInteger(Number(classPart))
}

export function isArbitraryValue(classPart: string) {
    return arbitraryValueRegex.test(classPart)
}

export function isAny() {
    return true
}

export function isTshirtSize(classPart: string) {
    return tshirtUnitRegex.test(classPart)
}

export function isArbitraryShadow(classPart: string) {
    const arbitraryValue = arbitraryValueRegex.exec(classPart)?.[1]

    if (arbitraryValue) {
        return shadowRegex.test(arbitraryValue)
    }

    return false
}
