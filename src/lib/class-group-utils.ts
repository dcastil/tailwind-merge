import {
    AnyClassGroupIds,
    AnyConfig,
    AnyThemeGroupIds,
    ClassGroup,
    ClassValidator,
    Config,
    ThemeGetter,
    ThemeObject,
} from './types'
import { concatArrays } from './utils'

export interface ClassPartObject {
    nextPart: Map<string, ClassPartObject>
    validators: ClassValidatorObject[] | null
    classGroupId: AnyClassGroupIds | undefined // Always define optional props for consistent shape
}

interface ClassValidatorObject {
    classGroupId: AnyClassGroupIds
    validator: ClassValidator
}

// Factory function ensures consistent object shapes
const createClassValidatorObject = (
    classGroupId: AnyClassGroupIds,
    validator: ClassValidator,
): ClassValidatorObject => ({
    classGroupId,
    validator,
})

// Factory ensures consistent ClassPartObject shape
const createClassPartObject = (
    nextPart: Map<string, ClassPartObject> = new Map(),
    validators: ClassValidatorObject[] | null = null,
    classGroupId?: AnyClassGroupIds,
): ClassPartObject => ({
    nextPart,
    validators,
    classGroupId,
})


const EMPTY_CONFLICTS: readonly AnyClassGroupIds[] = []
// I use two dots here because one dot is used as prefix for class groups in plugins
const ARBITRARY_PROPERTY_PREFIX = 'arbitrary..'

export const createClassGroupUtils = (config: AnyConfig) => {
    const classMap = createClassMap(config)
    const { conflictingClassGroups, conflictingClassGroupModifiers } = config

    const getClassGroupId = (className: string) => {
        if (className.startsWith('[') && className.endsWith(']')) {
            return getGroupIdForArbitraryProperty(className)
        }

        // Classes like `-inset-1` produce an empty first segment. Skip it (same as split('-')[0] === '').
        const startIndex = className[0] === '-' && className.length > 1 ? 1 : 0

        return getGroupRecursive(className, startIndex, classMap)
    }

    const getConflictingClassGroupIds = (
        classGroupId: AnyClassGroupIds,
        hasPostfixModifier: boolean,
    ): readonly AnyClassGroupIds[] => {
        if (hasPostfixModifier) {
            const modifierConflicts = conflictingClassGroupModifiers[classGroupId]
            const baseConflicts = conflictingClassGroups[classGroupId]

            if (modifierConflicts) {
                if (baseConflicts) {
                    // Merge base conflicts with modifier conflicts
                    return concatArrays(baseConflicts, modifierConflicts)
                }
                // Only modifier conflicts
                return modifierConflicts
            }
            // Fall back to without postfix if no modifier conflicts
            return baseConflicts || EMPTY_CONFLICTS
        }

        return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS
    }

    return {
        getClassGroupId,
        getConflictingClassGroupIds,
    }
}

const getGroupRecursive = (
    className: string,
    startIndex: number,
    classPartObject: ClassPartObject,
): AnyClassGroupIds | undefined => {
    const classNameLength = className.length
    if (startIndex >= classNameLength) {
        return classPartObject.classGroupId
    }

    const hyphenIndex = className.indexOf('-', startIndex)
    const partEnd = hyphenIndex === -1 ? classNameLength : hyphenIndex
    const currentClassPart = className.slice(startIndex, partEnd)
    const nextClassPartObject = classPartObject.nextPart.get(currentClassPart)

    if (nextClassPartObject) {
        const nextStartIndex = hyphenIndex === -1 ? classNameLength : hyphenIndex + 1
        const result = getGroupRecursive(className, nextStartIndex, nextClassPartObject)
        if (result) return result
    }

    const validators = classPartObject.validators
    if (validators === null) {
        return undefined
    }

    const classRest = className.slice(startIndex)
    const validatorsLength = validators.length

    for (let i = 0; i < validatorsLength; i++) {
        const validatorObj = validators[i]!
        if (validatorObj.validator(classRest)) {
            return validatorObj.classGroupId
        }
    }

    return undefined
}

/**
 * Get the class group ID for an arbitrary property.
 *
 * @param className - The class name to get the group ID for. Is expected to be string starting with `[` and ending with `]`.
 */
