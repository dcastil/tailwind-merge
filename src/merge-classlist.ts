import { ConfigUtils } from './config-utils'

const SPLIT_CLASSES_REGEX = /\s+/
const IMPORTANT_MODIFIER = '!'
// Regex is needed so we don't match against colons in labels for arbitrary values like `text-[color:var(--mystery-var)]`
// I'd prefer to use a negative lookbehind for all supported labels, but lookbheinds don't have good browser support yet. More info: https://caniuse.com/js-regexp-lookbehind
const PREFIX_SEPARATOR_REGEX = /:(?![^[]*\])/
const PREFIX_SEPARATOR = ':'

export function mergeClassList(classList: string, configUtils: ConfigUtils) {
    const { getClassGroupId, getConflictingClassGroupIds } = configUtils

    /**
     * Set of classGroupIds in following format:
     * `{importantModifier}{variantPrefixes}{classGroupId}`
     * @example 'float'
     * @example 'hover:focus:bg-color'
     * @example '!md:pr'
     */
    const classGroupsInConflict = new Set<string>()

    return (
        classList
            .trim()
            .split(SPLIT_CLASSES_REGEX)
            .map((originalClassName) => {
                const prefixes = originalClassName.split(PREFIX_SEPARATOR_REGEX)
                const classNameWithImportantModifier = prefixes.pop()!

                const hasImportantModifier =
                    classNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
                const className = hasImportantModifier
                    ? classNameWithImportantModifier.substring(1)
                    : classNameWithImportantModifier

                const classGroupId = getClassGroupId(className)

                if (!classGroupId) {
                    return {
                        isTailwindClass: false as const,
                        originalClassName,
                    }
                }

                const variantPrefix =
                    prefixes.length === 0 ? '' : prefixes.sort().concat('').join(PREFIX_SEPARATOR)

                const fullPrefix = hasImportantModifier
                    ? IMPORTANT_MODIFIER + variantPrefix
                    : variantPrefix

                return {
                    isTailwindClass: true as const,
                    prefix: fullPrefix,
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

                const { prefix, classGroupId } = parsed

                const classId = `${prefix}:${classGroupId}`

                if (classGroupsInConflict.has(classId)) {
                    return false
                }

                classGroupsInConflict.add(classId)

                getConflictingClassGroupIds(classGroupId).forEach((group) =>
                    classGroupsInConflict.add(`${prefix}:${group}`)
                )

                return true
            })
            .reverse()
            .map((parsed) => parsed.originalClassName)
            .join(' ')
    )
}
