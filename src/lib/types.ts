export interface Config<ClassGroupIds extends string, ThemeGroupIds extends string>
    extends ConfigStatic,
        ConfigGroups<ClassGroupIds, ThemeGroupIds> {}

interface ConfigStatic {
    /**
     * Integer indicating size of LRU cache used for memoizing results.
     * - Cache might be up to twice as big as `cacheSize`
     * - No cache is used for values <= 0
     */
    cacheSize: number
    /**
     * Prefix added to Tailwind-generated classes
     * @see https://tailwindcss.com/docs/configuration#prefix
     */
    prefix?: string
    /**
     * Custom separator for modifiers in Tailwind classes
     * @see https://tailwindcss.com/docs/configuration#separator
     */
    separator: string
    /**
     * Theme scales used in classGroups.
     * The keys are the same as in the Tailwind config but the values are sometimes defined more broadly.
     */
}

interface ConfigGroups<ClassGroupIds extends string, ThemeGroupIds extends string> {
    /**
     * Theme scales used in classGroups.
     * The keys are the same as in the Tailwind config but the values are sometimes defined more broadly.
     */
    theme: ThemeObject<ThemeGroupIds>
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
    classGroups: Record<ClassGroupIds, ClassGroup<ThemeGroupIds>>
    /**
     * Conflicting classes across groups.
     * The key is ID of class group which creates conflict, values are IDs of class groups which receive a conflict.
     * A class group ID is the key of a class group in classGroups object.
     * @example { gap: ['gap-x', 'gap-y'] }
     */
    conflictingClassGroups: Partial<Record<ClassGroupIds, readonly ClassGroupIds[]>>
    /**
     * Postfix modifiers conflicting with other class groups.
     * A class group ID is the key of a class group in classGroups object.
     * @example { 'font-size': ['leading'] }
     */
    conflictingClassGroupModifiers: Partial<Record<ClassGroupIds, readonly ClassGroupIds[]>>
}

export interface ConfigExtension<ClassGroupIds extends string, ThemeGroupIds extends string>
    extends Partial<ConfigStatic> {
    override?: PartialPartial<ConfigGroups<ClassGroupIds, ThemeGroupIds>>
    extend?: PartialPartial<ConfigGroups<ClassGroupIds, ThemeGroupIds>>
}

type PartialPartial<T> = {
    [P in keyof T]?: Partial<T[P]>
}

export type ThemeObject<ThemeGroupIds extends string> = Record<
    ThemeGroupIds,
    ClassGroup<ThemeGroupIds>
>
export type ClassGroup<ThemeGroupIds extends string> = readonly ClassDefinition<ThemeGroupIds>[]
type ClassDefinition<ThemeGroupIds extends string> =
    | string
    | ClassValidator
    | ThemeGetter
    | ClassObject<ThemeGroupIds>
export type ClassValidator = (classPart: string) => boolean
export interface ThemeGetter {
    (theme: ThemeObject<GenericThemeGroupIds>): ClassGroup<GenericClassGroupIds>
    isThemeGetter: true
}
type ClassObject<ThemeGroupIds extends string> = Record<
    string,
    readonly ClassDefinition<ThemeGroupIds>[]
>

// Hack from https://stackoverflow.com/questions/56687668/a-way-to-disable-type-argument-inference-in-generics/56688073#56688073
export type NoInfer<T> = [T][T extends any ? 0 : never]

/**
 * If you want to use a scale that is not supported in the `ThemeObject` type,
 * consider using `classGroups` instead of `theme`.
 *
 * @see https://github.com/dcastil/tailwind-merge/blob/main/docs/configuration.md#theme
 *      (the list of supported keys may vary between `tailwind-merge` versions)
 */
export type DefaultThemeGroupIds =
    | 'colors'
    | 'spacing'
    | 'blur'
    | 'brightness'
    | 'borderColor'
    | 'borderRadius'
    | 'borderSpacing'
    | 'borderWidth'
    | 'contrast'
    | 'grayscale'
    | 'hueRotate'
    | 'invert'
    | 'gap'
    | 'gradientColorStops'
    | 'gradientColorStopPositions'
    | 'inset'
    | 'margin'
    | 'opacity'
    | 'padding'
    | 'saturate'
    | 'scale'
    | 'sepia'
    | 'skew'
    | 'space'
    | 'translate'

