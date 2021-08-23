const customValueRegex = /^\[(.+)\]$/
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const lengthUnitRegex = /\d+(%|px|em|rem|vh|vw|pt|pc|in|cm|mm|cap|ch|ex|lh|rlh|vi|vb|vmin|vmax)/

export function isLength(classPart: string) {
    return (
        isCustomLength(classPart) ||
        !Number.isNaN(Number(classPart)) ||
        stringLengths.has(classPart) ||
        fractionRegex.test(classPart)
    )
}

export function isCustomLength(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    if (customValue) {
        return customValue.startsWith('length:') || lengthUnitRegex.test(customValue)
    }

    return false
}

export function isInteger(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    if (customValue) {
        return Number.isInteger(Number(customValue))
    }

    return Number.isInteger(Number(classPart))
}

export function isCustomValue(classPart: string) {
    return customValueRegex.test(classPart)
}

export function isAny() {
    return true
}
