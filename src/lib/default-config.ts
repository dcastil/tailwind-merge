import { fromTheme } from './from-theme'
import { ClassGroup, Config, DefaultClassGroupIds, DefaultThemeGroupIds } from './types'
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
    const theme = {
        color: fromTheme('color'),
        font: fromTheme('font'),
        text: fromTheme('text'),
        fontWeight: fromTheme('font-weight'),
        tracking: fromTheme('tracking'),
        leading: fromTheme('leading'),
        breakpoint: fromTheme('breakpoint'),
        container: fromTheme('container'),
        spacing: fromTheme('spacing'),
        radius: fromTheme('radius'),
        shadow: fromTheme('shadow'),
        insetShadow: fromTheme('inset-shadow'),
        dropShadow: fromTheme('drop-shadow'),
        blur: fromTheme('blur'),
        perspective: fromTheme('perspective'),
        aspect: fromTheme('aspect'),
        ease: fromTheme('ease'),
        animate: fromTheme('animate'),
    } satisfies Record<string, ReturnType<typeof fromTheme>>

    /**
     * Helpers to avoid repeating the same scales
     */
    const scale = {
        break: () =>
            ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'] as const,
        position: () =>
            [
                'bottom',
                'center',
                'left',
                'left-bottom',
                'left-top',
                'right',
                'right-bottom',
                'right-top',
                'top',
            ] as const,
        overflow: () => ['auto', 'hidden', 'clip', 'visible', 'scroll'] as const,
        overscroll: () => ['auto', 'contain', 'none'] as const,
        inset: () =>
            [
                isFraction,
                'px',
                'full',
                'auto',
                isArbitraryVariable,
                isArbitraryValue,
                theme.spacing,
            ] as const,
        gridTemplateColsRows: () =>
            [isInteger, 'none', 'subgrid', isArbitraryVariable, isArbitraryValue] as const,
        gridColRowStartAndEnd: () =>
            [
                'auto',
                { span: ['full', isInteger, isArbitraryVariable, isArbitraryValue] },
                isArbitraryVariable,
                isArbitraryValue,
            ] as const,
        gridColRowStartOrEnd: () =>
            [isInteger, 'auto', isArbitraryVariable, isArbitraryValue] as const,
        gridAutoColsRows: () =>
            ['auto', 'min', 'max', 'fr', isArbitraryVariable, isArbitraryValue] as const,
        gap: () => [isArbitraryVariable, isArbitraryValue, theme.spacing] as const,
        alignPrimaryAxis: () =>
            [
                'start',
                'end',
                'center',
                'between',
                'around',
                'evenly',
                'stretch',
                'baseline',
            ] as const,
        alignSecondaryAxis: () => ['start', 'end', 'center', 'stretch'] as const,
        unambiguousSpacing: () => [isArbitraryVariable, isArbitraryValue, theme.spacing] as const,
        margin: () => ['auto', isArbitraryVariable, isArbitraryValue, theme.spacing] as const,
        sizing: () =>
            [
                isFraction,
                'auto',
                'px',
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
                isArbitraryVariable,
                isArbitraryValue,
                theme.spacing,
            ] as const,
        gradientStopPosition: () => [isPercent, isArbitraryLength] as const,
        borderWidth: () => ['', isNumber, isArbitraryVariableLength, isArbitraryLength] as const,
        lineStyle: () => ['solid', 'dashed', 'dotted', 'double'] as const,
        blendMode: () =>
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
            ] as const,
        origin: () =>
            [
                'center',
                'top',
                'top-right',
                'right',
                'bottom-right',
                'bottom',
                'bottom-left',
                'left',
                'top-left',
                isArbitraryVariable,
                isArbitraryValue,
            ] as const,
        rotate: () => ['none', isNumber, isArbitraryVariable, isArbitraryValue] as const,
        scale: () => ['none', isNumber, isArbitraryVariable, isArbitraryValue] as const,
        skew: () => [isNumber, isArbitraryVariable, isArbitraryValue] as const,
        translate: () =>
            [
                isFraction,
                'full',
                'px',
                isArbitraryVariable,
                isArbitraryValue,
                theme.spacing,
            ] as const,
    } satisfies Record<string, () => ClassGroup<any>>

    return {
        cacheSize: 500,
        separator: ':',
        theme: {
            color: [isAny],
            font: [isAnyNonArbitrary, isArbitraryVariableFamilyName, isArbitraryValue],
            text: ['base', isTshirtSize, isArbitraryVariableLength, isArbitraryLength],
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
            tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
            leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
            breakpoint: [isTshirtSize],
            container: [isTshirtSize],
            spacing: [isNumber, isArbitraryVariableLength, isArbitraryLength],
            radius: [
                // Deprecated since Tailwind CSS v4.0.0
                '',
                isTshirtSize,
                'none',
                'full',
                isArbitraryVariable,
                isArbitraryValue,
            ],
            shadow: [isTshirtSize, 'none', isArbitraryVariableShadow, isArbitraryShadow],
            'inset-shadow': [isTshirtSize],
            'drop-shadow': [
                // Deprecated since Tailwind CSS v4.0.0
                '',
                isTshirtSize,
                'none',
                isArbitraryVariable,
                isArbitraryValue,
            ],
            blur: [
                // Deprecated since Tailwind CSS v4.0.0
                '',
                isTshirtSize,
                'none',
                isArbitraryVariable,
                isArbitraryValue,
            ],
            perspective: ['dramatic', 'near', 'normal', 'midrange', 'distant', 'none'],
            aspect: ['video'],
            ease: ['in', 'out', 'in-out'],
            animate: ['spin', 'ping', 'pulse', 'bounce'],
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
                        theme.aspect,
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
                { columns: [isNumber, isArbitraryValue, isArbitraryVariable, theme.container] },
            ],
            /**
             * Break After
             * @see https://tailwindcss.com/docs/break-after
             */
            'break-after': [{ 'break-after': scale.break() }],
            /**
             * Break Before
             * @see https://tailwindcss.com/docs/break-before
             */
            'break-before': [{ 'break-before': scale.break() }],
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
            'object-position': [
                { object: [...scale.position(), isArbitraryValue, isArbitraryVariable] },
            ],
            /**
             * Overflow
             * @see https://tailwindcss.com/docs/overflow
             */
            overflow: [{ overflow: scale.overflow() }],
            /**
             * Overflow X
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-x': [{ 'overflow-x': scale.overflow() }],
            /**
             * Overflow Y
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-y': [{ 'overflow-y': scale.overflow() }],
            /**
             * Overscroll Behavior
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            overscroll: [{ overscroll: scale.overscroll() }],
            /**
             * Overscroll Behavior X
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-x': [{ 'overscroll-x': scale.overscroll() }],
            /**
             * Overscroll Behavior Y
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-y': [{ 'overscroll-y': scale.overscroll() }],
            /**
             * Position
             * @see https://tailwindcss.com/docs/position
             */
            position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            inset: [{ inset: scale.inset() }],
            /**
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-x': [{ 'inset-x': scale.inset() }],
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-y': [{ 'inset-y': scale.inset() }],
            /**
             * Start
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            start: [{ start: scale.inset() }],
            /**
             * End
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            end: [{ end: scale.inset() }],
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            top: [{ top: scale.inset() }],
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            right: [{ right: scale.inset() }],
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            bottom: [{ bottom: scale.inset() }],
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            left: [{ left: scale.inset() }],
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
                        isArbitraryVariable,
                        isArbitraryValue,
                        theme.container,
                        theme.spacing,
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
            'grid-cols': [{ 'grid-cols': scale.gridTemplateColsRows() }],
            /**
             * Grid Column Start / End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start-end': [{ col: scale.gridColRowStartAndEnd() }],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start': [{ 'col-start': scale.gridColRowStartOrEnd() }],
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-end': [{ 'col-end': scale.gridColRowStartOrEnd() }],
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            'grid-rows': [{ 'grid-rows': scale.gridTemplateColsRows() }],
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start-end': [{ row: scale.gridColRowStartAndEnd() }],
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start': [{ 'row-start': scale.gridColRowStartOrEnd() }],
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-end': [{ 'row-end': scale.gridColRowStartOrEnd() }],
            /**
             * Grid Auto Flow
             * @see https://tailwindcss.com/docs/grid-auto-flow
             */
            'grid-flow': [{ 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] }],
            /**
             * Grid Auto Columns
             * @see https://tailwindcss.com/docs/grid-auto-columns
             */
            'auto-cols': [{ 'auto-cols': scale.gridAutoColsRows() }],
            /**
             * Grid Auto Rows
             * @see https://tailwindcss.com/docs/grid-auto-rows
             */
            'auto-rows': [{ 'auto-rows': scale.gridAutoColsRows() }],
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            gap: [{ gap: scale.gap() }],
            /**
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-x': [{ 'gap-x': scale.gap() }],
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-y': [{ 'gap-y': scale.gap() }],
            /**
             * Justify Content
             * @see https://tailwindcss.com/docs/justify-content
             */
            'justify-content': [{ justify: [...scale.alignPrimaryAxis(), 'normal'] }],
            /**
             * Justify Items
             * @see https://tailwindcss.com/docs/justify-items
             */
            'justify-items': [{ 'justify-items': [...scale.alignSecondaryAxis(), 'normal'] }],
            /**
             * Justify Self
             * @see https://tailwindcss.com/docs/justify-self
             */
            'justify-self': [{ 'justify-self': ['auto', ...scale.alignSecondaryAxis()] }],
            /**
             * Align Content
             * @see https://tailwindcss.com/docs/align-content
             */
            'align-content': [{ content: ['normal', ...scale.alignPrimaryAxis()] }],
            /**
             * Align Items
             * @see https://tailwindcss.com/docs/align-items
             */
            'align-items': [{ items: [...scale.alignSecondaryAxis(), 'baseline'] }],
            /**
             * Align Self
             * @see https://tailwindcss.com/docs/align-self
             */
            'align-self': [{ self: ['auto', ...scale.alignSecondaryAxis(), 'baseline'] }],
            /**
             * Place Content
             * @see https://tailwindcss.com/docs/place-content
             */
            'place-content': [{ 'place-content': scale.alignPrimaryAxis() }],
            /**
             * Place Items
             * @see https://tailwindcss.com/docs/place-items
             */
            'place-items': [{ 'place-items': [...scale.alignSecondaryAxis(), 'baseline'] }],
            /**
             * Place Self
             * @see https://tailwindcss.com/docs/place-self
             */
            'place-self': [{ 'place-self': ['auto', ...scale.alignSecondaryAxis()] }],
            // Spacing
            /**
             * Padding
             * @see https://tailwindcss.com/docs/padding
             */
            p: [{ p: scale.unambiguousSpacing() }],
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            px: [{ px: scale.unambiguousSpacing() }],
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            py: [{ py: scale.unambiguousSpacing() }],
            /**
             * Padding Start
             * @see https://tailwindcss.com/docs/padding
             */
            ps: [{ ps: scale.unambiguousSpacing() }],
            /**
             * Padding End
             * @see https://tailwindcss.com/docs/padding
             */
            pe: [{ pe: scale.unambiguousSpacing() }],
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            pt: [{ pt: scale.unambiguousSpacing() }],
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            pr: [{ pr: scale.unambiguousSpacing() }],
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            pb: [{ pb: scale.unambiguousSpacing() }],
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            pl: [{ pl: scale.unambiguousSpacing() }],
            /**
             * Margin
             * @see https://tailwindcss.com/docs/margin
             */
            m: [{ m: scale.margin() }],
            /**
             * Margin X
             * @see https://tailwindcss.com/docs/margin
             */
            mx: [{ mx: scale.margin() }],
            /**
             * Margin Y
             * @see https://tailwindcss.com/docs/margin
             */
            my: [{ my: scale.margin() }],
            /**
             * Margin Start
             * @see https://tailwindcss.com/docs/margin
             */
            ms: [{ ms: scale.margin() }],
            /**
             * Margin End
             * @see https://tailwindcss.com/docs/margin
             */
            me: [{ me: scale.margin() }],
            /**
             * Margin Top
             * @see https://tailwindcss.com/docs/margin
             */
            mt: [{ mt: scale.margin() }],
            /**
             * Margin Right
             * @see https://tailwindcss.com/docs/margin
             */
            mr: [{ mr: scale.margin() }],
            /**
             * Margin Bottom
             * @see https://tailwindcss.com/docs/margin
             */
            mb: [{ mb: scale.margin() }],
            /**
             * Margin Left
             * @see https://tailwindcss.com/docs/margin
             */
            ml: [{ ml: scale.margin() }],
            /**
             * Space Between X
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-x': [{ 'space-x': scale.unambiguousSpacing() }],
            /**
             * Space Between X Reverse
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-x-reverse': ['space-x-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-y': [{ 'space-y': scale.unambiguousSpacing() }],
            /**
             * Space Between Y Reverse
             * @see https://tailwindcss.com/docs/margin#adding-space-between-children
             */
            'space-y-reverse': ['space-y-reverse'],

            // --------------
            // --- Sizing ---
            // --------------

            /**
             * Width
             * @see https://tailwindcss.com/docs/width
             */
            /**
             * Size
             * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
             */
            size: [{ size: scale.sizing() }],
            w: [{ w: [theme.container, 'screen', ...scale.sizing()] }],
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            'min-w': [{ 'min-w': [theme.container, 'screen', 'none', ...scale.sizing()] }],
            /**
             * Max-Width
             * @see https://tailwindcss.com/docs/max-width
             */
            'max-w': [
                {
                    'max-w': [
                        theme.container,
                        'screen',
                        'none',
                        'prose',
                        { screen: [theme.breakpoint] },
                        ...scale.sizing(),
                    ],
                },
            ],
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            h: [{ h: ['screen', ...scale.sizing()] }],
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            'min-h': [{ 'min-h': ['screen', 'none', ...scale.sizing()] }],
            /**
             * Max-Height
             * @see https://tailwindcss.com/docs/max-height
             */
            'max-h': [{ 'max-h': ['screen', ...scale.sizing()] }],

            // ------------------
            // --- Typography ---
            // ------------------

            /**
             * Font Size
             * @see https://tailwindcss.com/docs/font-size
             */
            'font-size': [{ text: [theme.text] }],
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
            'font-weight': [{ font: [theme.fontWeight, isArbitraryVariable, isArbitraryNumber] }],
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
            'font-family': [{ font: [theme.font] }],
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
            tracking: [{ tracking: [theme.tracking, isArbitraryVariable, isArbitraryValue] }],
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
                { leading: [isArbitraryVariable, isArbitraryValue, theme.leading, theme.spacing] },
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
            'placeholder-color': [{ placeholder: [theme.color] }],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            'text-color': [{ text: [theme.color] }],
            /**
             * Text Decoration
             * @see https://tailwindcss.com/docs/text-decoration
             */
            'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
            /**
             * Text Decoration Style
             * @see https://tailwindcss.com/docs/text-decoration-style
             */
            'text-decoration-style': [{ decoration: [...scale.lineStyle(), 'wavy'] }],
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
            'text-decoration-color': [{ decoration: [theme.color] }],
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
            indent: [{ indent: ['px', ...scale.unambiguousSpacing()] }],
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
            'bg-position': [
                {
                    bg: [...scale.position(), isArbitraryVariablePosition, isArbitraryPosition],
                },
            ],
            /**
             * Background Repeat
             * @see https://tailwindcss.com/docs/background-repeat
             */
            'bg-repeat': [{ bg: ['no-repeat', { repeat: ['', 'x', 'y', 'space', 'round'] }] }],
            /**
             * Background Size
             * @see https://tailwindcss.com/docs/background-size
             */
            'bg-size': [
                { bg: ['auto', 'cover', 'contain', isArbitraryVariableSize, isArbitrarySize] },
            ],
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
            'bg-color': [{ bg: [theme.color] }],
            /**
             * Gradient Color Stops From Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from-pos': [{ from: scale.gradientStopPosition() }],
            /**
             * Gradient Color Stops Via Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via-pos': [{ via: scale.gradientStopPosition() }],
            /**
             * Gradient Color Stops To Position
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to-pos': [{ to: scale.gradientStopPosition() }],
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from': [{ from: [theme.color] }],
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via': [{ via: [theme.color] }],
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to': [{ to: [theme.color] }],

            // ---------------
            // --- Borders ---
            // ---------------

            /**
             * Border Radius
             * @see https://tailwindcss.com/docs/border-radius
             */
            rounded: [{ rounded: [theme.radius] }],
            /**
             * Border Radius Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-s': [{ 'rounded-s': [theme.radius] }],
            /**
             * Border Radius End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-e': [{ 'rounded-e': [theme.radius] }],
            /**
             * Border Radius Top
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-t': [{ 'rounded-t': [theme.radius] }],
            /**
             * Border Radius Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-r': [{ 'rounded-r': [theme.radius] }],
            /**
             * Border Radius Bottom
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-b': [{ 'rounded-b': [theme.radius] }],
            /**
             * Border Radius Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-l': [{ 'rounded-l': [theme.radius] }],
            /**
             * Border Radius Start Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-ss': [{ 'rounded-ss': [theme.radius] }],
            /**
             * Border Radius Start End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-se': [{ 'rounded-se': [theme.radius] }],
            /**
             * Border Radius End End
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-ee': [{ 'rounded-ee': [theme.radius] }],
            /**
             * Border Radius End Start
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-es': [{ 'rounded-es': [theme.radius] }],
            /**
             * Border Radius Top Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tl': [{ 'rounded-tl': [theme.radius] }],
            /**
             * Border Radius Top Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tr': [{ 'rounded-tr': [theme.radius] }],
            /**
             * Border Radius Bottom Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-br': [{ 'rounded-br': [theme.radius] }],
            /**
             * Border Radius Bottom Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-bl': [{ 'rounded-bl': [theme.radius] }],
            /**
             * Border Width
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w': [{ border: scale.borderWidth() }],
            /**
             * Border Width X
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-x': [{ 'border-x': scale.borderWidth() }],
            /**
             * Border Width Y
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-y': [{ 'border-y': scale.borderWidth() }],
            /**
             * Border Width Start
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-s': [{ 'border-s': scale.borderWidth() }],
            /**
             * Border Width End
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-e': [{ 'border-e': scale.borderWidth() }],
            /**
             * Border Width Top
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-t': [{ 'border-t': scale.borderWidth() }],
            /**
             * Border Width Right
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-r': [{ 'border-r': scale.borderWidth() }],
            /**
             * Border Width Bottom
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-b': [{ 'border-b': scale.borderWidth() }],
            /**
             * Border Width Left
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-l': [{ 'border-l': scale.borderWidth() }],
            /**
             * Divide Width X
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-x': [{ 'divide-x': scale.borderWidth() }],
            /**
             * Divide Width X Reverse
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-x-reverse': ['divide-x-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-y': [{ 'divide-y': scale.borderWidth() }],
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/border-width#between-children
             */
            'divide-y-reverse': ['divide-y-reverse'],
            /**
             * Border Style
             * @see https://tailwindcss.com/docs/border-style
             */
            'border-style': [{ border: [...scale.lineStyle(), 'hidden', 'none'] }],
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
             */
            'divide-style': [{ divide: [...scale.lineStyle(), 'hidden', 'none'] }],
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color': [{ border: [theme.color] }],
            /**
             * Border Color X
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-x': [{ 'border-x': [theme.color] }],
            /**
             * Border Color Y
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-y': [{ 'border-y': [theme.color] }],
            /**
             * Border Color S
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-s': [{ 'border-s': [theme.color] }],
            /**
             * Border Color E
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-e': [{ 'border-e': [theme.color] }],
            /**
             * Border Color Top
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-t': [{ 'border-t': [theme.color] }],
            /**
             * Border Color Right
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-r': [{ 'border-r': [theme.color] }],
            /**
             * Border Color Bottom
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-b': [{ 'border-b': [theme.color] }],
            /**
             * Border Color Left
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-l': [{ 'border-l': [theme.color] }],
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            'divide-color': [{ divide: [theme.color] }],
            /**
             * Outline Style
             * @see https://tailwindcss.com/docs/outline-style
             */
            'outline-style': [{ outline: [...scale.lineStyle(), 'none', 'hidden'] }],
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
            'outline-color': [{ outline: [theme.color] }],

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
                        theme.shadow,
                    ],
                },
            ],
            /**
             * Box Shadow Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
             */
            'shadow-color': [{ shadow: [theme.color] }],
            /**
             * Inset Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
             */
            'inset-shadow': [
                {
                    'inset-shadow': [
                        'none',
                        isArbitraryVariable,
                        isArbitraryValue,
                        theme.insetShadow,
                    ],
                },
            ],
            /**
             * Inset Box Shadow Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
             */
            'inset-shadow-color': [{ 'inset-shadow': [theme.color] }],
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
             */
            'ring-w': [{ ring: scale.borderWidth() }],
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
            'ring-color': [{ ring: [theme.color] }],
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
            'ring-offset-color': [{ 'ring-offset': [theme.color] }],
            /**
             * Inset Ring Width
             * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
             */
            'inset-ring-w': [{ 'inset-ring': scale.borderWidth() }],
            /**
             * Inset Ring Color
             * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
             */
            'inset-ring-color': [{ 'inset-ring': [theme.color] }],
            /**
             * Opacity
             * @see https://tailwindcss.com/docs/opacity
             */
            opacity: [{ opacity: [isNumber, isArbitraryVariable, isArbitraryValue] }],
            /**
             * Mix Blend Mode
             * @see https://tailwindcss.com/docs/mix-blend-mode
             */
            'mix-blend': [{ 'mix-blend': [...scale.blendMode(), 'plus-darker', 'plus-lighter'] }],
            /**
             * Background Blend Mode
             * @see https://tailwindcss.com/docs/background-blend-mode
             */
            'bg-blend': [{ 'bg-blend': scale.blendMode() }],

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
            blur: [{ blur: [theme.blur] }],
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
            'drop-shadow': [{ 'drop-shadow': [theme.dropShadow] }],
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
            'backdrop-blur': [{ 'backdrop-blur': [theme.blur] }],
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
            'border-spacing': [{ 'border-spacing': scale.unambiguousSpacing() }],
            /**
             * Border Spacing X
             * @see https://tailwindcss.com/docs/border-spacing
             */
            'border-spacing-x': [{ 'border-spacing-x': scale.unambiguousSpacing() }],
            /**
             * Border Spacing Y
             * @see https://tailwindcss.com/docs/border-spacing
             */
            'border-spacing-y': [{ 'border-spacing-y': scale.unambiguousSpacing() }],
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
                { ease: ['linear', 'initial', isArbitraryVariable, isArbitraryValue, theme.ease] },
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
            animate: [{ animate: ['none', isArbitraryVariable, isArbitraryValue, theme.animate] }],

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
                { perspective: [theme.perspective, isArbitraryVariable, isArbitraryValue] },
            ],
            /**
             * Perspective Origin
             * @see https://tailwindcss.com/docs/perspective-origin
             */
            'perspective-origin': [{ 'perspective-origin': scale.origin() }],
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            rotate: [{ rotate: scale.rotate() }],
            /**
             * Rotate X
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-x': [{ 'rotate-x': scale.rotate() }],
            /**
             * Rotate Y
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-y': [{ 'rotate-y': scale.rotate() }],
            /**
             * Rotate Z
             * @see https://tailwindcss.com/docs/rotate
             */
            'rotate-z': [{ 'rotate-z': scale.rotate() }],
            /**
             * Scale
             * @see https://tailwindcss.com/docs/scale
             */
            scale: [{ scale: scale.scale() }],
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-x': [{ 'scale-x': scale.scale() }],
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-y': [{ 'scale-y': scale.scale() }],
            /**
             * Scale Z
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-z': [{ 'scale-z': scale.scale() }],
            /**
             * Scale 3D
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-3d': ['scale-3d'],
            /**
             * Skew
             * @see https://tailwindcss.com/docs/skew
             */
            skew: [{ skew: scale.skew() }],
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-x': [{ 'skew-x': scale.skew() }],
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-y': [{ 'skew-y': scale.skew() }],
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
            'transform-origin': [{ origin: scale.origin() }],
            /**
             * Transform Style
             * @see https://tailwindcss.com/docs/transform-style
             */
            'transform-style': [{ transform: ['3d', 'flat'] }],
            /**
             * Translate
             * @see https://tailwindcss.com/docs/translate
             */
            translate: [{ translate: scale.translate() }],
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-x': [{ 'translate-x': scale.translate() }],
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-y': [{ 'translate-y': scale.translate() }],
            /**
             * Translate Z
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-z': [{ 'translate-z': scale.translate() }],
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
            accent: [{ accent: [theme.color] }],
            /**
             * Appearance
             * @see https://tailwindcss.com/docs/appearance
             */
            appearance: [{ appearance: ['none', 'auto'] }],
            /**
             * Caret Color
             * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
             */
            'caret-color': [{ caret: [theme.color] }],
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
            'scroll-m': [{ 'scroll-m': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin X
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mx': [{ 'scroll-mx': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Y
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-my': [{ 'scroll-my': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Start
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-ms': [{ 'scroll-ms': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin End
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-me': [{ 'scroll-me': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Top
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mt': [{ 'scroll-mt': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Right
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mr': [{ 'scroll-mr': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Bottom
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mb': [{ 'scroll-mb': scale.unambiguousSpacing() }],
            /**
             * Scroll Margin Left
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-ml': [{ 'scroll-ml': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-p': [{ 'scroll-p': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding X
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-px': [{ 'scroll-px': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Y
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-py': [{ 'scroll-py': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Start
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-ps': [{ 'scroll-ps': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding End
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pe': [{ 'scroll-pe': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Top
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pt': [{ 'scroll-pt': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Right
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pr': [{ 'scroll-pr': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Bottom
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pb': [{ 'scroll-pb': scale.unambiguousSpacing() }],
            /**
             * Scroll Padding Left
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pl': [{ 'scroll-pl': scale.unambiguousSpacing() }],
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
            fill: [{ fill: ['none', theme.color] }],
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
            stroke: [{ stroke: ['none', theme.color] }],

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
    } as const satisfies Config<DefaultClassGroupIds, DefaultThemeGroupIds>
}