export type DefaultClassGroupIds =
    | 'aspect'
    | 'container'
    | 'columns'
    | 'break-after'
    | 'break-before'
    | 'break-inside'
    | 'box-decoration'
    | 'box'
    | 'display'
    | 'float'
    | 'clear'
    | 'isolation'
    | 'object-fit'
    | 'object-position'
    | 'overflow'
    | 'overflow-x'
    | 'overflow-y'
    | 'overscroll'
    | 'overscroll-x'
    | 'overscroll-y'
    | 'position'
    | 'inset'
    | 'inset-x'
    | 'inset-y'
    | 'start'
    | 'end'
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'visibility'
    | 'z'
    | 'basis'
    | 'flex-direction'
    | 'flex-wrap'
    | 'flex'
    | 'grow'
    | 'shrink'
    | 'order'
    | 'grid-cols'
    | 'col-start-end'
    | 'col-start'
    | 'col-end'
    | 'grid-rows'
    | 'row-start-end'
    | 'row-start'
    | 'row-end'
    | 'grid-flow'
    | 'auto-cols'
    | 'auto-rows'
    | 'gap'
    | 'gap-x'
    | 'gap-y'
    | 'justify-content'
    | 'justify-items'
    | 'justify-self'
    | 'align-content'
    | 'align-items'
    | 'align-self'
    | 'place-content'
    | 'place-items'
    | 'place-self'
    | 'p'
    | 'px'
    | 'py'
    | 'ps'
    | 'pe'
    | 'pt'
    | 'pr'
    | 'pb'
    | 'pl'
    | 'm'
    | 'mx'
    | 'my'
    | 'ms'
    | 'me'
    | 'mt'
    | 'mr'
    | 'mb'
    | 'ml'
    | 'space-x'
    | 'space-x-reverse'
    | 'space-y'
    | 'space-y-reverse'
    | 'w'
    | 'min-w'
    | 'max-w'
    | 'h'
    | 'min-h'
    | 'max-h'
    | 'font-size'
    | 'font-smoothing'
    | 'font-style'
    | 'font-weight'
    | 'font-family'
    | 'fvn-normal'
    | 'fvn-ordinal'
    | 'fvn-slashed-zero'
    | 'fvn-figure'
    | 'fvn-spacing'
    | 'fvn-fraction'
    | 'tracking'
    | 'line-clamp'
    | 'leading'
    | 'list-image'
    | 'list-style-type'
    | 'list-style-position'
    | 'placeholder-color'
    | 'placeholder-opacity'
    | 'text-alignment'
    | 'text-color'
    | 'text-opacity'
    | 'text-decoration'
    | 'text-decoration-style'
    | 'text-decoration-thickness'
    | 'underline-offset'
    | 'text-decoration-color'
    | 'text-transform'
    | 'text-overflow'
    | 'indent'
    | 'vertical-align'
    | 'whitespace'
    | 'break'
    | 'hyphens'
    | 'content'
    | 'bg-attachment'
    | 'bg-clip'
    | 'bg-opacity'
    | 'bg-origin'
    | 'bg-position'
    | 'bg-repeat'
    | 'bg-size'
    | 'bg-image'
    | 'bg-color'
    | 'gradient-from-pos'
    | 'gradient-via-pos'
    | 'gradient-to-pos'
    | 'gradient-from'
    | 'gradient-via'
    | 'gradient-to'
    | 'rounded'
    | 'rounded-s'
    | 'rounded-e'
    | 'rounded-t'
    | 'rounded-r'
    | 'rounded-b'
    | 'rounded-l'
    | 'rounded-ss'
    | 'rounded-se'
    | 'rounded-ee'
    | 'rounded-es'
    | 'rounded-tl'
    | 'rounded-tr'
    | 'rounded-br'
    | 'rounded-bl'
    | 'border-w'
    | 'border-w-x'
    | 'border-w-y'
    | 'border-w-s'
    | 'border-w-e'
    | 'border-w-t'
    | 'border-w-r'
    | 'border-w-b'
    | 'border-w-l'
    | 'border-opacity'
    | 'border-style'
    | 'divide-x'
    | 'divide-x-reverse'
    | 'divide-y'
    | 'divide-y-reverse'
    | 'divide-opacity'
    | 'divide-style'
    | 'border-color'
    | 'border-color-x'
    | 'border-color-y'
    | 'border-color-t'
    | 'border-color-r'
    | 'border-color-b'
    | 'border-color-l'
    | 'divide-color'
    | 'outline-style'
    | 'outline-offset'
    | 'outline-w'
    | 'outline-color'
    | 'ring-w'
    | 'ring-w-inset'
    | 'ring-color'
    | 'ring-opacity'
    | 'ring-offset-w'
    | 'ring-offset-color'
    | 'shadow'
    | 'shadow-color'
    | 'opacity'
    | 'mix-blend'
    | 'bg-blend'
    | 'filter'
    | 'blur'
    | 'brightness'
    | 'contrast'
    | 'drop-shadow'
    | 'grayscale'
    | 'hue-rotate'
    | 'invert'
    | 'saturate'
    | 'sepia'
    | 'backdrop-filter'
    | 'backdrop-blur'
    | 'backdrop-brightness'
    | 'backdrop-contrast'
    | 'backdrop-grayscale'
    | 'backdrop-hue-rotate'
    | 'backdrop-invert'
    | 'backdrop-opacity'
    | 'backdrop-saturate'
    | 'backdrop-sepia'
    | 'border-collapse'
    | 'border-spacing'
    | 'border-spacing-x'
    | 'border-spacing-y'
    | 'table-layout'
    | 'caption'
    | 'transition'
    | 'duration'
    | 'ease'
    | 'delay'
    | 'animate'
    | 'transform'
    | 'scale'
    | 'scale-x'
    | 'scale-y'
    | 'rotate'
    | 'translate-x'
    | 'translate-y'
    | 'skew-x'
    | 'skew-y'
    | 'transform-origin'
    | 'accent'
    | 'appearance'
    | 'cursor'
    | 'caret-color'
    | 'pointer-events'
    | 'resize'
    | 'scroll-behavior'
    | 'scroll-m'
    | 'scroll-mx'
    | 'scroll-my'
    | 'scroll-ms'
    | 'scroll-me'
    | 'scroll-mt'
    | 'scroll-mr'
    | 'scroll-mb'
    | 'scroll-ml'
    | 'scroll-p'
    | 'scroll-px'
    | 'scroll-py'
    | 'scroll-ps'
    | 'scroll-pe'
    | 'scroll-pt'
    | 'scroll-pr'
    | 'scroll-pb'
    | 'scroll-pl'
    | 'snap-align'
    | 'snap-stop'
    | 'snap-type'
    | 'snap-strictness'
    | 'touch'
    | 'select'
    | 'will-change'
    | 'fill'
    | 'stroke-w'
    | 'stroke'
    | 'sr'

export type GenericClassGroupIds = string
export type GenericThemeGroupIds = string

export type GenericConfig = Config<GenericClassGroupIds, GenericThemeGroupIds>
