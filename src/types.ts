export interface Config {
    /**
     * Prefixes which can be prepended to Tailwind CSS classes
     * @example ['hover', 'focus']
     */
    prefixes: readonly Prefix[]
    /**
     * Integer indicating size of LRU cache used for memoizing results.
     * - Cache might be up to twice as big as `cacheSize`
     * - No cache is used for values <= 0
     */
    cacheSize: number
    /**
     * Object with groups of classes.
     * @example
     * {
     *     // Creates group of classes `group`, `of` and `classes`
     *     'group-id': ['group', 'of', 'classes'],
     *     // Creates group of classes `look-at-me-other` and `look-at-me-group`.
     *     'other-group': [{ 'look-at-me': ['other', 'group']}]
     * }
     */
    classGroups: Record<ClassGroupId, ClassGroup>
    /**
     * Conflicting classes across groups.
     * The key is ID of class group which creates conflict, values are IDs of class groups which receive a conflict.
     * A class group is ID is the key of a class group in classGroups object.
     * @example { gap: ['gap-x', 'gap-y'] }
     */
    conflictingClassGroups: Record<ClassGroupId, readonly ClassGroupId[]>
}

export type Prefix = string | Record<string, readonly Prefix[]>
export type ClassGroup = readonly ClassDefinition[]
type ClassDefinition = string | ClassValidator | ClassObject
export type ClassValidator = (classPart: string) => boolean
type ClassObject = Record<string, readonly ClassDefinition[]>

export type ClassGroupId = string
