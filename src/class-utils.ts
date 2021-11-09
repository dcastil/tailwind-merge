import { ClassGroupId, Config, ClassGroup, ClassValidator, ThemeObject, ThemeGetter } from './types'

export interface ClassPartObject {
    nextPart: Record<string, ClassPartObject>
    validators: ClassValidatorObject[]
    classGroupId?: ClassGroupId
}

interface ClassValidatorObject {
    classGroupId: ClassGroupId
    validator: ClassValidator
}

const CLASS_PART_SEPARATOR = '-'

export function createClassUtils(config: Config) {
    const classMap = createClassMap(config)

    function getClassGroupId(className: string) {
        const classParts = className.split(CLASS_PART_SEPARATOR)

        // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
        if (classParts[0] === '' && classParts.length !== 1) {
            classParts.shift()
        }

        return getGroupRecursive(classParts, classMap)
    }

    function getConflictingClassGroupIds(classGroupId: ClassGroupId) {
        return config.conflictingClassGroups[classGroupId] || []
    }

    return {
        getClassGroupId,
        getConflictingClassGroupIds,
    }
}

function getGroupRecursive(
    classParts: string[],
    classPartObject: ClassPartObject
): ClassGroupId | undefined {
    if (classParts.length === 0) {
        return classPartObject.classGroupId
    }

    const currentClassPart = classParts[0]!
    const nextClassPartObject = classPartObject.nextPart[currentClassPart]
    const classGroupFromNextClassPart = nextClassPartObject
        ? getGroupRecursive(classParts.slice(1), nextClassPartObject)
        : undefined

    if (classGroupFromNextClassPart) {
        return classGroupFromNextClassPart
    }

    if (classPartObject.validators.length === 0) {
        return undefined
    }

    const classRest = classParts.join(CLASS_PART_SEPARATOR)

    return classPartObject.validators.find(({ validator }) => validator(classRest))?.classGroupId
}

/**
 * Exported for testing only
 */
export function createClassMap(config: Config) {
    const { theme } = config
    const classMap: ClassPartObject = {
        nextPart: {},
        validators: [],
    }

    Object.entries(config.classGroups).forEach(([classGroupId, classGroup]) => {
        processClassesRecursively(classGroup, classMap, classGroupId, theme)
    })

    return classMap
}

function processClassesRecursively(
    classGroup: ClassGroup,
    classPartObject: ClassPartObject,
    classGroupId: ClassGroupId,
    theme: ThemeObject
) {
    classGroup.forEach((classDefinition) => {
        if (typeof classDefinition === 'string') {
            const classPartObjectToEdit =
                classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition)
            classPartObjectToEdit.classGroupId = classGroupId
            return
        }

        if (typeof classDefinition === 'function') {
            if (isThemeGetter(classDefinition)) {
                processClassesRecursively(
                    classDefinition(theme),
                    classPartObject,
                    classGroupId,
                    theme
                )
                return
            }

            classPartObject.validators.push({
                validator: classDefinition,
                classGroupId,
            })

            return
        }

        Object.entries(classDefinition).forEach(([key, classGroup]) => {
            processClassesRecursively(
                classGroup,
                getPart(classPartObject, key),
                classGroupId,
                theme
            )
        })
    })
}

function getPart(classPartObject: ClassPartObject, path: string) {
    let currentClassPartObject = classPartObject

    path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
        if (currentClassPartObject.nextPart[pathPart] === undefined) {
            currentClassPartObject.nextPart[pathPart] = {
                nextPart: {},
                validators: [],
            }
        }

        currentClassPartObject = currentClassPartObject.nextPart[pathPart]!
    })

    return currentClassPartObject
}

function isThemeGetter(func: ClassValidator | ThemeGetter): func is ThemeGetter {
    return (func as ThemeGetter).isThemeGetter
}
