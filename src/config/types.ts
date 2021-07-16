export interface Config {
    /**
     * Prefixes which can be prepended to Tailwind CSS classes
     * @example ['hover', 'focus']
     */
    readonly prefixes: readonly string[]
    /**
     * Object with definitions of dynamic classes like `mx-auto` or `grid-cols-2`.
     * Keys must be part of class until first `-`-character.
     * @example
     * {
     *     my: [
     *         // Creates group of classes `my-group`, `my-of` and `my-classes`
     *         ['group', 'of', 'classes'],
     *         // Creates group of classes `my-other` and `my-group`.
     *         // Note that `my-group` will never match because that class is defined in preceding group.
     *         ['other', 'group']
     *     ]
     * }
     */
    dynamicClasses: Record<string, readonly DynamicClassGroup[]>
    /**
     * Groups of classes that don't have any common starting characters
     * @example [['inline', 'block'], ['absolute', 'relative']]
     */
    standaloneClasses: readonly StandaloneClassGroup[]
    /**
     * Conflicting classes across groups
     * @example
     * [
     *     {
     *         creators: [['dynamicClasses', 'border', '0']],
     *         receivers: [['dynamicClasses', 'border', '1'], ...]
     *     },
     *     {
     *         creators: [['dynamicClasses', 'inset', '0']],
     *         receivers: [['dynamicClasses', 'right', '0'], ...]
     *     }
     * ]
     */
    conflictingClasses: readonly ClassNameConflict[]
}

type DynamicClassGroup = readonly DynamicClassDefinition[]
type DynamicClassDefinition = string | DynamicClassFunction | DynamicClassObject
type DynamicClassFunction = (classPart: string) => boolean
type DynamicClassObject = Record<string, readonly DynamicClassDefinition[]>
type StandaloneClassGroup = readonly string[]

interface ClassNameConflict {
    /**
     * Group of classes which produce a potential conflict
     */
    creators: readonly ConflictClassGroup[]
    /**
     * Group of classes which should be removed if followed by creator class to resolve conflict
     */
    receivers: readonly ConflictClassGroup[]
}

type ConflictClassGroup = [
    classType: 'dynamicClasses' | 'standaloneClasses',
    keyWithoutDash: string,
    index: `${number}`
]
