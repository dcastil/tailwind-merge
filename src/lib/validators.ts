const arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/
const lengthUnitRegex =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/
// Shadow always begins with x and y offset separated by underscore
const shadowRegex = /^-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/

export function isLength(value: string) {
    return isNumber(value) || stringLengths.has(value) || fractionRegex.test(value)
}

export function isArbitraryLength(value: string) {
    return getIsArbitraryValue(value, 'length', isLengthOnly)
}

export function isNumber(value: string) {
    return !Number.isNaN(Number(value))
}

export function isArbitraryNumber(value: string) {
    return getIsArbitraryValue(value, 'number', isNumber)
}

export function isInteger(value: string) {
    return Number.isInteger(Number(value))
}

export function isArbitraryInteger(value: string) {
    return getIsArbitraryValue(value, 'number', isInteger)
}

export function isPercent(value: string) {
    return value.endsWith('%') && isNumber(value.slice(0, -1))
}

export function isArbitraryValue(value: string) {
    return arbitraryValueRegex.test(value)
}

export function isTshirtSize(value: string) {
    return tshirtUnitRegex.test(value)
}

export function isArbitrarySize(value: string) {
    return getIsArbitraryValue(value, 'size', isNever)
}

export function isArbitraryPosition(value: string) {
    return getIsArbitraryValue(value, 'position', isNever)
}

export function isArbitraryUrl(value: string) {
    return getIsArbitraryValue(value, 'url', isUrl)
}

export function isArbitraryShadow(value: string) {
    return getIsArbitraryValue(value, '', isShadow)
}

export function isAny() {
    return true
}

function isLengthOnly(value: string) {
    return lengthUnitRegex.test(value)
}

function getIsArbitraryValue(value: string, label: string, testValue: (value: string) => boolean) {
    const result = arbitraryValueRegex.exec(value)

    if (result) {
        if (result[1]) {
            return result[1] === label
        }

        return testValue(result[2]!)
    }

    return false
}

function isNever() {
    return false
}

function isUrl(value: string) {
    return value.startsWith('url(')
}

function isShadow(value: string) {
    return shadowRegex.test(value)
}
