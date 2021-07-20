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
     * Object with groups of dynamic classes like `mx-auto` or `grid-cols-2`.
     * Keys on first level must be part of class until first `-`-character.
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
    dynamicClasses: Record<string, ObjectOrArray<DynamicClassGroup>>
    /**
     * Groups of classes that don't have any common starting characters
     * @example [['inline', 'block'], ['absolute', 'relative']]
     */
    standaloneClasses: ObjectOrArray<StandaloneClassGroup>
    /**
     * Conflicting classes across groups.
     * The key is class group which creates conflict, values are class groups which receive a conflict.
     * A class group is a string path from the config root to the class group.
     * @example
     * {
     *     'dynamicClasses.gap.2': [
     *         'dynamicClasses.gap.0',
     *         'dynamicClasses.gap.1'
     *     ],
     * }
     */
    conflictingGroups: Record<string, readonly ClassGroupId[]>
}

type ObjectOrArray<T> = Readonly<Record<string, T> | Record<number, T>>
export type DynamicClassGroup = readonly DynamicClassDefinition[]
type DynamicClassDefinition = string | DynamicClassValidator | DynamicClassObject
export type DynamicClassValidator = (classPart: string) => boolean
type DynamicClassObject = Record<string, readonly DynamicClassDefinition[]>
type StandaloneClassGroup = readonly string[]

export type ClassGroupId = `dynamicClasses.${string}.${string}` | `standaloneClasses.${string}`
