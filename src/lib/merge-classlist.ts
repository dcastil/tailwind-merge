import { ConfigUtils } from './config-utils'
import { IMPORTANT_MODIFIER, sortModifiers } from './parse-class-name'

export const mergeClassList = (classList: string, configUtils: ConfigUtils) => {
    const { parseClassName, getClassGroupId, getConflictingClassGroupIds } = configUtils

    /**
     * Set of classGroupIds in following format:
     * `{importantModifier}{variantModifiers}{classGroupId}`
     * @example 'float'
     * @example 'hover:focus:bg-color'
     * @example 'md:!pr'
     */
    const classGroupsInConflict: string[] = []
    // const classGroupsInConflict = new Set<string>()

    // let result: string[] = []
    let result = ''

    let currentClass = ''
    for (let i = classList.length - 1; i >= 0; --i) {
        const char = classList[i]!
        // more performant than Regex check - suitable for our case
        const isSpace = char === ' '
        if (!isSpace) {
            currentClass = char + currentClass
            if (i !== 0) continue
        } else if (currentClass.length === 0) {
            continue
        }

        const originalClassName = currentClass
        currentClass = ''

        const { modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition } =
            parseClassName(originalClassName)

        let hasPostfixModifier = Boolean(maybePostfixModifierPosition)
        let classGroupId = getClassGroupId(
            hasPostfixModifier
                ? baseClassName.substring(0, maybePostfixModifierPosition)
                : baseClassName,
        )

        if (!classGroupId) {
            if (!hasPostfixModifier) {
                result = originalClassName + (result.length > 0 ? ' ' + result : result)
                // result.push(originalClassName)
                continue
            }

            classGroupId = getClassGroupId(baseClassName)

            if (!classGroupId) {
                result = originalClassName + (result.length > 0 ? ' ' + result : result)
                // result.push(originalClassName)
                continue
            }

            hasPostfixModifier = false
        }

        const variantModifier = sortModifiers(modifiers).join(':')

        const modifierId = hasImportantModifier
            ? variantModifier + IMPORTANT_MODIFIER
            : variantModifier

        const classId = modifierId + classGroupId

        if (classGroupsInConflict.includes(classId)) {
            continue
        }

        classGroupsInConflict.push(classId)

        const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier)
        for (let i = 0; i < conflictGroups.length; ++i) {
            const group = conflictGroups[i]!
            classGroupsInConflict.push(modifierId + group)
        }

        // result.push(originalClassName)
        result = originalClassName + (result.length > 0 ? ' ' + result : result)
    }

    return result
    // return result.join(' ')
}
