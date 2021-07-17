import { ConfigUtils } from './config/config-utils'

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
            .split(/\s+/)
            .map((originalClassName) => {
                const prefixes = originalClassName.split(PREFIX_SEPARATOR)
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

                const classId = `${parsed.prefix}:${parsed.classGroupId}`

                if (classGroupsInConflict.has(classId)) {
                    return false
                }

                classGroupsInConflict.add(classId)
                // TODO: Add conflictingClasses to classGroupsInConflict

                return true
            })
            .reverse()
            .map((parsed) => parsed.originalClassName)
            .join(' ')
    )
}
