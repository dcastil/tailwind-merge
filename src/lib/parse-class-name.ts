import { AnyConfig, ParsedClassName } from './types'

export const IMPORTANT_MODIFIER = '!'

const MODIFIER_SEPARATOR = ':'
const EMPTY_MODIFIERS: string[] = []

// Pre-allocated result object shape for consistency
const createResultObject = (
    modifiers: string[],
    hasImportantModifier: boolean,
    baseClassName: string,
    maybePostfixModifierPosition?: number,
    isExternal?: boolean,
): ParsedClassName => ({
    modifiers,
    hasImportantModifier,
    baseClassName,
    maybePostfixModifierPosition,
    isExternal,
})

export const createParseClassName = (config: AnyConfig) => {
    const { prefix, experimentalParseClassName } = config

    let parseClassName = (className: string): ParsedClassName => {
        // Pre-allocate modifiers array based on likely size
        const separatorCount = (className.match(/:/g) || []).length
        const modifiers = new Array(separatorCount)
        let modifierCount = 0

        let bracketDepth = 0
        let parenDepth = 0
        let modifierStart = 0
        let postfixModifierPosition: number | undefined

        const len = className.length
        for (let index = 0; index < len; index++) {
            const currentCharacter = className[index]

            if (bracketDepth === 0 && parenDepth === 0) {
                if (currentCharacter === MODIFIER_SEPARATOR) {
                    modifiers[modifierCount++] = className.slice(modifierStart, index)
                    modifierStart = index + 1
                    continue
                }

                if (currentCharacter === '/') {
                    postfixModifierPosition = index
                    continue
                }
            }

            if (currentCharacter === '[') bracketDepth++
            else if (currentCharacter === ']') bracketDepth--
            else if (currentCharacter === '(') parenDepth++
            else if (currentCharacter === ')') parenDepth--
        }

        // Trim modifiers array to actual size used
        const finalModifiers =
            modifierCount > 0 ? modifiers.slice(0, modifierCount) : EMPTY_MODIFIERS

        const baseClassNameWithImportantModifier =
            modifierCount === 0 ? className : className.slice(modifierStart)

        // Inline important modifier check
        let baseClassName = baseClassNameWithImportantModifier
        let hasImportantModifier = false

        if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
            baseClassName = baseClassNameWithImportantModifier.slice(0, -1)
            hasImportantModifier = true
        } else if (
            /**
             * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
             * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
             */
            baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
        ) {
            baseClassName = baseClassNameWithImportantModifier.slice(1)
            hasImportantModifier = true
        }

        const maybePostfixModifierPosition =
            postfixModifierPosition && postfixModifierPosition > modifierStart
                ? postfixModifierPosition - modifierStart
                : undefined

        return createResultObject(
            finalModifiers,
            hasImportantModifier,
            baseClassName,
            maybePostfixModifierPosition,
        )
    }

    if (prefix) {
        const fullPrefix = prefix + MODIFIER_SEPARATOR
        const parseClassNameOriginal = parseClassName
        parseClassName = (className: string) =>
            className.startsWith(fullPrefix)
                ? parseClassNameOriginal(className.slice(fullPrefix.length))
                : createResultObject(EMPTY_MODIFIERS, false, className, undefined, true)
    }

    if (experimentalParseClassName) {
        const parseClassNameOriginal = parseClassName
        parseClassName = (className: string) =>
            experimentalParseClassName({ className, parseClassName: parseClassNameOriginal })
    }

    return parseClassName
}
