import { ConfigUtils } from './config/config-utils'

const SPLIT_CLASSES_REGEX = /\s+/
// Regex is needed so we don't match against colons in labels for custom values like `text-[color:var(--mystery-var)]`
// I'd prefer to use a negative lookbehind for all supported labels, but lookbheinds don't have good browser support yet. More info: https://caniuse.com/js-regexp-lookbehind
const PREFIX_SEPARATOR_REGEX = /:(?![^[]*\])/
const PREFIX_SEPARATOR = ':'

export function mergeClassList(classList: string, configUtils: ConfigUtils) {
    /**
     * Set of classGroupIds in following format:
     * - No prefix: `:classGroupId`
     * - With prefix: `prefix:classGroupId`
     * @example ':standaloneClasses.1'
     * @example 'hover:focus:dynamicClasses.bg.2'
     */
    const classGroupsInConflict = new Set<string>()

    return (
        classList
            .trim()
            .split(SPLIT_CLASSES_REGEX)
            .map((originalClassName) => {
                const prefixes = originalClassName.split(PREFIX_SEPARATOR_REGEX)
                const className = prefixes.pop()!

                const arePrefixesValid = prefixes.every(configUtils.prefix.isValid)
                const classGroupId = arePrefixesValid
                    ? configUtils.class.getGroup(className)
                    : undefined

                if (!classGroupId) {
                    return {
                        isTailwindClass: false as const,
                        originalClassName,
                    }
                }

                prefixes.sort(configUtils.prefix.compare)

                return {
                    isTailwindClass: true as const,
                    prefix: prefixes.join(PREFIX_SEPARATOR),
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
                configUtils.class
                    .getConflictingGroups(classGroupId)
                    .forEach((group) => classGroupsInConflict.add(`${prefix}:${group}`))

                return true
            })
            .reverse()
            .map((parsed) => parsed.originalClassName)
            .join(' ')
    )
}
