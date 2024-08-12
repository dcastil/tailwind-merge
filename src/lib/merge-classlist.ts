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

    let result = ''
    let index = classList.length - 1

    while (index >= 0) {
        while (classList[index] === ' ') {
            index -= 1
        }

        if (index < 0) {
            break
        }

        const nextIndex = classList.lastIndexOf(' ', index)
        const originalClassName = classList.slice(nextIndex + 1, index + 1)

        index = nextIndex

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
                continue
            }

            classGroupId = getClassGroupId(baseClassName)

            if (!classGroupId) {
                result = originalClassName + (result.length > 0 ? ' ' + result : result)
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

        result = originalClassName + (result.length > 0 ? ' ' + result : result)
    }

    return result
}