const getGroupIdForArbitraryProperty = (className: string): AnyClassGroupIds | undefined =>
    className.slice(1, -1).indexOf(':') === -1
        ? undefined
        : (() => {
              const content = className.slice(1, -1)
              const colonIndex = content.indexOf(':')
              const property = content.slice(0, colonIndex)
              return property ? ARBITRARY_PROPERTY_PREFIX + property : undefined
          })()

/**
 * Exported for testing only
 */
export const createClassMap = (config: Config<AnyClassGroupIds, AnyThemeGroupIds>) => {
    const { theme, classGroups } = config
    return processClassGroups(classGroups, theme)
}

// Split into separate functions to maintain monomorphic call sites
const processClassGroups = (
    classGroups: Record<AnyClassGroupIds, ClassGroup<AnyThemeGroupIds>>,
    theme: ThemeObject<AnyThemeGroupIds>,
): ClassPartObject => {
    const classMap = createClassPartObject()

    for (const classGroupId in classGroups) {
        const group = classGroups[classGroupId]!
        processClassesRecursively(group, classMap, classGroupId, theme)
    }

    return classMap
}

const processClassesRecursively = (
    classGroup: ClassGroup<AnyThemeGroupIds>,
    classPartObject: ClassPartObject,
    classGroupId: AnyClassGroupIds,
    theme: ThemeObject<AnyThemeGroupIds>,
) => {
    const len = classGroup.length
    for (let i = 0; i < len; i++) {
        const classDefinition = classGroup[i]!
        processClassDefinition(classDefinition, classPartObject, classGroupId, theme)
    }
}

// Split into separate functions for each type to maintain monomorphic call sites
const processClassDefinition = (
    classDefinition: ClassGroup<AnyThemeGroupIds>[number],
    classPartObject: ClassPartObject,
    classGroupId: AnyClassGroupIds,
    theme: ThemeObject<AnyThemeGroupIds>,
) => {
    if (typeof classDefinition === 'string') {
        processStringDefinition(classDefinition, classPartObject, classGroupId)
        return
    }

    if (typeof classDefinition === 'function') {
        processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme)
        return
    }

    processObjectDefinition(
        classDefinition as Record<string, ClassGroup<AnyThemeGroupIds>>,
        classPartObject,
        classGroupId,
        theme,
    )
}

const processStringDefinition = (
    classDefinition: string,
    classPartObject: ClassPartObject,
    classGroupId: AnyClassGroupIds,
) => {
    const classPartObjectToEdit =
        classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition)
    classPartObjectToEdit.classGroupId = classGroupId
}

const processFunctionDefinition = (
    classDefinition: Function,
    classPartObject: ClassPartObject,
    classGroupId: AnyClassGroupIds,
    theme: ThemeObject<AnyThemeGroupIds>,
) => {
    if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme)
        return
    }

    if (classPartObject.validators === null) {
        classPartObject.validators = []
    }
    classPartObject.validators.push(
        createClassValidatorObject(classGroupId, classDefinition as ClassValidator),
    )
}

const processObjectDefinition = (
    classDefinition: Record<string, ClassGroup<AnyThemeGroupIds>>,
    classPartObject: ClassPartObject,
    classGroupId: AnyClassGroupIds,
    theme: ThemeObject<AnyThemeGroupIds>,
) => {
    const entries = Object.entries(classDefinition)
    const len = entries.length
    for (let i = 0; i < len; i++) {
        const [key, value] = entries[i]!
        processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme)
    }
}

const getPart = (classPartObject: ClassPartObject, path: string): ClassPartObject => {
    let current = classPartObject
    let startIndex = 0
    const pathLength = path.length

    while (startIndex <= pathLength) {
        const hyphenIndex = path.indexOf('-', startIndex)
        const partEnd = hyphenIndex === -1 ? pathLength : hyphenIndex
        const part = path.slice(startIndex, partEnd)

        let next = current.nextPart.get(part)
        if (!next) {
            next = createClassPartObject()
            current.nextPart.set(part, next)
        }
        current = next

        if (hyphenIndex === -1) {
            break
        }
        startIndex = hyphenIndex + 1
    }

    return current
}

// Type guard maintains monomorphic check
const isThemeGetter = (func: Function): func is ThemeGetter =>
    'isThemeGetter' in func && (func as ThemeGetter).isThemeGetter === true
