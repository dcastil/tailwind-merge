import { fromTheme } from './from-theme'
import { Config, DefaultClassGroupIds, DefaultThemeGroupIds } from './types'
import {
    isAny,
    isAnyNonArbitrary,
    isArbitraryImage,
    isArbitraryLength,
    isArbitraryNumber,
    isArbitraryPosition,
    isArbitraryShadow,
    isArbitrarySize,
    isArbitraryValue,
    isArbitraryVariable,
    isArbitraryVariableFamilyName,
    isArbitraryVariableImage,
    isArbitraryVariableLength,
    isArbitraryVariablePosition,
    isArbitraryVariableShadow,
    isArbitraryVariableSize,
    isFraction,
    isInteger,
    isNumber,
    isPercent,
    isTshirtSize,
} from './validators'

export const getDefaultConfig = () => {
    /**
     * Theme getters for theme variable namespaces
     * @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
     */
    /***/

    const themeColor = fromTheme('color')
    const themeFont = fromTheme('font')
    const themeText = fromTheme('text')
    const themeFontWeight = fromTheme('font-weight')
    const themeTracking = fromTheme('tracking')
    const themeLeading = fromTheme('leading')
    const themeBreakpoint = fromTheme('breakpoint')
    const themeContainer = fromTheme('container')
    const themeSpacing = fromTheme('spacing')
    const themeRadius = fromTheme('radius')
    const themeShadow = fromTheme('shadow')
    const themeInsetShadow = fromTheme('inset-shadow')
    const themeTextShadow = fromTheme('text-shadow')
    const themeDropShadow = fromTheme('drop-shadow')
    const themeBlur = fromTheme('blur')
    const themePerspective = fromTheme('perspective')
    const themeAspect = fromTheme('aspect')
    const themeEase = fromTheme('ease')
    const themeAnimate = fromTheme('animate')

    /**
     * Helpers to avoid repeating the same scales
     *
     * We use functions that create a new array every time they're called instead of static arrays.
     * This ensures that users who modify any scale by mutating the array (e.g. with `array.push(element)`) don't accidentally mutate arrays in other parts of the config.
     */
    /***/

    const scaleBreak = () =>
        ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'] as const
    const scalePosition = () =>
        [
            'center',
            'top',
            'bottom',
            'left',
            'right',
            'top-left',
            // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
            'left-top',
            'top-right',
            // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
            'right-top',
            'bottom-right',
            // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
            'right-bottom',
            'bottom-left',
            // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
            'left-bottom',
        ] as const
    const scalePositionWithArbitrary = () =>
        [...scalePosition(), isArbitraryVariable, isArbitraryValue] as const
    const scaleOverflow = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'] as const
    const scaleOverscroll = () => ['auto', 'contain', 'none'] as const
    const scaleUnambiguousSpacing = () =>
        [isArbitraryVariable, isArbitraryValue, themeSpacing] as const
    const scaleInset = () => [isFraction, 'full', 'auto', ...scaleUnambiguousSpacing()] as const
    const scaleGridTemplateColsRows = () =>
        [isInteger, 'none', 'subgrid', isArbitraryVariable, isArbitraryValue] as const
    const scaleGridColRowStartAndEnd = () =>
        [
            'auto',
            { span: ['full', isInteger, isArbitraryVariable, isArbitraryValue] },
            isInteger,
            isArbitraryVariable,
            isArbitraryValue,
        ] as const
    const scaleGridColRowStartOrEnd = () =>
        [isInteger, 'auto', isArbitraryVariable, isArbitraryValue] as const
    const scaleGridAutoColsRows = () =>
        ['auto', 'min', 'max', 'fr', isArbitraryVariable, isArbitraryValue] as const
    const scaleAlignPrimaryAxis = () =>
        [
            'start',
            'end',
            'center',
            'between',
            'around',
            'evenly',
            'stretch',
            'baseline',
            'center-safe',
            'end-safe',
        ] as const
    const scaleAlignSecondaryAxis = () =>
        ['start', 'end', 'center', 'stretch', 'center-safe', 'end-safe'] as const
    const scaleMargin = () => ['auto', ...scaleUnambiguousSpacing()] as const
    const scaleSizing = () =>
        [
            isFraction,
            'auto',
            'full',
            'dvw',
            'dvh',
            'lvw',
            'lvh',
            'svw',
            'svh',
            'min',
            'max',
            'fit',
            ...scaleUnambiguousSpacing(),
        ] as const
    const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue] as const
    const scaleBgPosition = () =>
        [
            ...scalePosition(),
            isArbitraryVariablePosition,
            isArbitraryPosition,
            { position: [isArbitraryVariable, isArbitraryValue] },
        ] as const
    const scaleBgRepeat = () => ['no-repeat', { repeat: ['', 'x', 'y', 'space', 'round'] }] as const
    const scaleBgSize = () =>
        [
            'auto',
            'cover',
            'contain',
            isArbitraryVariableSize,
            isArbitrarySize,
            { size: [isArbitraryVariable, isArbitraryValue] },
        ] as const
    const scaleGradientStopPosition = () =>
        [isPercent, isArbitraryVariableLength, isArbitraryLength] as const
    const scaleRadius = () =>
        [
            // Deprecated since Tailwind CSS v4.0.0
            '',
            'none',
            'full',
            themeRadius,
            isArbitraryVariable,
            isArbitraryValue,
        ] as const
    const scaleBorderWidth = () =>
        ['', isNumber, isArbitraryVariableLength, isArbitraryLength] as const
    const scaleLineStyle = () => ['solid', 'dashed', 'dotted', 'double'] as const
    const scaleBlendMode = () =>
        [
            'normal',
            'multiply',
            'screen',
            'overlay',
            'darken',
            'lighten',
            'color-dodge',
            'color-burn',
            'hard-light',
            'soft-light',
            'difference',
            'exclusion',
            'hue',
            'saturation',
            'color',
            'luminosity',
        ] as const
    const scaleMaskImagePosition = () =>
        [isNumber, isPercent, isArbitraryVariablePosition, isArbitraryPosition] as const
    const scaleBlur = () =>
        [
            // Deprecated since Tailwind CSS v4.0.0
            '',
            'none',
            themeBlur,
            isArbitraryVariable,
            isArbitraryValue,
        ] as const
    const scaleRotate = () => ['none', isNumber, isArbitraryVariable, isArbitraryValue] as const
    const scaleScale = () => ['none', isNumber, isArbitraryVariable, isArbitraryValue] as const
    const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue] as const
    const scaleTranslate = () => [isFraction, 'full', ...scaleUnambiguousSpacing()] as const

    return {
        cacheSize: 500,
        theme: {
            animate: ['spin', 'ping', 'pulse', 'bounce'],
            aspect: ['video'],
            blur: [isTshirtSize],
            breakpoint: [isTshirtSize],
            color: [isAny],
            container: [isTshirtSize],
            'drop-shadow': [isTshirtSize],
            ease: ['in', 'out', 'in-out'],
            font: [isAnyNonArbitrary],
            'font-weight': [
                'thin',
                'extralight',
                'light',
                'normal',
                'medium',
                'semibold',
                'bold',
                'extrabold',
                'black',
            ],
            'inset-shadow': [isTshirtSize],
            leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
            perspective: ['dramatic', 'near', 'normal', 'midrange', 'distant', 'none'],
            radius: [isTshirtSize],
            shadow: [isTshirtSize],
            spacing: ['px', isNumber],
            text: [isTshirtSize],
            'text-shadow': [isTshirtSize],
            tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
        },
        classGroups: {
            // --------------
            // --- Layout ---
            // --------------

            /**
             * Aspect Ratio
             * @see https://tailwindcss.com/docs/aspect-ratio
             */
            aspect: [
                {
                    aspect: [
                        'auto',
                        'square',
                        isFraction,
                        isArbitraryValue,
                        isArbitraryVariable,
                        themeAspect,
                    ],
                },
            ],
            /**
             * Container
             * @see https://tailwindcss.com/docs/container
             * @deprecated since Tailwind CSS v4.0.0
             */
            container: ['container'],
            /**
             * Columns
             * @see https://tailwindcss.com/docs/columns
             */
            columns: [
                { columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer] },
            ],
            /**
             * Break After
             * @see https://tailwindcss.com/docs/break-after
             */
            'break-after': [{ 'break-after': scaleBreak() }],
            /**
             * Break Before
             * @see https://tailwindcss.com/docs/break-before
             */
            'break-before': [{ 'break-before': scaleBreak() }],
            /**
             * Break Inside
             * @see https://tailwindcss.com/docs/break-inside
             */
            'break-inside': [{ 'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column'] }],
            /**
             * Box Decoration Break
             * @see https://tailwindcss.com/docs/box-decoration-break
             */
            'box-decoration': [{ 'box-decoration': ['slice', 'clone'] }],
            /**
             * Box Sizing
             * @see https://tailwindcss.com/docs/box-sizing
             */
            box: [{ box: ['border', 'content'] }],
            /**
             * Display
             * @see https://tailwindcss.com/docs/display
             */
            display: [
                'block',
                'inline-block',
                'inline',
                'flex',
                'inline-flex',
                'table',
                'inline-table',
                'table-caption',
                'table-cell',
                'table-column',
                'table-column-group',
                'table-footer-group',
                'table-header-group',
                'table-row-group',
                'table-row',
                'flow-root',
                'grid',
                'inline-grid',
                'contents',
                'list-item',
                'hidden',
            ],
            /**
             * Screen Reader Only
             * @see https://tailwindcss.com/docs/display#screen-reader-only
             */
            sr: ['sr-only', 'not-sr-only'],
            /**
             * Floats
             * @see https://tailwindcss.com/docs/float
             */
            float: [{ float: ['right', 'left', 'none', 'start', 'end'] }],
            /**
             * Clear
             * @see https://tailwindcss.com/docs/clear
             */
            clear: [{ clear: ['left', 'right', 'both', 'none', 'start', 'end'] }],
            /**
             * Isolation
             * @see https://tailwindcss.com/docs/isolation
             */
            isolation: ['isolate', 'isolation-auto'],
            /**
             * Object Fit
             * @see https://tailwindcss.com/docs/object-fit
             */
            'object-fit': [{ object: ['contain', 'cover', 'fill', 'none', 'scale-down'] }],
            /**
             * Object Position
             * @see https://tailwindcss.com/docs/object-position
             */
            'object-position': [{ object: scalePositionWithArbitrary() }],
            /**
             * Overflow
             * @see https://tailwindcss.com/docs/overflow
             */
            overflow: [{ overflow: scaleOverflow() }],
            /**
             * Overflow X
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-x': [{ 'overflow-x': scaleOverflow() }],
            /**
             * Overflow Y
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-y': [{ 'overflow-y': scaleOverflow() }],
            /**
             * Overscroll Behavior
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            overscroll: [{ overscroll: scaleOverscroll() }],
            /**
             * Overscroll Behavior X
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-x': [{ 'overscroll-x': scaleOverscroll() }],
            /**
             * Overscroll Behavior Y
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-y': [{ 'overscroll-y': scaleOverscroll() }],
            /**
             * Position
             * @see https://tailwindcss.com/docs/position
             */
            position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            inset: [{ inset: scaleInset() }],
            /**
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-x': [{ 'inset-x': scaleInset() }],
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-y': [{ 'inset-y': scaleInset() }],
            /**
             * Start
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            start: [{ start: scaleInset() }],
            /**
             * End
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            end: [{ end: scaleInset() }],
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            top: [{ top: scaleInset() }],
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            right: [{ right: scaleInset() }],
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            bottom: [{ bottom: scaleInset() }],
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            left: [{ left: scaleInset() }],
            /**
             * Visibility
             * @see https://tailwindcss.com/docs/visibility
             */
            visibility: ['visible', 'invisible', 'collapse'],
            /**
             * Z-Index
             * @see https://tailwindcss.com/docs/z-index
             */
            z: [{ z: [isInteger, 'auto', isArbitraryVariable, isArbitraryValue] }],

            // ------------------------
            // --- Flexbox and Grid ---
            // ------------------------

            /**
             * Flex Basis
             * @see https://tailwindcss.com/docs/flex-basis
             */
            basis: [
                {
                    basis: [
                        isFraction,
                        'full',
                        'auto',
                        themeContainer,
                        ...scaleUnambiguousSpacing(),
                    ],
                },
            ],
            /**
             * Flex Direction
             * @see https://tailwindcss.com/docs/flex-direction
             */
            'flex-direction': [{ flex: ['row', 'row-reverse', 'col', 'col-reverse'] }],
            /**
             * Flex Wrap
             * @see https://tailwindcss.com/docs/flex-wrap
             */
            'flex-wrap': [{ flex: ['nowrap', 'wrap', 'wrap-reverse'] }],
            /**
             * Flex
             * @see https://tailwindcss.com/docs/flex
             */
            flex: [{ flex: [isNumber, isFraction, 'auto', 'initial', 'none', isArbitraryValue] }],
            /**
             * Flex Grow
             * @see https://tailwindcss.com/docs/flex-grow
             */
            grow: [{ grow: ['', isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Flex Shrink
             * @see https://tailwindcss.com/docs/flex-shrink
             */
            shrink: [{ shrink: ['', isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Order
             * @see https://tailwindcss.com/docs/order
             */
            order: [
                {
                    order: [
                        isInteger,
                        'first',
                        'last',
                        'none',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Grid Template Columns
             * @see https://tailwindcss.com/docs/grid-template-columns
             */
            'grid-cols': [{ 'grid-cols': scaleGridTemplateColsRows() }],
            /**
             * Grid Column Start / End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start-end': [{ col: scaleGridColRowStartAndEnd() }],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start': [{ 'col-start': scaleGridColRowStartOrEnd() }],
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-end': [{ 'col-end': scaleGridColRowStartOrEnd() }],
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            'grid-rows': [{ 'grid-rows': scaleGridTemplateColsRows() }],
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start-end': [{ row: scaleGridColRowStartAndEnd() }],
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start': [{ 'row-start': scaleGridColRowStartOrEnd() }],
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-end': [{ 'row-end': scaleGridColRowStartOrEnd() }],
            /**
             * Grid Auto Flow
             * @see https://tailwindcss.com/docs/grid-auto-flow
             */
            'grid-flow': [{ 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] }],
            /**
             * Grid Auto Columns
             * @see https://tailwindcss.com/docs/grid-auto-columns
             */
            'auto-cols': [{ 'auto-cols': scaleGridAutoColsRows() }],
            /**
             * Grid Auto Rows
             * @see https://tailwindcss.com/docs/grid-auto-rows
             */
            'auto-rows': [{ 'auto-rows': scaleGridAutoColsRows() }],
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            gap: [{ gap: scaleUnambiguousSpacing() }],
            /**
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-x': [{ 'gap-x': scaleUnambiguousSpacing() }],
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-y': [{ 'gap-y': scaleUnambiguousSpacing() }],
            /**
             * Justify Content
             * @see https://tailwindcss.com/docs/justify-content
             */
            'justify-content': [{ justify: [...scaleAlignPrimaryAxis(), 'normal'] }],
            /**
             * Justify Items
             * @see https://tailwindcss.com/docs/justify-items
             */
            'justify-items': [{ 'justify-items': [...scaleAlignSecondaryAxis(), 'normal'] }],
            /**
             * Justify Self
             * @see https://tailwindcss.com/docs/justify-self
             */
            'justify-self': [{ 'justify-self': ['auto', ...scaleAlignSecondaryAxis()] }],
            /**
             * Align Content
             * @see https://tailwindcss.com/docs/align-content
             */
            'align-content': [{ content: ['normal', ...scaleAlignPrimaryAxis()] }],
            /**
             * Align Items
             * @see https://tailwindcss.com/docs/align-items
             */
            'align-items': [{ items: [...scaleAlignSecondaryAxis(), { baseline: ['', 'last'] }] }],
            /**
             * Align Self
             * @see https://tailwindcss.com/docs/align-self
             */
            'align-self': [
                { self: ['auto', ...scaleAlignSecondaryAxis(), { baseline: ['', 'last'] }] },
            ],
            /**
             * Place Content
             * @see https://tailwindcss.com/docs/place-content
             */
            'place-content': [{ 'place-content': scaleAlignPrimaryAxis() }],
            /**
             * Place Items
             * @see https://tailwindcss.com/docs/place-items
             */
            'place-items': [{ 'place-items': [...scaleAlignSecondaryAxis(), 'baseline'] }],
            /**
             * Place Self
             * @see https://tailwindcss.com/docs/place-self
             */
            'place-self': [{ 'place-self': ['auto', ...scaleAlignSecondaryAxis()] }],
            // Spacing
            /**
             * Padding
             * @see https://tailwindcss.com/docs/padding
             */
            p: [{ p: scaleUnambiguousSpacing() }],
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            px: [{ px: scaleUnambiguousSpacing() }],
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            py: [{ py: scaleUnambiguousSpacing() }],
            /**
             * Padding Start
             * @see https://tailwindcss.com/docs/padding
             */
            ps: [{ ps: scaleUnambiguousSpacing() }],
            /**
             * Padding End
             * @see https://tailwindcss.com/docs/padding
             */
            pe: [{ pe: scaleUnambiguousSpacing() }],
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            pt: [{ pt: scaleUnambiguousSpacing() }],
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            pr: [{ pr: scaleUnambiguousSpacing() }],
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            pb: [{ pb: scaleUnambiguousSpacing() }],
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            pl: [{ pl: scaleUnambiguousSpacing() }],
            /**
             * Margin
             * @see https://tailwindcss.com/docs/margin
             */
            m: [{ m: scaleMargin() }],
            /**
             * Margin X
             * @see https://tailwindcss.com/docs/margin
             */
            mx: [{ mx: scaleMargin() }],
            /**
             * Margin Y
             * @see https://tailwindcss.com/docs/margin
             */
            my: [{ my: scaleMargin() }],
            /**
             * Margin Start
             * @see https://tailwindcss.com/docs/margin
             */
            ms: [{ ms: scaleMargin() }],
            /**
             * Margin End
             * @see https://tailwindcss.com/docs/margin
             */
            me: [{ me: scaleMargin() }],
            /**
             * Margin Top
             * @see https://tailwindcss.com/docs/margin
             */
            mt: [{ mt: scaleMargin() }],
            /**
             * Margin Right
             * @see https://tailwindcss.com/docs/margin
             */
            mr: [{ mr: scaleMargin() }],
            /**
             * Margin Bottom
             * @see https://tailwindcss.com/docs/margin
             */
            mb: [{ mb: scaleMargin() }],
            /**
             * Margin Left
             * @see https://tailwindcss.com/docs/margin
             */
            ml: [{ ml: scaleMargin() }],
            /**
             * Space Between X
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-x': [{ 'space-x': scaleUnambiguousSpacing() }],
            /**
             * Space Between X Reverse
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-x-reverse': ['space-x-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-y': [{ 'space-y': scaleUnambiguousSpacing() }],
            /**
             * Space Between Y Reverse
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-y-reverse': ['space-y-reverse'],

            // --------------
            // --- Sizing ---
            // --------------

            /**
             * Size
             * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
             */
            size: [{ size: scaleSizing() }],
            /**
             * Width
             * @see https://tailwindcss.com/docs/width
             */
            w: [{ w: [themeContainer, 'screen', ...scaleSizing()] }],
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            'min-w': [
                {
                    'min-w': [
                        themeContainer,
                        'screen',
                        /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
                        'none',
                        ...scaleSizing(),
                    ],
                },
            ],
            /**
             * Max-Width
             * @see https://tailwindcss.com/docs/max-width
             */
            'max-w': [
                {
                    'max-w': [
                        themeContainer,
                        'screen',
                        'none',
                        /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
                        'prose',
                        /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
                        { screen: [themeBreakpoint] },
                        ...scaleSizing(),
                    ],
                },
            ],
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            h: [{ h: ['screen', 'lh', ...scaleSizing()] }],
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            'min-h': [{ 'min-h': ['screen', 'lh', 'none', ...scaleSizing()] }],
            /**
             * Max-Height
             * @see https://tailwindcss.com/docs/max-height
             */
            'max-h': [{ 'max-h': ['screen', 'lh', ...scaleSizing()] }],

            // ------------------
            // --- Typography ---
            // ------------------

            /**
             * Font Size
             * @see https://tailwindcss.com/docs/font-size
             */
            'font-size': [
                { text: ['base', themeText, isArbitraryVariableLength, isArbitraryLength] },
            ],
            /**
             * Font Smoothing
             * @see https://tailwindcss.com/docs/font-smoothing
             */
            'font-smoothing': ['antialiased', 'subpixel-antialiased'],
            /**
             * Font Style
             * @see https://tailwindcss.com/docs/font-style
             */
            'font-style': ['italic', 'not-italic'],
            /**
             * Font Weight
             * @see https://tailwindcss.com/docs/font-weight
             */
            'font-weight': [{ font: [themeFontWeight, isArbitraryVariable, isArbitraryNumber] }],
            /**
             * Font Stretch
             * @see https://tailwindcss.com/docs/font-stretch
             */
            'font-stretch': [
                {
                    'font-stretch': [
                        'ultra-condensed',
                        'extra-condensed',
                        'condensed',
                        'semi-condensed',
                        'normal',
                        'semi-expanded',
                        'expanded',
                        'extra-expanded',
                        'ultra-expanded',
                        isPercent,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Font Family
             * @see https://tailwindcss.com/docs/font-family
             */
            'font-family': [{ font: [isArbitraryVariableFamilyName, isArbitraryValue, themeFont] }],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-normal': ['normal-nums'],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-ordinal': ['ordinal'],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-slashed-zero': ['slashed-zero'],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-figure': ['lining-nums', 'oldstyle-nums'],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-spacing': ['proportional-nums', 'tabular-nums'],
            /**
             * Font Variant Numeric
             * @see https://tailwindcss.com/docs/font-variant-numeric
             */
            'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
            /**
             * Letter Spacing
             * @see https://tailwindcss.com/docs/letter-spacing
             */
            tracking: [{ tracking: [themeTracking, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Line Clamp
             * @see https://tailwindcss.com/docs/line-clamp
             */
            'line-clamp': [
                { 'line-clamp': [isNumber, 'none', isArbitraryVariable, isArbitraryNumber] },
            ],
            /**
             * Line Height
             * @see https://tailwindcss.com/docs/line-height
             */
            leading: [
                {
                    leading: [
                        /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
                        themeLeading,
                        ...scaleUnambiguousSpacing(),
                    ],
                },
            ],
            /**
             * List Style Image
             * @see https://tailwindcss.com/docs/list-style-image
             */
            'list-image': [{ 'list-image': ['none', isArbitraryVariable, isArbitraryValue] }],
            /**
             * List Style Position
             * @see https://tailwindcss.com/docs/list-style-position
             */
            'list-style-position': [{ list: ['inside', 'outside'] }],
            /**
             * List Style Type
             * @see https://tailwindcss.com/docs/list-style-type
             */
            'list-style-type': [
                { list: ['disc', 'decimal', 'none', isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Text Alignment
             * @see https://tailwindcss.com/docs/text-align
             */
            'text-alignment': [{ text: ['left', 'center', 'right', 'justify', 'start', 'end'] }],
            /**
             * Placeholder Color
             * @deprecated since Tailwind CSS v3.0.0
             * @see https://v3.tailwindcss.com/docs/placeholder-color
             */
            'placeholder-color': [{ placeholder: scaleColor() }],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            'text-color': [{ text: scaleColor() }],
            /**
             * Text Decoration
             * @see https://tailwindcss.com/docs/text-decoration
             */
            'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
            /**
             * Text Decoration Style
             * @see https://tailwindcss.com/docs/text-decoration-style
             */
            'text-decoration-style': [{ decoration: [...scaleLineStyle(), 'wavy'] }],
            /**
             * Text Decoration Thickness
             * @see https://tailwindcss.com/docs/text-decoration-thickness
             */
            'text-decoration-thickness': [
                {
                    decoration: [
                        isNumber,
                        'from-font',
                        'auto',
                        isArbitraryVariable,
                        isArbitraryLength,
                    ],
                },
            ],
            /**
             * Text Decoration Color
             * @see https://tailwindcss.com/docs/text-decoration-color
             */
            'text-decoration-color': [{ decoration: scaleColor() }],
            /**
             * Text Underline Offset
             * @see https://tailwindcss.com/docs/text-underline-offset
             */
            'underline-offset': [
                { 'underline-offset': [isNumber, 'auto', isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Text Transform
             * @see https://tailwindcss.com/docs/text-transform
             */
            'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
            /**
             * Text Overflow
             * @see https://tailwindcss.com/docs/text-overflow
             */
            'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
            /**
             * Text Wrap
             * @see https://tailwindcss.com/docs/text-wrap
             */
            'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
            /**
             * Text Indent
             * @see https://tailwindcss.com/docs/text-indent
             */
            indent: [{ indent: scaleUnambiguousSpacing() }],
            /**
             * Vertical Alignment
             * @see https://tailwindcss.com/docs/vertical-align
             */
            'vertical-align': [
                {
                    align: [
                        'baseline',
                        'top',
                        'middle',
                        'bottom',
                        'text-top',
                        'text-bottom',
                        'sub',
                        'super',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Whitespace
             * @see https://tailwindcss.com/docs/whitespace
             */
            whitespace: [
                { whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces'] },
            ],
            /**
             * Word Break
             * @see https://tailwindcss.com/docs/word-break
             */
            break: [{ break: ['normal', 'words', 'all', 'keep'] }],
            /**
             * Overflow Wrap
             * @see https://tailwindcss.com/docs/overflow-wrap
             */
            wrap: [{ wrap: ['break-word', 'anywhere', 'normal'] }],
            /**
             * Hyphens
             * @see https://tailwindcss.com/docs/hyphens
             */
            hyphens: [{ hyphens: ['none', 'manual', 'auto'] }],
            /**
             * Content
             * @see https://tailwindcss.com/docs/content
             */
            content: [{ content: ['none', isArbitraryVariable, isArbitraryValue] }],

            // -------------------
            // --- Backgrounds ---
            // -------------------

            /**
             * Background Attachment
             * @see https://tailwindcss.com/docs/background-attachment
             */
            'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
            /**
             * Background Clip
             * @see https://tailwindcss.com/docs/background-clip
             */
            'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
            /**
             * Background Origin
             * @see https://tailwindcss.com/docs/background-origin
             */
            'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
            /**
             * Background Position
             * @see https://tailwindcss.com/docs/background-position
             */
            'bg-position': [{ bg: scaleBgPosition() }],
            /**
             * Background Repeat
             * @see https://tailwindcss.com/docs/background-repeat
             */
            'bg-repeat': [{ bg: scaleBgRepeat() }],
            /**
             * Background Size
             * @see https://tailwindcss.com/docs/background-size
             */
            'bg-size': [{ bg: scaleBgSize() }],
            /**
             * Background Image
             * @see https://tailwindcss.com/docs/background-image
             */
            'bg-image': [
                {
                    bg: [
                        'none',
                        {
                            linear: [
                                { to: ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
                                isInteger,
                                isArbitraryVariable,
                                isArbitraryValue,
                            ],
                            radial: ['', isArbitraryVariable, isArbitraryValue],
                            conic: [isInteger, isArbitraryVariable, isArbitraryValue],
                        },
                        isArbitraryVariableImage,
                        isArbitraryImage,
                    ],
                },
            ],
            /**
             * Background Color
             * @see https://tailwindcss.com/docs/background-color
             */
            'bg-color': [{ bg: scaleColor() }],
            /**
             * Gradient Color Stops From Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from-pos': [{ from: scaleGradientStopPosition() }],
            /**
             * Gradient Color Stops Via Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via-pos': [{ via: scaleGradientStopPosition() }],
            /**
             * Gradient Color Stops To Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to-pos': [{ to: scaleGradientStopPosition() }],
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from': [{ from: scaleColor() }],
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via': [{ via: scaleColor() }],
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to': [{ to: scaleColor() }],

            // ---------------
            // --- Borders ---
            // ---------------

            /**
             * Border Radius
             * @see https://tailwindcss.com/docs/border-radius
             */
            rounded: [{ rounded: scaleRadius() }],
            /**
             * Border Radius Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-s': [{ 'rounded-s': scaleRadius() }],
            /**
             * Border Radius End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-e': [{ 'rounded-e': scaleRadius() }],
            /**
             * Border Radius Top
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-t': [{ 'rounded-t': scaleRadius() }],
            /**
             * Border Radius Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-r': [{ 'rounded-r': scaleRadius() }],
            /**
             * Border Radius Bottom
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-b': [{ 'rounded-b': scaleRadius() }],
            /**
             * Border Radius Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-l': [{ 'rounded-l': scaleRadius() }],
            /**
             * Border Radius Start Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-ss': [{ 'rounded-ss': scaleRadius() }],
            /**
             * Border Radius Start End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-se': [{ 'rounded-se': scaleRadius() }],
            /**
             * Border Radius End End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-ee': [{ 'rounded-ee': scaleRadius() }],
            /**
             * Border Radius End Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-es': [{ 'rounded-es': scaleRadius() }],
            /**
             * Border Radius Top Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tl': [{ 'rounded-tl': scaleRadius() }],
            /**
             * Border Radius Top Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tr': [{ 'rounded-tr': scaleRadius() }],
            /**
             * Border Radius Bottom Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-br': [{ 'rounded-br': scaleRadius() }],
            /**
             * Border Radius Bottom Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-bl': [{ 'rounded-bl': scaleRadius() }],
            /**
             * Border Width
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w': [{ border: scaleBorderWidth() }],
            /**
             * Border Width X
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-x': [{ 'border-x': scaleBorderWidth() }],
            /**
             * Border Width Y
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-y': [{ 'border-y': scaleBorderWidth() }],
            /**
             * Border Width Start
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-s': [{ 'border-s': scaleBorderWidth() }],
            /**
             * Border Width End
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-e': [{ 'border-e': scaleBorderWidth() }],
            /**
             * Border Width Top
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-t': [{ 'border-t': scaleBorderWidth() }],
            /**
             * Border Width Right
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-r': [{ 'border-r': scaleBorderWidth() }],
            /**
             * Border Width Bottom
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-b': [{ 'border-b': scaleBorderWidth() }],
            /**
             * Border Width Left
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-l': [{ 'border-l': scaleBorderWidth() }],
            /**
             * Divide Width X
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-x': [{ 'divide-x': scaleBorderWidth() }],
            /**
             * Divide Width X Reverse
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-x-reverse': ['divide-x-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-y': [{ 'divide-y': scaleBorderWidth() }],
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-y-reverse': ['divide-y-reverse'],
            /**
             * Border Style
             * @see https://tailwindcss.com/docs/border-style
             */
            'border-style': [{ border: [...scaleLineStyle(), 'hidden', 'none'] }],
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
             */
            'divide-style': [{ divide: [...scaleLineStyle(), 'hidden', 'none'] }],
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color': [{ border: scaleColor() }],
            /**
             * Border Color X
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-x': [{ 'border-x': scaleColor() }],
            /**
             * Border Color Y
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-y': [{ 'border-y': scaleColor() }],
            /**
             * Border Color S
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-s': [{ 'border-s': scaleColor() }],
            /**
             * Border Color E
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-e': [{ 'border-e': scaleColor() }],
            /**
             * Border Color Top
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-t': [{ 'border-t': scaleColor() }],
            /**
             * Border Color Right
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-r': [{ 'border-r': scaleColor() }],
            /**
             * Border Color Bottom
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-b': [{ 'border-b': scaleColor() }],
            /**
             * Border Color Left
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-l': [{ 'border-l': scaleColor() }],
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            'divide-color': [{ divide: scaleColor() }],
            /**
             * Outline Style
             * @see https://tailwindcss.com/docs/outline-style
             */
            'outline-style': [{ outline: [...scaleLineStyle(), 'none', 'hidden'] }],
            /**
             * Outline Offset
             * @see https://tailwindcss.com/docs/outline-offset
             */
            'outline-offset': [
                { 'outline-offset': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Outline Width
             * @see https://tailwindcss.com/docs/outline-width
             */
            'outline-w': [
                { outline: ['', isNumber, isArbitraryVariableLength, isArbitraryLength] },
            ],
            /**
             * Outline Color
             * @see https://tailwindcss.com/docs/outline-color
             */
            'outline-color': [{ outline: scaleColor() }],

            // ---------------
            // --- Effects ---
            // ---------------

            /**
             * Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow
             */
            shadow: [
                {
                    shadow: [
                        // Deprecated since Tailwind CSS v4.0.0
                        '',
                        'none',
                        themeShadow,
                        isArbitraryVariableShadow,
                        isArbitraryShadow,
                    ],
                },
            ],
            /**
             * Box Shadow Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
             */
            'shadow-color': [{ shadow: scaleColor() }],
            /**
             * Inset Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
             */
            'inset-shadow': [
                {
                    'inset-shadow': [
                        'none',
                        themeInsetShadow,
                        isArbitraryVariableShadow,
                        isArbitraryShadow,
                    ],
                },
            ],
            /**
             * Inset Box Shadow Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
             */
            'inset-shadow-color': [{ 'inset-shadow': scaleColor() }],
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
             */
            'ring-w': [{ ring: scaleBorderWidth() }],
            /**
             * Ring Width Inset
             * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
             * @deprecated since Tailwind CSS v4.0.0
             * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
             */
            'ring-w-inset': ['ring-inset'],
            /**
             * Ring Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
             */
            'ring-color': [{ ring: scaleColor() }],
            /**
             * Ring Offset Width
             * @see https://v3.tailwindcss.com/docs/ring-offset-width
             * @deprecated since Tailwind CSS v4.0.0
             * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
             */
            'ring-offset-w': [{ 'ring-offset': [isNumber, isArbitraryLength] }],
            /**
             * Ring Offset Color
             * @see https://v3.tailwindcss.com/docs/ring-offset-color
             * @deprecated since Tailwind CSS v4.0.0
             * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
             */
            'ring-offset-color': [{ 'ring-offset': scaleColor() }],
            /**
             * Inset Ring Width
             * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
             */
            'inset-ring-w': [{ 'inset-ring': scaleBorderWidth() }],
            /**
             * Inset Ring Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
             */
            'inset-ring-color': [{ 'inset-ring': scaleColor() }],
            /**
             * Text Shadow
             * @see https://tailwindcss.com/docs/text-shadow
             */
            'text-shadow': [
                {
                    'text-shadow': [
                        'none',
                        themeTextShadow,
                        isArbitraryVariableShadow,
                        isArbitraryShadow,
                    ],
                },
            ],
            /**
             * Text Shadow Color
             * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
             */
            'text-shadow-color': [{ 'text-shadow': scaleColor() }],
            /**
             * Opacity
             * @see https://tailwindcss.com/docs/opacity
             */
            opacity: [{ opacity: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Mix Blend Mode
             * @see https://tailwindcss.com/docs/mix-blend-mode
             */
            'mix-blend': [{ 'mix-blend': [...scaleBlendMode(), 'plus-darker', 'plus-lighter'] }],
            /**
             * Background Blend Mode
             * @see https://tailwindcss.com/docs/background-blend-mode
             */
            'bg-blend': [{ 'bg-blend': scaleBlendMode() }],
            /**
             * Mask Clip
             * @see https://tailwindcss.com/docs/mask-clip
             */
            'mask-clip': [
                { 'mask-clip': ['border', 'padding', 'content', 'fill', 'stroke', 'view'] },
                'mask-no-clip',
            ],
            /**
             * Mask Composite
             * @see https://tailwindcss.com/docs/mask-composite
             */
            'mask-composite': [{ mask: ['add', 'subtract', 'intersect', 'exclude'] }],
            /**
             * Mask Image
             * @see https://tailwindcss.com/docs/mask-image
             */
            'mask-image-linear-pos': [{ 'mask-linear': [isNumber] }],
            'mask-image-linear-from-pos': [{ 'mask-linear-from': scaleMaskImagePosition() }],
            'mask-image-linear-to-pos': [{ 'mask-linear-to': scaleMaskImagePosition() }],
            'mask-image-linear-from-color': [{ 'mask-linear-from': scaleColor() }],
            'mask-image-linear-to-color': [{ 'mask-linear-to': scaleColor() }],
            'mask-image-t-from-pos': [{ 'mask-t-from': scaleMaskImagePosition() }],
            'mask-image-t-to-pos': [{ 'mask-t-to': scaleMaskImagePosition() }],
            'mask-image-t-from-color': [{ 'mask-t-from': scaleColor() }],
            'mask-image-t-to-color': [{ 'mask-t-to': scaleColor() }],
            'mask-image-r-from-pos': [{ 'mask-r-from': scaleMaskImagePosition() }],
            'mask-image-r-to-pos': [{ 'mask-r-to': scaleMaskImagePosition() }],
            'mask-image-r-from-color': [{ 'mask-r-from': scaleColor() }],
            'mask-image-r-to-color': [{ 'mask-r-to': scaleColor() }],
            'mask-image-b-from-pos': [{ 'mask-b-from': scaleMaskImagePosition() }],
            'mask-image-b-to-pos': [{ 'mask-b-to': scaleMaskImagePosition() }],
            'mask-image-b-from-color': [{ 'mask-b-from': scaleColor() }],
            'mask-image-b-to-color': [{ 'mask-b-to': scaleColor() }],
            'mask-image-l-from-pos': [{ 'mask-l-from': scaleMaskImagePosition() }],
            'mask-image-l-to-pos': [{ 'mask-l-to': scaleMaskImagePosition() }],
            'mask-image-l-from-color': [{ 'mask-l-from': scaleColor() }],
            'mask-image-l-to-color': [{ 'mask-l-to': scaleColor() }],
            'mask-image-x-from-pos': [{ 'mask-x-from': scaleMaskImagePosition() }],
            'mask-image-x-to-pos': [{ 'mask-x-to': scaleMaskImagePosition() }],
            'mask-image-x-from-color': [{ 'mask-x-from': scaleColor() }],
            'mask-image-x-to-color': [{ 'mask-x-to': scaleColor() }],
            'mask-image-y-from-pos': [{ 'mask-y-from': scaleMaskImagePosition() }],
            'mask-image-y-to-pos': [{ 'mask-y-to': scaleMaskImagePosition() }],
            'mask-image-y-from-color': [{ 'mask-y-from': scaleColor() }],
            'mask-image-y-to-color': [{ 'mask-y-to': scaleColor() }],
            'mask-image-radial': [{ 'mask-radial': [isArbitraryVariable, isArbitraryValue] }],
            'mask-image-radial-from-pos': [{ 'mask-radial-from': scaleMaskImagePosition() }],
            'mask-image-radial-to-pos': [{ 'mask-radial-to': scaleMaskImagePosition() }],
            'mask-image-radial-from-color': [{ 'mask-radial-from': scaleColor() }],
            'mask-image-radial-to-color': [{ 'mask-radial-to': scaleColor() }],
            'mask-image-radial-shape': [{ 'mask-radial': ['circle', 'ellipse'] }],
            'mask-image-radial-size': [
                { 'mask-radial': [{ closest: ['side', 'corner'], farthest: ['side', 'corner'] }] },
            ],
            'mask-image-radial-pos': [{ 'mask-radial-at': scalePosition() }],
            'mask-image-conic-pos': [{ 'mask-conic': [isNumber] }],
            'mask-image-conic-from-pos': [{ 'mask-conic-from': scaleMaskImagePosition() }],
            'mask-image-conic-to-pos': [{ 'mask-conic-to': scaleMaskImagePosition() }],
            'mask-image-conic-from-color': [{ 'mask-conic-from': scaleColor() }],
            'mask-image-conic-to-color': [{ 'mask-conic-to': scaleColor() }],
            /**
             * Mask Mode
             * @see https://tailwindcss.com/docs/mask-mode
             */
            'mask-mode': [{ mask: ['alpha', 'luminance', 'match'] }],
            /**
             * Mask Origin
             * @see https://tailwindcss.com/docs/mask-origin
             */
            'mask-origin': [
                { 'mask-origin': ['border', 'padding', 'content', 'fill', 'stroke', 'view'] },
            ],
            /**
             * Mask Position
             * @see https://tailwindcss.com/docs/mask-position
             */
            'mask-position': [{ mask: scaleBgPosition() }],
            /**
             * Mask Repeat
             * @see https://tailwindcss.com/docs/mask-repeat
             */
            'mask-repeat': [{ mask: scaleBgRepeat() }],
            /**
             * Mask Size
             * @see https://tailwindcss.com/docs/mask-size
             */
            'mask-size': [{ mask: scaleBgSize() }],
            /**
             * Mask Type
             * @see https://tailwindcss.com/docs/mask-type
             */
            'mask-type': [{ 'mask-type': ['alpha', 'luminance'] }],
            /**
             * Mask Image
             * @see https://tailwindcss.com/docs/mask-image
             */
            'mask-image': [{ mask: ['none', isArbitraryVariable, isArbitraryValue] }],

            // ---------------
            // --- Filters ---
            // ---------------

            /**
             * Filter
             * @see https://tailwindcss.com/docs/filter
             */
            filter: [
                {
                    filter: [
                        // Deprecated since Tailwind CSS v3.0.0
                        '',
                        'none',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Blur
             * @see https://tailwindcss.com/docs/blur
             */
            blur: [{ blur: scaleBlur() }],
            /**
             * Brightness
             * @see https://tailwindcss.com/docs/brightness
             */
            brightness: [{ brightness: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Contrast
             * @see https://tailwindcss.com/docs/contrast
             */
            contrast: [{ contrast: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Drop Shadow
             * @see https://tailwindcss.com/docs/drop-shadow
             */
            'drop-shadow': [
                {
                    'drop-shadow': [
                        // Deprecated since Tailwind CSS v4.0.0
                        '',
                        'none',
                        themeDropShadow,
                        isArbitraryVariableShadow,
                        isArbitraryShadow,
                    ],
                },
            ],
            /**
             * Drop Shadow Color
             * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
             */
            'drop-shadow-color': [{ 'drop-shadow': scaleColor() }],
            /**
             * Grayscale
             * @see https://tailwindcss.com/docs/grayscale
             */
            grayscale: [{ grayscale: ['', isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Hue Rotate
             * @see https://tailwindcss.com/docs/hue-rotate
             */
            'hue-rotate': [{ 'hue-rotate': [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Invert
             * @see https://tailwindcss.com/docs/invert
             */
            invert: [{ invert: ['', isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Saturate
             * @see https://tailwindcss.com/docs/saturate
             */
            saturate: [{ saturate: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Sepia
             * @see https://tailwindcss.com/docs/sepia
             */
            sepia: [{ sepia: ['', isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Backdrop Filter
             * @see https://tailwindcss.com/docs/backdrop-filter
             */
            'backdrop-filter': [
                {
                    'backdrop-filter': [
                        // Deprecated since Tailwind CSS v3.0.0
                        '',
                        'none',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Backdrop Blur
             * @see https://tailwindcss.com/docs/backdrop-blur
             */
            'backdrop-blur': [{ 'backdrop-blur': scaleBlur() }],
            /**
             * Backdrop Brightness
             * @see https://tailwindcss.com/docs/backdrop-brightness
             */
            'backdrop-brightness': [
                { 'backdrop-brightness': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Contrast
             * @see https://tailwindcss.com/docs/backdrop-contrast
             */
            'backdrop-contrast': [
                { 'backdrop-contrast': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Grayscale
             * @see https://tailwindcss.com/docs/backdrop-grayscale
             */
            'backdrop-grayscale': [
                { 'backdrop-grayscale': ['', isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Hue Rotate
             * @see https://tailwindcss.com/docs/backdrop-hue-rotate
             */
            'backdrop-hue-rotate': [
                { 'backdrop-hue-rotate': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Invert
             * @see https://tailwindcss.com/docs/backdrop-invert
             */
            'backdrop-invert': [
                { 'backdrop-invert': ['', isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Opacity
             * @see https://tailwindcss.com/docs/backdrop-opacity
             */
            'backdrop-opacity': [
                { 'backdrop-opacity': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Saturate
             * @see https://tailwindcss.com/docs/backdrop-saturate
             */
            'backdrop-saturate': [
                { 'backdrop-saturate': [isNumber, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Backdrop Sepia
             * @see https://tailwindcss.com/docs/backdrop-sepia
             */
            'backdrop-sepia': [
                { 'backdrop-sepia': ['', isNumber, isArbitraryVariable, isArbitraryValue] },
            ],

            // --------------
            // --- Tables ---
            // --------------

            /**
             * Border Collapse
             * @see https://tailwindcss.com/docs/border-collapse
             */
            'border-collapse': [{ border: ['collapse', 'separate'] }],
            /**
             * Border Spacing
             * @see https://tailwindcss.com/docs/border-spacing
             */
            'border-spacing': [{ 'border-spacing': scaleUnambiguousSpacing() }],
            /**
             * Border Spacing X
             * @see https://tailwindcss.com/docs/border-spacing
             */
            'border-spacing-x': [{ 'border-spacing-x': scaleUnambiguousSpacing() }],
            /**
             * Border Spacing Y
             * @see https://tailwindcss.com/docs/border-spacing
             */
            'border-spacing-y': [{ 'border-spacing-y': scaleUnambiguousSpacing() }],
            /**
             * Table Layout
             * @see https://tailwindcss.com/docs/table-layout
             */
            'table-layout': [{ table: ['auto', 'fixed'] }],
            /**
             * Caption Side
             * @see https://tailwindcss.com/docs/caption-side
             */
            caption: [{ caption: ['top', 'bottom'] }],

            // ---------------------------------
            // --- Transitions and Animation ---
            // ---------------------------------

            /**
             * Transition Property
             * @see https://tailwindcss.com/docs/transition-property
             */
            transition: [
                {
                    transition: [
                        '',
                        'all',
                        'colors',
                        'opacity',
                        'shadow',
                        'transform',
                        'none',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Transition Behavior
             * @see https://tailwindcss.com/docs/transition-behavior
             */
            'transition-behavior': [{ transition: ['normal', 'discrete'] }],
            /**
             * Transition Duration
             * @see https://tailwindcss.com/docs/transition-duration
             */
            duration: [{ duration: [isNumber, 'initial', isArbitraryVariable, isArbitraryValue] }],
            /**
             * Transition Timing Function
             * @see https://tailwindcss.com/docs/transition-timing-function
             */
            ease: [
                { ease: ['linear', 'initial', themeEase, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Transition Delay
             * @see https://tailwindcss.com/docs/transition-delay
             */
            delay: [{ delay: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Animation
             * @see https://tailwindcss.com/docs/animation
             */
            animate: [{ animate: ['none', themeAnimate, isArbitraryVariable, isArbitraryValue] }],

            // ------------------
            // --- Transforms ---
            // ------------------

            /**
             * Backface Visibility
             * @see https://tailwindcss.com/docs/backface-visibility
             */
            backface: [{ backface: ['hidden', 'visible'] }],
            /**
             * Perspective
             * @see https://tailwindcss.com/docs/perspective
             */
            perspective: [
                { perspective: [themePerspective, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Perspective Origin
             * @see https://tailwindcss.com/docs/perspective-origin
             */
            'perspective-origin': [{ 'perspective-origin': scalePositionWithArbitrary() }],
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            rotate: [{ rotate: scaleRotate() }],
            /**
             * Rotate X
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-x': [{ 'rotate-x': scaleRotate() }],
            /**
             * Rotate Y
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-y': [{ 'rotate-y': scaleRotate() }],
            /**
             * Rotate Z
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-z': [{ 'rotate-z': scaleRotate() }],
            /**
             * Scale
             * @see https://tailwindcss.com/docs/scale
             */
            scale: [{ scale: scaleScale() }],
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-x': [{ 'scale-x': scaleScale() }],
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-y': [{ 'scale-y': scaleScale() }],
            /**
             * Scale Z
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-z': [{ 'scale-z': scaleScale() }],
            /**
             * Scale 3D
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-3d': ['scale-3d'],
            /**
             * Skew
             * @see https://tailwindcss.com/docs/skew
             */
            skew: [{ skew: scaleSkew() }],
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-x': [{ 'skew-x': scaleSkew() }],
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-y': [{ 'skew-y': scaleSkew() }],
            /**
             * Transform
             * @see https://tailwindcss.com/docs/transform
             */
            transform: [
                { transform: [isArbitraryVariable, isArbitraryValue, '', 'none', 'gpu', 'cpu'] },
            ],
            /**
             * Transform Origin
             * @see https://tailwindcss.com/docs/transform-origin
             */
            'transform-origin': [{ origin: scalePositionWithArbitrary() }],
            /**
             * Transform Style
             * @see https://tailwindcss.com/docs/transform-style
             */
            'transform-style': [{ transform: ['3d', 'flat'] }],
            /**
             * Translate
             * @see https://tailwindcss.com/docs/translate
             */
            translate: [{ translate: scaleTranslate() }],
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-x': [{ 'translate-x': scaleTranslate() }],
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-y': [{ 'translate-y': scaleTranslate() }],
            /**
             * Translate Z
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-z': [{ 'translate-z': scaleTranslate() }],
            /**
             * Translate None
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-none': ['translate-none'],

            // ---------------------
            // --- Interactivity ---
            // ---------------------

            /**
             * Accent Color
             * @see https://tailwindcss.com/docs/accent-color
             */
            accent: [{ accent: scaleColor() }],
            /**
             * Appearance
             * @see https://tailwindcss.com/docs/appearance
             */
            appearance: [{ appearance: ['none', 'auto'] }],
            /**
             * Caret Color
             * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
             */
            'caret-color': [{ caret: scaleColor() }],
            /**
             * Color Scheme
             * @see https://tailwindcss.com/docs/color-scheme
             */
            'color-scheme': [
                { scheme: ['normal', 'dark', 'light', 'light-dark', 'only-dark', 'only-light'] },
            ],
            /**
             * Cursor
             * @see https://tailwindcss.com/docs/cursor
             */
            cursor: [
                {
                    cursor: [
                        'auto',
                        'default',
                        'pointer',
                        'wait',
                        'text',
                        'move',
                        'help',
                        'not-allowed',
                        'none',
                        'context-menu',
                        'progress',
                        'cell',
                        'crosshair',
                        'vertical-text',
                        'alias',
                        'copy',
                        'no-drop',
                        'grab',
                        'grabbing',
                        'all-scroll',
                        'col-resize',
                        'row-resize',
                        'n-resize',
                        'e-resize',
                        's-resize',
                        'w-resize',
                        'ne-resize',
                        'nw-resize',
                        'se-resize',
                        'sw-resize',
                        'ew-resize',
                        'ns-resize',
                        'nesw-resize',
                        'nwse-resize',
                        'zoom-in',
                        'zoom-out',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],
            /**
             * Field Sizing
             * @see https://tailwindcss.com/docs/field-sizing
             */
            'field-sizing': [{ 'field-sizing': ['fixed', 'content'] }],
            /**
             * Pointer Events
             * @see https://tailwindcss.com/docs/pointer-events
             */
            'pointer-events': [{ 'pointer-events': ['auto', 'none'] }],
            /**
             * Resize
             * @see https://tailwindcss.com/docs/resize
             */
            resize: [{ resize: ['none', '', 'y', 'x'] }],
            /**
             * Scroll Behavior
             * @see https://tailwindcss.com/docs/scroll-behavior
             */
            'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
            /**
             * Scroll Margin
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-m': [{ 'scroll-m': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin X
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mx': [{ 'scroll-mx': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Y
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-my': [{ 'scroll-my': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Start
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-ms': [{ 'scroll-ms': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin End
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-me': [{ 'scroll-me': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Top
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mt': [{ 'scroll-mt': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Right
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mr': [{ 'scroll-mr': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Bottom
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mb': [{ 'scroll-mb': scaleUnambiguousSpacing() }],
            /**
             * Scroll Margin Left
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-ml': [{ 'scroll-ml': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-p': [{ 'scroll-p': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding X
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-px': [{ 'scroll-px': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Y
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-py': [{ 'scroll-py': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Start
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-ps': [{ 'scroll-ps': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding End
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pe': [{ 'scroll-pe': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Top
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pt': [{ 'scroll-pt': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Right
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pr': [{ 'scroll-pr': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Bottom
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pb': [{ 'scroll-pb': scaleUnambiguousSpacing() }],
            /**
             * Scroll Padding Left
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pl': [{ 'scroll-pl': scaleUnambiguousSpacing() }],
            /**
             * Scroll Snap Align
             * @see https://tailwindcss.com/docs/scroll-snap-align
             */
            'snap-align': [{ snap: ['start', 'end', 'center', 'align-none'] }],
            /**
             * Scroll Snap Stop
             * @see https://tailwindcss.com/docs/scroll-snap-stop
             */
            'snap-stop': [{ snap: ['normal', 'always'] }],
            /**
             * Scroll Snap Type
             * @see https://tailwindcss.com/docs/scroll-snap-type
             */
            'snap-type': [{ snap: ['none', 'x', 'y', 'both'] }],
            /**
             * Scroll Snap Type Strictness
             * @see https://tailwindcss.com/docs/scroll-snap-type
             */
            'snap-strictness': [{ snap: ['mandatory', 'proximity'] }],
            /**
             * Touch Action
             * @see https://tailwindcss.com/docs/touch-action
             */
            touch: [{ touch: ['auto', 'none', 'manipulation'] }],
            /**
             * Touch Action X
             * @see https://tailwindcss.com/docs/touch-action
             */
            'touch-x': [{ 'touch-pan': ['x', 'left', 'right'] }],
            /**
             * Touch Action Y
             * @see https://tailwindcss.com/docs/touch-action
             */
            'touch-y': [{ 'touch-pan': ['y', 'up', 'down'] }],
            /**
             * Touch Action Pinch Zoom
             * @see https://tailwindcss.com/docs/touch-action
             */
            'touch-pz': ['touch-pinch-zoom'],
            /**
             * User Select
             * @see https://tailwindcss.com/docs/user-select
             */
            select: [{ select: ['none', 'text', 'all', 'auto'] }],
            /**
             * Will Change
             * @see https://tailwindcss.com/docs/will-change
             */
            'will-change': [
                {
                    'will-change': [
                        'auto',
                        'scroll',
                        'contents',
                        'transform',
                        isArbitraryVariable,
                        isArbitraryValue,
                    ],
                },
            ],

            // -----------
            // --- SVG ---
            // -----------

            /**
             * Fill
             * @see https://tailwindcss.com/docs/fill
             */
            fill: [{ fill: ['none', ...scaleColor()] }],
            /**
             * Stroke Width
             * @see https://tailwindcss.com/docs/stroke-width
             */
            'stroke-w': [
                {
                    stroke: [
                        isNumber,
                        isArbitraryVariableLength,
                        isArbitraryLength,
                        isArbitraryNumber,
                    ],
                },
            ],
            /**
             * Stroke
             * @see https://tailwindcss.com/docs/stroke
             */
            stroke: [{ stroke: ['none', ...scaleColor()] }],

            // ---------------------
            // --- Accessibility ---
            // ---------------------

            /**
             * Forced Color Adjust
             * @see https://tailwindcss.com/docs/forced-color-adjust
             */
            'forced-color-adjust': [{ 'forced-color-adjust': ['auto', 'none'] }],
        },
        conflictingClassGroups: {
            overflow: ['overflow-x', 'overflow-y'],
            overscroll: ['overscroll-x', 'overscroll-y'],
            inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
            'inset-x': ['right', 'left'],
            'inset-y': ['top', 'bottom'],
            flex: ['basis', 'grow', 'shrink'],
            gap: ['gap-x', 'gap-y'],
            p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
            px: ['pr', 'pl'],
            py: ['pt', 'pb'],
            m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
            mx: ['mr', 'ml'],
            my: ['mt', 'mb'],
            size: ['w', 'h'],
            'font-size': ['leading'],
            'fvn-normal': [
                'fvn-ordinal',
                'fvn-slashed-zero',
                'fvn-figure',
                'fvn-spacing',
                'fvn-fraction',
            ],
            'fvn-ordinal': ['fvn-normal'],
            'fvn-slashed-zero': ['fvn-normal'],
            'fvn-figure': ['fvn-normal'],
            'fvn-spacing': ['fvn-normal'],
            'fvn-fraction': ['fvn-normal'],
            'line-clamp': ['display', 'overflow'],
            rounded: [
                'rounded-s',
                'rounded-e',
                'rounded-t',
                'rounded-r',
                'rounded-b',
                'rounded-l',
                'rounded-ss',
                'rounded-se',
                'rounded-ee',
                'rounded-es',
                'rounded-tl',
                'rounded-tr',
                'rounded-br',
                'rounded-bl',
            ],
            'rounded-s': ['rounded-ss', 'rounded-es'],
            'rounded-e': ['rounded-se', 'rounded-ee'],
            'rounded-t': ['rounded-tl', 'rounded-tr'],
            'rounded-r': ['rounded-tr', 'rounded-br'],
            'rounded-b': ['rounded-br', 'rounded-bl'],
            'rounded-l': ['rounded-tl', 'rounded-bl'],
            'border-spacing': ['border-spacing-x', 'border-spacing-y'],
            'border-w': [
                'border-w-x',
                'border-w-y',
                'border-w-s',
                'border-w-e',
                'border-w-t',
                'border-w-r',
                'border-w-b',
                'border-w-l',
            ],
            'border-w-x': ['border-w-r', 'border-w-l'],
            'border-w-y': ['border-w-t', 'border-w-b'],
            'border-color': [
                'border-color-x',
                'border-color-y',
                'border-color-s',
                'border-color-e',
                'border-color-t',
                'border-color-r',
                'border-color-b',
                'border-color-l',
            ],
            'border-color-x': ['border-color-r', 'border-color-l'],
            'border-color-y': ['border-color-t', 'border-color-b'],
            translate: ['translate-x', 'translate-y', 'translate-none'],
            'translate-none': ['translate', 'translate-x', 'translate-y', 'translate-z'],
            'scroll-m': [
                'scroll-mx',
                'scroll-my',
                'scroll-ms',
                'scroll-me',
                'scroll-mt',
                'scroll-mr',
                'scroll-mb',
                'scroll-ml',
            ],
            'scroll-mx': ['scroll-mr', 'scroll-ml'],
            'scroll-my': ['scroll-mt', 'scroll-mb'],
            'scroll-p': [
                'scroll-px',
                'scroll-py',
                'scroll-ps',
                'scroll-pe',
                'scroll-pt',
                'scroll-pr',
                'scroll-pb',
                'scroll-pl',
            ],
            'scroll-px': ['scroll-pr', 'scroll-pl'],
            'scroll-py': ['scroll-pt', 'scroll-pb'],
            touch: ['touch-x', 'touch-y', 'touch-pz'],
            'touch-x': ['touch'],
            'touch-y': ['touch'],
            'touch-pz': ['touch'],
        },
        conflictingClassGroupModifiers: {
            'font-size': ['leading'],
        },
        orderSensitiveModifiers: [
            '*',
            '**',
            'after',
            'backdrop',
            'before',
            'details-content',
            'file',
            'first-letter',
            'first-line',
            'marker',
            'placeholder',
            'selection',
        ],
    } as const satisfies Config<DefaultClassGroupIds, DefaultThemeGroupIds>
}
