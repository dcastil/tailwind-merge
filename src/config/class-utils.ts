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

    function getGroup(className: string) {
        const classParts = className.split(CLASS_PART_SEPARATOR)

        // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
        if (classParts[0] === '' && classParts.length !== 1) {
            classParts.shift()
        }

        return getGroupRecursive(classParts, classMap)
    }

    function getConflictingGroups(classGroupId: ClassGroupId) {
        return config.conflictingClassGroups[classGroupId] || []
    }

    return {
        getGroup,
        getConflictingGroups,
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
            addToClassPart({
                classPartObject,
                // We default to undefined to set classGroupId on current classPartObject when classDefinition === ''
                path: classDefinition === '' ? undefined : classDefinition,
                classGroupId,
            })
        } else if (typeof classDefinition === 'function') {
            addToClassPart({
                classPartObject,
                validator: {
                    validator: classDefinition,
                    classGroupId,
                },
            })
        } else {
            Object.entries(classDefinition).forEach(([key, classGroup]) => {
                processClassesRecursively(
                    classGroup,
                    getNextPart(classPartObject, key),
                    classGroupId
                )
            })
        }
    })
}

interface AddToClassPartProps {
    classPartObject: ClassPartObject
    path?: string
    validator?: ClassValidatorObject
    classGroupId?: ClassGroupId
}

function addToClassPart({ path, classPartObject, validator, classGroupId }: AddToClassPartProps) {
    let currentClassPartObject = classPartObject

    path?.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
        currentClassPartObject = getNextPart(currentClassPartObject, pathPart)
    })

    if (classGroupId) {
        currentClassPartObject.classGroupId = classGroupId
    }

    if (validator) {
        currentClassPartObject.validators.push(validator)
    }
}

function getNextPart(classPartObject: ClassPartObject, nextPart: string) {
    if (classPartObject.nextPart[nextPart] === undefined) {
        classPartObject.nextPart[nextPart] = {
            nextPart: {},
            validators: [],
        }
    }

    return classPartObject.nextPart[nextPart]!
}
