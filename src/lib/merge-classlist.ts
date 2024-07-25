import { ConfigUtils } from './config-utils'
import { IMPORTANT_MODIFIER, sortModifiers } from './parse-class-name'

const SPLIT_CLASSES_REGEX = /\s+/

export const mergeClassList = (classList: string, configUtils: ConfigUtils) => {
    const { parseClassName, getClassGroupId, getConflictingClassGroupIds } = configUtils

    /**
     * Set of classGroupIds in following format:
     * `{importantModifier}{variantModifiers}{classGroupId}`
     * @example 'float'
     * @example 'hover:focus:bg-color'
     * @example 'md:!pr'
     */
    const classGroupsInConflict = new Set<string>()

    let result = ''

    let currentClass = ''
    for (let i = classList.length - 1; i >= 0; --i) {
        const char = classList[i]!
        const isSpace = SPLIT_CLASSES_REGEX.test(char)
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

        // [TODO]: consider using arrays
        if (classGroupsInConflict.has(classId)) {
            continue
        }

        classGroupsInConflict.add(classId)

        const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier)
        for (let i = 0; i < conflictGroups.length; ++i) {
            const group = conflictGroups[i]!
            classGroupsInConflict.add(modifierId + group)
        }

        result = originalClassName + (result.length > 0 ? ' ' + result : result)
    }

    return result
}
