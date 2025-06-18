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
import { createLruCache } from './lru-cache'

export interface ClassPartObject {
    nextPart: Map<string, ClassPartObject>
    validators: ClassValidatorObject[]
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
    validators: ClassValidatorObject[] = [],
    classGroupId?: AnyClassGroupIds,
): ClassPartObject => ({
    nextPart,
    validators,
    classGroupId,
})

const CLASS_PART_SEPARATOR = '-'
const EMPTY_VALIDATORS: readonly ClassValidatorObject[] = []
const EMPTY_CONFLICTS: readonly AnyClassGroupIds[] = []
const ARBITRARY_PROPERTY_PREFIX = 'arbitrary..'
const ARBITRARY_PROPERTY_REGEX = /^\[(.+)\]$/

export const createClassGroupUtils = (config: AnyConfig) => {
    const classMap = createClassMap(config)
    const { conflictingClassGroups, conflictingClassGroupModifiers } = config

    // Use the existing LRU cache implementation
    const classGroupCache = createLruCache<string, AnyClassGroupIds | undefined>(config.cacheSize)

    const getClassGroupId = (className: string) => {
        // Check cache first for efficiency
        const cachedResult = classGroupCache.get(className)
        if (cachedResult !== undefined) {
            return cachedResult
        }

        let result: AnyClassGroupIds | undefined

        if (className.startsWith('[')) {
            result = getGroupIdForArbitraryProperty(className)
        } else {
            const classParts = className.split(CLASS_PART_SEPARATOR)
            if (classParts[0] === '' && classParts.length > 1) {
                classParts.shift()
            }
            result = getGroupRecursive(classParts, classMap)
        }

        // Cache result to avoid repeated computation
        classGroupCache.set(className, result)
        return result
    }

    const getConflictingClassGroupIds = (
        classGroupId: AnyClassGroupIds,
        hasPostfixModifier: boolean,
    ): readonly AnyClassGroupIds[] => {
        const conflicts = conflictingClassGroups[classGroupId]
        if (!hasPostfixModifier || !conflictingClassGroupModifiers[classGroupId]) {
            return conflicts || EMPTY_CONFLICTS
        }

        const modifierConflicts = conflictingClassGroupModifiers[classGroupId]!
        if (!conflicts) return modifierConflicts

        // Pre-allocate for better V8 optimization
        const result = new Array(conflicts.length + modifierConflicts.length)
        for (let i = 0; i < conflicts.length; i++) {
            result[i] = conflicts[i]
        }
        for (let i = 0; i < modifierConflicts.length; i++) {
            result[conflicts.length + i] = modifierConflicts[i]
        }
        return result
    }

    return {
        getClassGroupId,
        getConflictingClassGroupIds,
    }
}

const getGroupRecursive = (
    classParts: string[],
    classPartObject: ClassPartObject,
): AnyClassGroupIds | undefined => {
    const len = classParts.length
    if (len === 0) {
        return classPartObject.classGroupId
    }

    const currentClassPart = classParts[0]!
    const nextClassPartObject = classPartObject.nextPart.get(currentClassPart)

    if (nextClassPartObject) {
        const result = getGroupRecursive(classParts.slice(1), nextClassPartObject)
        if (result) return result
    }

    const validators = classPartObject.validators
    if (validators.length === 0) {
        return undefined
    }

    const classRest = classParts.join(CLASS_PART_SEPARATOR)
    const len2 = validators.length

    for (let i = 0; i < len2; i++) {
        const validatorObj = validators[i]!
        if (validatorObj.validator(classRest)) {
            return validatorObj.classGroupId
        }
    }

    return undefined
}

const getGroupIdForArbitraryProperty = (className: string): AnyClassGroupIds | undefined => {
    const match = ARBITRARY_PROPERTY_REGEX.exec(className)
    if (!match?.[1]) return undefined

    const colonIndex = match[1].indexOf(':')
    if (colonIndex === -1) return undefined

    const property = match[1].slice(0, colonIndex)
    return property ? ARBITRARY_PROPERTY_PREFIX + property : undefined
}

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
        const group = classGroups[classGroupId]
        if (group) {
            processClassesRecursively(group, classMap, classGroupId, theme)
        }
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

    if (classDefinition) {
        processObjectDefinition(
            classDefinition as Record<string, ClassGroup<AnyThemeGroupIds>>,
            classPartObject,
            classGroupId,
            theme,
        )
    }
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

    if (classPartObject.validators === EMPTY_VALIDATORS) {
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
    const parts = path.split(CLASS_PART_SEPARATOR)
    const len = parts.length

    for (let i = 0; i < len; i++) {
        const part = parts[i]
        if (!part) continue

        let next = current.nextPart.get(part)
        if (!next) {
            next = createClassPartObject()
            current.nextPart.set(part, next)
        }
        current = next
    }

    return current
}

// Type guard maintains monomorphic check
const isThemeGetter = (func: Function): func is ThemeGetter =>
    'isThemeGetter' in func && (func as ThemeGetter).isThemeGetter === true
