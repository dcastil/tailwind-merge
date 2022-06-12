import { ConfigUtils } from './config-utils'

const SPLIT_CLASSES_REGEX = /\s+/
const IMPORTANT_MODIFIER = '!'

export function mergeClassList(classList: string, configUtils: ConfigUtils) {
    const { getClassGroupId, getConflictingClassGroupIds } = configUtils

    /**
     * Set of classGroupIds in following format:
     * `{importantModifier}{variantModifiers}{classGroupId}`
     * @example 'float'
     * @example 'hover:focus:bg-color'
     * @example 'md:!pr'
     */
    const classGroupsInConflict = new Set<string>()

    return (
        classList
            .trim()
            .split(SPLIT_CLASSES_REGEX)
            .map((originalClassName) => {
                const { modifiers, hasImportantModifier, baseClassName } =
                    splitModifiers(originalClassName)

                const classGroupId = getClassGroupId(baseClassName)

                if (!classGroupId) {
                    return {
                        isTailwindClass: false as const,
                        originalClassName,
                    }
                }

                const variantModifier = sortModifiers(modifiers).join('')

                const modifierId = hasImportantModifier
                    ? variantModifier + IMPORTANT_MODIFIER
                    : variantModifier

                return {
                    isTailwindClass: true as const,
                    modifierId,
                    classGroupId,
                    originalClassName,
                }
            })
            .reverse()
            // Last class in conflict wins, so we need to filter conflicting classes in reverse order.
            .filter((parsed) => {
                if (!parsed.isTailwindClass) {
                    return true
                }

                const { modifierId, classGroupId } = parsed

                const classId = `${modifierId}${classGroupId}`

                if (classGroupsInConflict.has(classId)) {
                    return false
                }

                classGroupsInConflict.add(classId)

                getConflictingClassGroupIds(classGroupId).forEach((group) =>
                    classGroupsInConflict.add(`${modifierId}${group}`)
                )

                return true
            })
            .reverse()
            .map((parsed) => parsed.originalClassName)
            .join(' ')
    )
}

function splitModifiers(className: string) {
    const modifiers = []

    let bracketDepth = 0
    let modifierStart = 0

    for (const match of className.matchAll(/[:[\]]/g)) {
        if (match[0] === ':') {
            if (bracketDepth === 0) {
                const nextModifierStart = match.index! + 1
                modifiers.push(className.substring(modifierStart, nextModifierStart))
                modifierStart = nextModifierStart
            }
        } else if (match[0] === '[') {
            bracketDepth++
        } else if (match[0] === ']') {
            bracketDepth--
        }
    }

    const baseClassNameWithImportantModifier =
        modifiers.length === 0 ? className : className.substring(modifierStart)
    const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
    const baseClassName = hasImportantModifier
        ? baseClassNameWithImportantModifier.substring(1)
        : baseClassNameWithImportantModifier

    return {
        modifiers,
        hasImportantModifier,
        baseClassName,
    }
}

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it's important to preserve which modifiers are before and after it
 */
function sortModifiers(modifiers: string[]) {
    if (modifiers.length <= 1) {
        return modifiers
    }

    const sortedModifiers = []
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
