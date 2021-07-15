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
    readonly adjustableClasses: Record<string, readonly ClassNameGroup[]>
    /**
     * Groups of classes that don't have any common starting characters
     * @example [['inline', 'block'], ['absolute', 'relative']]
     */
    readonly standaloneClasses: readonly ClassNameGroup[]
    /**
     * Conflicting classes across groups
     * @example
     * [
     *     {
     *         creators: ['border', 'border-0', ...],
     *         receivers: ['border-t', 'border-t-0', ...]
     *     },
     *     {
     *         creators: ['inset-x', ...],
     *         receivers: ['right-0', 'left-0', ...]
     *     }
     * ]
     */
    readonly conflictingClasses: ClassNameConflict[]
}

type ClassNameGroup = readonly ClassNameDefinition[]
type ClassNameDefinition = string | ClassNameFunction | ClassNameObject
type ClassNameFunction = (classPart: string) => boolean
type ClassNameObject = Record<string, readonly ClassNameDefinition[]>

interface ClassNameConflict {
    /**
     * Group of classes which produce a potential conflict
     */
    readonly creators: ClassNameGroup
    /**
     * Group of classes which should be removed if followed by creator class to resolve conflict
     */
    readonly receivers: ClassNameGroup
}
