export interface Config {
    /**
     * Prefixes which can be prepended to Tailwind CSS classes
     * @example ['hover', 'focus']
     */
    prefixes: readonly string[]
    /**
     * Integer indicating size of LRU cache used for memoizing results.
     * - Cache might be up to twice as big as `cacheSize`
     * - No cache is used for values <= 0
     */
    cacheSize: number
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
     * {
     *     'dynamicClasses.gap.2': [
     *         'dynamicClasses.gap.0',
     *         'dynamicClasses.gap.1'
     *     ],
     * }
     */
    conflictingClasses: Record<ClassGroupId, readonly ClassGroupId[]>
}

type DynamicClassGroup = readonly DynamicClassDefinition[]
type DynamicClassDefinition = string | DynamicClassValidator | DynamicClassObject
export type DynamicClassValidator = (classPart: string) => boolean
type DynamicClassObject = Record<
    /**
     * Group of classes which produce a potential conflict
     */
    string,
    /**
     * Group of classes which should be removed if followed by creator class to resolve conflict
     */
    readonly DynamicClassDefinition[]
>
type StandaloneClassGroup = readonly string[]

type ClassGroupId = `dynamicClasses.${string}.${number}` | `standaloneClasses.${number}`
