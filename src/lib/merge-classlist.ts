import { ConfigUtils } from './config-utils'
import { IMPORTANT_MODIFIER, sortModifiers } from './modifier-utils'

const SPLIT_CLASSES_REGEX = /\s+/

export function mergeClassList(classList: string, configUtils: ConfigUtils) {
    const { splitModifiers, getClassGroupId, getConflictingClassGroupIds } = configUtils

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

                const variantModifier = sortModifiers(modifiers).join(':')

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

                const classId = modifierId + classGroupId

                if (classGroupsInConflict.has(classId)) {
                    return false
                }

                classGroupsInConflict.add(classId)

                getConflictingClassGroupIds(classGroupId).forEach((group) =>
                    classGroupsInConflict.add(modifierId + group),
                )

                return true
            })
            .reverse()
            .map((parsed) => parsed.originalClassName)
            .join(' ')
    )
}
