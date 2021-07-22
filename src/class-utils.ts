import { ClassGroupId, Config, ClassGroup, ClassValidator } from './types'

interface ClassPartObject {
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
    const classMap: ClassPartObject = {
        nextPart: {},
        validators: [],
    }

    processClassGroups(config, classMap)

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

function processClassGroups(config: Config, classMap: ClassPartObject) {
    Object.entries(config.classGroups).forEach(([classGroupId, classGroup]) => {
        processClassesRecursively(classGroup, classMap, classGroupId)
    })
}

function processClassesRecursively(
    classGroup: ClassGroup,
    classPartObject: ClassPartObject,
    classGroupId: ClassGroupId
) {
    classGroup.forEach((classDefinition) => {
        if (typeof classDefinition === 'string') {
            const classPartObjectToEdit =
                classDefinition === '' ? classPartObject : getPart(classPartObject, classDefinition)
            classPartObjectToEdit.classGroupId = classGroupId
        } else if (typeof classDefinition === 'function') {
            classPartObject.validators.push({
                validator: classDefinition,
                classGroupId,
            })
        } else {
            Object.entries(classDefinition).forEach(([key, classGroup]) => {
                processClassesRecursively(classGroup, getPart(classPartObject, key), classGroupId)
            })
        }
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
