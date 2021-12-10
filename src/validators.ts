const customValueRegex = /^\[(.+)\]$/
const fractionRegex = /^\d+\/\d+$/
const stringLengths = new Set(['px', 'full', 'screen'])
const tshirtUnitRegex = /^(\d+)?(xs|sm|md|lg|xl)$/
const lengthUnitRegex = /\d+(%|px|em|rem|vh|vw|pt|pc|in|cm|mm|cap|ch|ex|lh|rlh|vi|vb|vmin|vmax)/

export function isLength(classPart: string) {
    return (
        !Number.isNaN(Number(classPart)) ||
        stringLengths.has(classPart) ||
        fractionRegex.test(classPart) ||
        isCustomLength(classPart)
    )
}

export function isCustomLength(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    if (customValue) {
        return customValue.startsWith('length:') || lengthUnitRegex.test(customValue)
    }

    return false
}

export function isCustomSize(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    return customValue ? customValue.startsWith('size:') : false
}

export function isCustomPosition(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    return customValue ? customValue.startsWith('position:') : false
}

export function isCustomUrl(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    return customValue ? customValue.startsWith('url(') || customValue.startsWith('url:') : false
}

export function isCustomWeight(classPart: string) {
    const customValue = customValueRegex.exec(classPart)?.[1]

    return customValue
        ? !Number.isNaN(Number(customValue)) || customValue.startsWith('weight:')
        : false
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

export function isTshirtSize(classPart: string) {
    return tshirtUnitRegex.test(classPart)
}
