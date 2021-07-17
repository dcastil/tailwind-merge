import { ClassGroupId, Config, DynamicClassGroup, DynamicClassValidator } from './types'

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

    const processDynamicClasses = createProcessDynamicClasses(config, classMap)

    function getGroup(className: string) {
        const classParts = className.split(CLASS_PART_SEPARATOR)

        // Classes like `-inset-1` produce an empty string as first classPart. We assume that classes for negative values are used correctly and remove it from classParts.
        if (classParts[0] === '' && classParts.length > 1) {
            classParts.shift()
        }

        processDynamicClasses(classParts[0]!)

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
        const classGroupId: ClassGroupId = `standaloneClasses.${index}`

        classGroup.forEach((className) => {
            addToClassPart({
                classPartObject: classMap,
                path: className,
                classGroupId,
            })
        })
    })
}

function createProcessDynamicClasses(config: Config, classMap: ClassPartObject) {
    const { dynamicClasses } = config
    const processedKeys = new Set<string>()

    return function processDynamicClasses(key: string) {
        if (processedKeys.has(key) || dynamicClasses[key] === undefined) {
            return
        }

        const classPartObject = getNextPart(classMap, key)

        dynamicClasses[key]!.forEach((classGroup, index) => {
            processClassesRecursively(classGroup, classPartObject, `dynamicClasses.${key}.${index}`)
        })
    }
}

function processClassesRecursively(
    classGroup: DynamicClassGroup,
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
    validator?: ClassValidator
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
