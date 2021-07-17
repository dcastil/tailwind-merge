import { ClassGroupId, Config, DynamicClassValidator } from './types'

interface ClassPartObject {
    nextPart: Record<string, ClassPartObject>
    validators: ClassValidator[]
    classGroupId?: ClassGroupId
}

interface ClassValidator {
    classGroupId: ClassGroupId
    validator: DynamicClassValidator
}

const CLASS_PART_SEPARATOR = '-'

export function createClassUtils(config: Config) {
    const classMap: ClassPartObject = {
        nextPart: {},
        validators: [],
    }

    processStandaloneClasses(config, classMap)

    function getGroup(className: string) {
        const classParts = className.split(CLASS_PART_SEPARATOR)

        // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
        if (classParts[0] === '') {
            classParts.unshift()
        }

        // TODO: Implement processing of dynamic classes

        return getGroupRecursive(classParts, classMap)
    }

    function getConflictingGroups(classGroupId: ClassGroupId) {
        return config.conflictingGroups[classGroupId] || []
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

function processStandaloneClasses(config: Config, classMap: ClassPartObject) {
    config.standaloneClasses.forEach((classGroup, index) => {
        const classPartObject = {
            classGroupId: `standaloneClasses.${index}`,
        } as const

        classGroup.forEach((className) => {
            addToClassMap({
                classPartObject,
                path: className.split(CLASS_PART_SEPARATOR),
                classMap,
            })
        })
    })
}

interface AddToClassMapProps {
    classPartObject: Partial<ClassPartObject>
    path: string[]
    classMap: ClassPartObject
}

function addToClassMap({ classPartObject, path, classMap }: AddToClassMapProps) {
    let currentClassPartObject = classMap

    path.forEach((pathPart) => {
        if (!currentClassPartObject.nextPart[pathPart]) {
            currentClassPartObject.nextPart[pathPart] = {
                nextPart: {},
                validators: [],
            }
        }

        currentClassPartObject = currentClassPartObject.nextPart[pathPart]!
    })

    const { nextPart, validators, classGroupId } = classPartObject

    if (nextPart) {
        currentClassPartObject.nextPart = {
            ...currentClassPartObject.nextPart,
            ...nextPart,
        }
    }

    if (validators) {
        currentClassPartObject.validators = [...currentClassPartObject.validators, ...validators]
    }

    if (classGroupId) {
        currentClassPartObject.classGroupId = classGroupId
    }
}
