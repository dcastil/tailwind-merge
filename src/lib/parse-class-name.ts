import { AnyConfig, ParsedClassName } from './types'

export const IMPORTANT_MODIFIER = '!'

export const createParseClassName = (config: AnyConfig) => {
    const { prefix, separator, experimentalParseClassName } = config
    const isSeparatorSingleCharacter = separator.length === 1
    const firstSeparatorCharacter = separator[0]
    const separatorLength = separator.length

    /**
     * Parse class name into parts.
     *
     * Inspired by `splitAtTopLevelOnly` used in Tailwind CSS
     * @see https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
     */
    let parseClassName = (className: string): ParsedClassName => {
        const modifiers = []

        let bracketDepth = 0
        let parenDepth = 0
        let modifierStart = 0
        let postfixModifierPosition: number | undefined

        for (let index = 0; index < className.length; index++) {
            let currentCharacter = className[index]

            if (bracketDepth === 0 && parenDepth === 0) {
                if (
                    currentCharacter === firstSeparatorCharacter &&
                    (isSeparatorSingleCharacter ||
                        className.slice(index, index + separatorLength) === separator)
                ) {
                    modifiers.push(className.slice(modifierStart, index))
                    modifierStart = index + separatorLength
                    continue
                }

                if (currentCharacter === '/') {
                    postfixModifierPosition = index
                    continue
                }
            }

            if (currentCharacter === '[') {
                bracketDepth++
            } else if (currentCharacter === ']') {
                bracketDepth--
            } else if (currentCharacter === '(') {
                parenDepth++
            } else if (currentCharacter === ')') {
                parenDepth--
            }
        }

        const baseClassNameWithImportantModifier =
            modifiers.length === 0 ? className : className.substring(modifierStart)
        const baseClassName = stripImportantModifier(baseClassNameWithImportantModifier)
        const hasImportantModifier = baseClassName !== baseClassNameWithImportantModifier
        const maybePostfixModifierPosition =
            postfixModifierPosition && postfixModifierPosition > modifierStart
                ? postfixModifierPosition - modifierStart
                : undefined

        return {
            modifiers,
            hasImportantModifier,
            baseClassName,
            maybePostfixModifierPosition,
        }
    }

    if (prefix) {
        const fullPrefix = prefix + separator
        const parseClassNameOriginal = parseClassName
        parseClassName = (className) =>
            className.startsWith(fullPrefix)
                ? parseClassNameOriginal(className.substring(fullPrefix.length))
                : {
                      isExternal: true,
                      modifiers: [],
                      hasImportantModifier: false,
                      baseClassName: className,
                      maybePostfixModifierPosition: undefined,
                  }
    }

    if (experimentalParseClassName) {
        const parseClassNameOriginal = parseClassName
        parseClassName = (className) =>
            experimentalParseClassName({ className, parseClassName: parseClassNameOriginal })
    }

    return parseClassName
}

const positionSensitiveModifiers: Record<string, boolean> = {
    before: true,
    after: true,
    placeholder: true,
    file: true,
    marker: true,
    selection: true,
    'first-line': true,
    'first-letter': true,
    backdrop: true,
    '*': true,
    '**': true,
}

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
export const sortModifiers = (modifiers: string[]) => {
    if (modifiers.length <= 1) {
        return modifiers
    }

    const sortedModifiers: string[] = []
    let unsortedModifiers: string[] = []

    modifiers.forEach((modifier) => {
        const isPositionSensitive = modifier[0] === '[' || positionSensitiveModifiers[modifier]

        if (isPositionSensitive) {
            sortedModifiers.push(...unsortedModifiers.sort(), modifier)
            unsortedModifiers = []
        } else {
            unsortedModifiers.push(modifier)
        }
    })

    sortedModifiers.push(...unsortedModifiers.sort())

    return sortedModifiers
}

const stripImportantModifier = (baseClassName: string) => {
    if (baseClassName.endsWith(IMPORTANT_MODIFIER)) {
        return baseClassName.substring(0, baseClassName.length - 1)
    }

    /**
     * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
     * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
     */
    if (baseClassName.startsWith(IMPORTANT_MODIFIER)) {
        return baseClassName.substring(1)
    }

    return baseClassName
}
