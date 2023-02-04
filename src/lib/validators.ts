const arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/
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
    return getIsArbitraryValue(classPart, 'length', isValueLength)
}

export function isArbitrarySize(classPart: string) {
    return getIsArbitraryValue(classPart, 'size', isValueNever)
}

export function isArbitraryPosition(classPart: string) {
    return getIsArbitraryValue(classPart, 'position', isValueNever)
}

export function isArbitraryUrl(classPart: string) {
    return getIsArbitraryValue(classPart, 'url', isValueUrl)
}

export function isArbitraryNumber(classPart: string) {
    return getIsArbitraryValue(classPart, 'number', isValueNumber)
}

/**
 * @deprecated Will be removed in next major version. Use `isArbitraryNumber` instead.
 */
export const isArbitraryWeight = isArbitraryNumber

export function isInteger(classPart: string) {
    return isValueInteger(classPart) || getIsArbitraryValue(classPart, 'number', isValueInteger)
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
    return getIsArbitraryValue(classPart, '', isValueShadow)
}

function getIsArbitraryValue(
    classPart: string,
    label: string,
    testValue: (value: string) => boolean,
) {
    const result = arbitraryValueRegex.exec(classPart)

    if (result) {
        if (result[1]) {
            return result[1] === label
        }

        return testValue(result[2]!)
    }

    return false
}

function isValueLength(value: string) {
    return lengthUnitRegex.test(value)
}

function isValueNever() {
    return false
}

function isValueUrl(value: string) {
    return value.startsWith('url(')
}

function isValueNumber(value: string) {
    return !Number.isNaN(Number(value))
}

function isValueInteger(value: string) {
    return Number.isInteger(Number(value))
}

function isValueShadow(value: string) {
    return shadowRegex.test(value)
}
