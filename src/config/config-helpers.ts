const customValueRegex = /^\[(.+)\]$/
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const lengthUnitRegex = /\d+(cap|ch|em|rem|ex|lh|rlh|vh|vw|vi|vb|vmin|vmax)/

export function isLength(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    if (customValue) {
        return customValue.startsWith('length:') || lengthUnitRegex.test(customValue)
    }

    return (
        !Number.isNaN(Number(classPart)) ||
        stringLengths.has(classPart) ||
        fractionRegex.test(classPart)
    )
}

export function isInteger(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    if (customValue) {
        return Number.isInteger(Number(customValue))
    }

    return Number.isInteger(Number(classPart))
}

export function isAny() {
    return true
}
