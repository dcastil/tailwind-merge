import { Config } from './types'

export const IMPORTANT_MODIFIER = '!'

export function createSplitModifiers(config: Config) {
    const separator = config.separator || ':'

    // splitModifiers inspired by https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
    return function splitModifiers(className: string) {
        let bracketDepth = 0
        let modifiers = []
        let modifierStart = 0

        for (let index = 0; index < className.length; index++) {
            let char = className[index]

            if (bracketDepth === 0 && char === separator[0]) {
                if (
                    separator.length === 1 ||
                    className.slice(index, index + separator.length) === separator
                ) {
                    modifiers.push(className.slice(modifierStart, index))
                    modifierStart = index + separator.length
                }
            }

            if (char === '[') {
                bracketDepth++
            } else if (char === ']') {
                bracketDepth--
            }
        }

        const baseClassNameWithImportantModifier =
            modifiers.length === 0 ? className : className.substring(modifierStart)
        const hasImportantModifier =
            baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
        const baseClassName = hasImportantModifier
            ? baseClassNameWithImportantModifier.substring(1)
            : baseClassNameWithImportantModifier

        return {
            modifiers,
            hasImportantModifier,
            baseClassName,
        }
    }
}

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
export function sortModifiers(modifiers: string[]) {
    if (modifiers.length <= 1) {
        return modifiers
    }

    const sortedModifiers: string[] = []
    let unsortedModifiers: string[] = []

    modifiers.forEach((modifier) => {
        const isArbitraryVariant = modifier[0] === '['

        if (isArbitraryVariant) {
            sortedModifiers.push(...unsortedModifiers.sort(), modifier)
            unsortedModifiers = []
        } else {
            unsortedModifiers.push(modifier)
        }
    })

    sortedModifiers.push(...unsortedModifiers.sort())

    return sortedModifiers
}
