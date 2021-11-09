import { fromTheme } from './from-theme'
import { isAny, isCustomLength, isCustomValue, isInteger, isLength } from './validators'

export function getDefaultConfig() {
    const colors = fromTheme('colors')
    const spacing = fromTheme('spacing')
    const blur = fromTheme('blur')
    const brightness = fromTheme('brightness')
    const borderColor = fromTheme('borderColor')
    const borderRadius = fromTheme('borderRadius')
    const borderWidth = fromTheme('borderWidth')
    const contrast = fromTheme('contrast')
    const grayscale = fromTheme('grayscale')
    const hueRotate = fromTheme('hueRotate')
    const invert = fromTheme('invert')
    const gap = fromTheme('gap')
    const gradientColorStops = fromTheme('gradientColorStops')
    const inset = fromTheme('inset')
    const margin = fromTheme('margin')
    const opacity = fromTheme('opacity')
    const padding = fromTheme('padding')
    const saturate = fromTheme('saturate')
    const scale = fromTheme('scale')
    const sepia = fromTheme('sepia')
    const skew = fromTheme('skew')
    const space = fromTheme('space')
    const translate = fromTheme('translate')

    const getSizesSimple = () => ['sm', 'md', 'lg', 'xl', '2xl'] as const
    const getSizesExtended = () => ['3xl', '4xl', '5xl', '6xl', '7xl'] as const
    const getOverscroll = () => ['auto', 'contain', 'none'] as const
    const getOverflow = () => ['auto', 'hidden', 'visible', 'scroll'] as const
    const getSpacingWithAuto = () => ['auto', spacing] as const
    const getLengthWithEmpty = () => ['', isLength] as const
    const getIntegerWithAuto = () => ['auto', isInteger] as const
    const getPositions = () =>
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
        ] as const
    const getBorderStyles = () => ['solid', 'dashed', 'dotted', 'double', 'none'] as const
    const getBlendModes = () =>
        [
            {
                blend: [
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
                ],
            },
        ] as const
    const getAlign = () => ['start', 'end', 'center', 'between', 'around', 'evenly'] as const
    const getZeroAndEmpty = () => ['', '0'] as const

    return {
        cacheSize: 500,
        theme: {
            colors: [isAny],
            spacing: [isLength],
            blur: ['none', '', ...getSizesSimple(), '3xl', isCustomLength],
            brightness: [isInteger],
            borderColor: [colors],
            borderRadius: ['none', '', ...getSizesSimple(), '3xl', 'full', isCustomLength],
            borderWidth: getLengthWithEmpty(),
            contrast: [isInteger],
            grayscale: getZeroAndEmpty(),
            hueRotate: [isInteger],
            invert: getZeroAndEmpty(),
            gap: [spacing],
            gradientColorStops: [colors],
            inset: getSpacingWithAuto(),
            margin: getSpacingWithAuto(),
            opacity: [isInteger],
            padding: [spacing],
            saturate: [isInteger],
            scale: [isInteger],
            sepia: getZeroAndEmpty(),
            skew: [isInteger],
            space: [spacing],
            translate: [spacing],

            // Tailwind theme keys not in use because they would apply only to a single classGroup:

            // animation: ['none', 'spin', 'ping', 'pulse', 'bounce', isCustomValue],
            // backdropBlur: [blur],
            // backdropBrightness: [brightness],
            // backdropContrast: [contrast],
            // backdropGrayscale: [grayscale],
            // backdropHueRotate: [hueRotate],
            // backdropInvert: [invert],
            // backdropOpacity: [opacity],
            // backdropSaturate: [saturate],
            // backdropSepia: [sepia],
            // backgroundColor: [colors],
            // backgroundImage: [
            //     'none',
            //     { 'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
            // ],
            // backgroundOpacity: [opacity],
            // backgroundPosition: getPositions(),
            // backgroundSize: ['auto', 'cover', 'contain'],
            // borderOpacity: [opacity],
            // boxShadow: ['', ...getSizesSimple(), 'inner', 'none'],
            // caretColor: [colors],
            // container: ['container'],
            // content: [isCustomValue],
            // cursor: [
            //     'auto',
            //     'default',
            //     'pointer',
            //     'wait',
            //     'text',
            //     'move',
            //     'help',
            //     'not-allowed',
            //     isCustomValue,
            // ],
            // divideColor: [borderColor],
            // divideOpacity: [borderOpacity],
            // divideWidth: [borderWidth],
            // dropShadow: ['', ...getSizesSimple(), 'none'],
            // fill: ['current', isCustomValue],
            // flex: ['1', 'auto', 'initial', 'none', isCustomValue],
            // flexGrow: getZeroAndEmpty(),
            // flexShrink: getZeroAndEmpty(),
            // fontFamily: [isAny],
            // fontSize: [
            //     'xs',
            //     ...getSizesSimple(),
            //     'base',
            //     ...getSizesExtended(),
            //     '8xl',
            //     '9xl',
            //     isCustomLength,
            // ],
            // fontWeight: [
            //     'thin',
            //     'extralight',
            //     'light',
            //     'normal',
            //     'medium',
            //     'semibold',
            //     'bold',
            //     'extrabold',
            //     'black',
            // ],
            // gridAutoColumns: ['auto', 'min', 'max', 'fr', isCustomValue],
            // gridAutoRows: ['auto', 'min', 'max', 'fr', isCustomValue],
            // gridColumn: ['auto', { span: [isInteger] }],
            // gridColumnEnd: getIntegerWithAuto(),
            // gridColumnStart: getIntegerWithAuto(),
            // gridRow: ['auto', { span: [isInteger] }],
            // gridRowStart: getIntegerWithAuto(),
            // gridRowEnd: getIntegerWithAuto(),
            // gridTemplateColumns: [isAny],
            // gridTemplateRows: [isAny],
            // height: getSpacingWithAuto(),
            // letterSpacing: [
            //     'tighter',
            //     'tight',
            //     'normal',
            //     'wide',
            //     'wider',
            //     'widest',
            //     isCustomLength,
            // ],
            // lineHeight: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', isLength],
            // listStyleType: ['none', 'disc', 'decimal', isCustomValue],
            // maxHeight: [spacing],
            // maxWidth: [
            //     '0',
            //     'none',
            //     ...getSizesSimple(),
            //     ...getSizesExtended(),
            //     'full',
            //     'min',
            //     'max',
            //     'prose',
            //     { screen: getSizesSimple() },
            //     isCustomLength,
            // ],
            // minHeight: ['full', 'screen', isLength],
            // minWidth: ['full', 'min', 'max', isLength],
            // objectPosition: getPositions(),
            // order: ['first', 'last', 'none', isInteger],
            // outline: ['none', 'white', 'black'],
            // placeholderColor: [colors],
            // placeholderOpacity: [opacity],
            // ringColor: [colors],
            // ringOffsetColor: [colors],
            // ringOffsetWidth: [isLength],
            // ringOpacity: [opacity],
            // ringWidth: getLengthWithEmpty(),
            // rotate: [isInteger],
            // stroke: ['current', isCustomValue],
            // strokeWidth: [isLength],
            // textColor: [colors],
            // textOpacity: [opacity],
            // transformOrigin: [
            //     'center',
            //     'top',
            //     'top-right',
            //     'right',
            //     'bottom-right',
            //     'bottom',
            //     'bottom-left',
            //     'left',
            //     'top-left',
            // ],
            // transitionDelay: [isInteger],
            // transitionDuration: [isInteger],
            // transitionProperty: [
            //     'none',
            //     'all',
            //     '',
            //     'colors',
            //     'opacity',
            //     'shadow',
            //     'transform',
            //     isCustomValue,
            // ],
            // transitionTimingFunction: ['linear', 'in', 'out', 'in-out', isCustomValue],
            // width: ['auto', 'min', 'max', spacing],
            // zIndex: [isLength],
        },
        classGroups: {
            // Layout
            /**
             * Container
             * @see https://tailwindcss.com/docs/container
             */
            container: ['container'],
            /**
             * Box Decoration Break
             * @see https://tailwindcss.com/docs/box-decoration-break
             */
            decoration: [{ decoration: ['slice', 'clone'] }],
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
             * Floats
             * @see https://tailwindcss.com/docs/float
             */
            float: [{ float: ['right', 'left', 'none'] }],
            /**
             * Clear
             * @see https://tailwindcss.com/docs/clear
             */
            clear: [{ clear: ['left', 'right', 'both', 'none'] }],
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
            'object-position': [{ object: getPositions() }],
            /**
             * Overflow
             * @see https://tailwindcss.com/docs/overflow
             */
            overflow: [{ overflow: getOverflow() }],
            /**
             * Overflow X
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-x': [{ 'overflow-x': getOverflow() }],
            /**
             * Overflow Y
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-y': [{ 'overflow-y': getOverflow() }],
            /**
             * Overscroll Behavior
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            overscroll: [{ overscroll: getOverscroll() }],
            /**
             * Overscroll Behavior X
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-x': [{ 'overscroll-x': getOverscroll() }],
            /**
             * Overscroll Behavior Y
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-y': [{ 'overscroll-y': getOverscroll() }],
            /**
             * Position
             * @see https://tailwindcss.com/docs/position
             */
            position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            inset: [{ inset: [inset] }],
            /**
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-x': [{ 'inset-x': [inset] }],
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-y': [{ 'inset-y': [inset] }],
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            top: [{ top: [inset] }],
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            right: [{ right: [inset] }],
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            bottom: [{ bottom: [inset] }],
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            left: [{ left: [inset] }],
            /**
             * Visibility
             * @see https://tailwindcss.com/docs/visibility
             */
            visibility: ['visible', 'invisible'],
            /**
             * Z-Index
             * @see https://tailwindcss.com/docs/z-index
             */
            z: [{ z: [isLength] }],
            // Flexbox and Grid
            /**
             * Flex Direction
             * @see https://tailwindcss.com/docs/flex-direction
             */
            'flex-direction': [{ flex: ['row', 'row-reverse', 'col', 'col-reverse'] }],
            /**
             * Flex Wrap
             * @see https://tailwindcss.com/docs/flex-wrap
             */
            'flex-wrap': [{ flex: ['wrap', 'wrap-reverse', 'nowrap'] }],
            /**
             * Flex
             * @see https://tailwindcss.com/docs/flex
             */
            flex: [{ flex: ['1', 'auto', 'initial', 'none', isCustomValue] }],
            /**
             * Flex Grow
             * @see https://tailwindcss.com/docs/flex-grow
             */
            'flex-grow': [{ 'flex-grow': getZeroAndEmpty() }],
            /**
             * Flex Shrink
             * @see https://tailwindcss.com/docs/flex-shrink
             */
            'flex-shrink': [{ 'flex-shrink': getZeroAndEmpty() }],
            /**
             * Order
             * @see https://tailwindcss.com/docs/order
             */
            order: [{ order: ['first', 'last', 'none', isInteger] }],
            /**
             * Grid Template Columns
             * @see https://tailwindcss.com/docs/grid-template-columns
             */
            'grid-cols': [{ 'grid-cols': [isAny] }],
            /**
             * Grid Column Start / End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start-end': [{ col: ['auto', { span: [isInteger] }] }],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start': [{ 'col-start': getIntegerWithAuto() }],
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-end': [{ 'col-end': getIntegerWithAuto() }],
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            'grid-rows': [{ 'grid-rows': [isAny] }],
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start-end': [{ row: ['auto', { span: [isInteger] }] }],
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start': [{ 'row-start': getIntegerWithAuto() }],
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-end': [{ 'row-end': getIntegerWithAuto() }],
            /**
             * Grid Auto Flow
             * @see https://tailwindcss.com/docs/grid-auto-flow
             */
            'grid-flow': [{ 'grid-flow': ['row', 'col', 'row-dense', 'col-dense'] }],
            /**
             * Grid Auto Columns
             * @see https://tailwindcss.com/docs/grid-auto-columns
             */
            'auto-cols': [{ 'auto-cols': ['auto', 'min', 'max', 'fr', isCustomValue] }],
            /**
             * Grid Auto Rows
             * @see https://tailwindcss.com/docs/grid-auto-rows
             */
            'auto-rows': [{ 'auto-rows': ['auto', 'min', 'max', 'fr', isCustomValue] }],
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            gap: [{ gap: [gap] }],
            /**
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-x': [{ 'gap-x': [gap] }],
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-y': [{ 'gap-y': [gap] }],
            /**
             * Justify Content
             * @see https://tailwindcss.com/docs/justify-content
             */
            'justify-content': [{ justify: getAlign() }],
            /**
             * Justify Items
             * @see https://tailwindcss.com/docs/justify-items
             */
            'justify-items': [{ 'justify-items': ['start', 'end', 'center', 'stretch'] }],
            /**
             * Justify Self
             * @see https://tailwindcss.com/docs/justify-self
             */
            'justify-self': [{ 'justify-self': ['auto', 'start', 'end', 'center', 'stretch'] }],
            /**
             * Align Content
             * @see https://tailwindcss.com/docs/align-content
             */
            'align-content': [{ content: getAlign() }],
            /**
             * Align Items
             * @see https://tailwindcss.com/docs/align-items
             */
            'align-items': [{ items: ['start', 'end', 'center', 'baseline', 'stretch'] }],
            /**
             * Align Self
             * @see https://tailwindcss.com/docs/align-self
             */
            'align-self': [{ self: ['auto', 'start', 'end', 'center', 'stretch', 'baseline'] }],
            /**
             * Place Content
             * @see https://tailwindcss.com/docs/place-content
             */
            'place-content': [{ 'place-content': [...getAlign(), 'stretch'] }],
            /**
             * Place Items
             * @see https://tailwindcss.com/docs/place-items
             */
            'place-items': [{ 'place-items': ['start', 'end', 'center', 'stretch'] }],
            /**
             * Place Self
             * @see https://tailwindcss.com/docs/place-self
             */
            'place-self': [{ 'place-self': ['auto', 'start', 'end', 'center', 'stretch'] }],
            // Spacing
            /**
             * Padding
             * @see https://tailwindcss.com/docs/padding
             */
            p: [{ p: [padding] }],
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            px: [{ px: [padding] }],
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            py: [{ py: [padding] }],
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            pt: [{ pt: [padding] }],
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            pr: [{ pr: [padding] }],
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            pb: [{ pb: [padding] }],
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            pl: [{ pl: [padding] }],
            /**
             * Margin
             * @see https://tailwindcss.com/docs/margin
             */
            m: [{ m: [margin] }],
            /**
             * Margin X
             * @see https://tailwindcss.com/docs/margin
             */
            mx: [{ mx: [margin] }],
            /**
             * Margin Y
             * @see https://tailwindcss.com/docs/margin
             */
            my: [{ my: [margin] }],
            /**
             * Margin Top
             * @see https://tailwindcss.com/docs/margin
             */
            mt: [{ mt: [margin] }],
            /**
             * Margin Right
             * @see https://tailwindcss.com/docs/margin
             */
            mr: [{ mr: [margin] }],
            /**
             * Margin Bottom
             * @see https://tailwindcss.com/docs/margin
             */
            mb: [{ mb: [margin] }],
            /**
             * Margin Left
             * @see https://tailwindcss.com/docs/margin
             */
            ml: [{ ml: [margin] }],
            /**
             * Space Between X
             * @see https://tailwindcss.com/docs/space
             */
            'space-x': [{ 'space-x': [space] }],
            /**
             * Space Between X Reverse
             * @see https://tailwindcss.com/docs/space
             */
            'space-x-reverse': ['space-x-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/space
             */
            'space-y': [{ 'space-y': [space] }],
            /**
             * Space Between Y Reverse
             * @see https://tailwindcss.com/docs/space
             */
            'space-y-reverse': ['space-y-reverse'],
            // Sizing
            /**
             * Width
             * @see https://tailwindcss.com/docs/width
             */
            w: [{ w: ['auto', 'min', 'max', spacing] }],
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            'min-w': [{ 'min-w': ['full', 'min', 'max', isLength] }],
            /**
             * Max-Width
             * @see https://tailwindcss.com/docs/max-width
             */
            'max-w': [
                {
                    'max-w': [
                        '0',
                        'none',
                        ...getSizesSimple(),
                        ...getSizesExtended(),
                        'full',
                        'min',
                        'max',
                        'prose',
                        { screen: getSizesSimple() },
                        isCustomLength,
                    ],
                },
            ],
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            h: [{ h: getSpacingWithAuto() }],
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            'min-h': [{ 'min-h': ['full', 'screen', isLength] }],
            /**
             * Max-Height
             * @see https://tailwindcss.com/docs/max-height
             */
            'max-h': [{ 'max-h': [spacing] }],
            // Typography
            /**
             * Font Family
             * @see https://tailwindcss.com/docs/font-family
             */
            'font-family': [{ font: [isAny] }],
            /**
             * Font Size
             * @see https://tailwindcss.com/docs/font-size
             */
            'font-size': [
                {
                    text: [
                        'xs',
                        ...getSizesSimple(),
                        'base',
                        ...getSizesExtended(),
                        '8xl',
                        '9xl',
                        isCustomLength,
                    ],
                },
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
            'font-weight': [
                {
                    font: [
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
                },
            ],
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
            'fvn-fraction': ['diagonal-fractions', 'stacked-fractons'],
            /**
             * Letter Spacing
             * @see https://tailwindcss.com/docs/letter-spacing
             */
            tracking: [
                {
                    tracking: [
                        'tighter',
                        'tight',
                        'normal',
                        'wide',
                        'wider',
                        'widest',
                        isCustomLength,
                    ],
                },
            ],
            /**
             * Line Height
             * @see https://tailwindcss.com/docs/line-height
             */
            leading: [
                { leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', isLength] },
            ],
            /**
             * List Style Type
             * @see https://tailwindcss.com/docs/list-style-type
             */
            'list-style-type': [{ list: ['none', 'disc', 'decimal', isCustomValue] }],
            /**
             * List Style Position
             * @see https://tailwindcss.com/docs/list-style-position
             */
            'list-style-position': [{ list: ['inside', 'outside'] }],
            /**
             * Placeholder Color
             * @see https://tailwindcss.com/docs/placeholder-color
             */
            'placeholder-color': [{ placeholder: [colors] }],
            /**
             * Placeholder Opacity
             * @see https://tailwindcss.com/docs/placeholder-opacity
             */
            'placeholder-opacity': [{ 'placeholder-opacity': [opacity] }],
            /**
             * Text Alignment
             * @see https://tailwindcss.com/docs/text-align
             */
            'text-alignment': [{ text: ['left', 'center', 'right', 'justify'] }],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            'text-color': [{ text: [colors] }],
            /**
             * Text Opacity
             * @see https://tailwindcss.com/docs/text-opacity
             */
            'text-opacity': [{ 'text-opacity': [opacity] }],
            /**
             * Text Decoration
             * @see https://tailwindcss.com/docs/text-decoration
             */
            'text-decoration': ['underline', 'line-through', 'no-underline'],
            /**
             * Text Transform
             * @see https://tailwindcss.com/docs/text-transform
             */
            'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
            /**
             * Text Overflow
             * @see https://tailwindcss.com/docs/text-overflow
             */
            'text-overflow': ['truncate', 'overflow-ellipsis', 'overflow-clip'],
            /**
             * Vertical Alignment
             * @see https://tailwindcss.com/docs/vertical-align
             */
            'vertival-alignment': [
                { align: ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom'] },
            ],
            /**
             * Whitespace
             * @see https://tailwindcss.com/docs/whitespace
             */
            whitespace: [{ whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'] }],
            /**
             * Word Break
             * @see https://tailwindcss.com/docs/word-break
             */
            break: [{ break: ['normal', 'words', 'all'] }],
            // Backgrounds
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
             * Background Opacity
             * @see https://tailwindcss.com/docs/background-opacity
             */
            'bg-opacity': [{ 'bg-opacity': [opacity] }],
            /**
             * Background Origin
             * @see https://tailwindcss.com/docs/background-origin
             */
            'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
            /**
             * Background Position
             * @see https://tailwindcss.com/docs/background-position
             */
            'bg-position': [{ bg: getPositions() }],
            /**
             * Background Repeat
             * @see https://tailwindcss.com/docs/background-repeat
             */
            'bg-repeeat': [{ bg: ['no-repeat', { repeat: ['', 'x', 'y', 'round', 'space'] }] }],
            /**
             * Background Size
             * @see https://tailwindcss.com/docs/background-size
             */
            'bg-size': [{ bg: ['auto', 'cover', 'contain'] }],
            /**
             * Background Image
             * @see https://tailwindcss.com/docs/background-image
             */
            'bg-image': [
                { bg: ['none', { 'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] }] },
            ],
            /**
             * Background Blend Mode
             * @see https://tailwindcss.com/docs/background-blend-mode
             */
            'bg-blend': [{ bg: getBlendModes() }],
            /**
             * Background Color
             * @see https://tailwindcss.com/docs/background-color
             */
            'bg-color': [{ bg: [colors] }],
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from': [{ from: [gradientColorStops] }],
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via': [{ via: [gradientColorStops] }],
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to': [{ to: [gradientColorStops] }],
            // Borders
            /**
             * Border Radius
             * @see https://tailwindcss.com/docs/border-radius
             */
            rounded: [{ rounded: [borderRadius] }],
            /**
             * Border Radius Top
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-t': [{ 'rounded-t': [borderRadius] }],
            /**
             * Border Radius Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-r': [{ 'rounded-r': [borderRadius] }],
            /**
             * Border Radius Bottom
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-b': [{ 'rounded-b': [borderRadius] }],
            /**
             * Border Radius Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-l': [{ 'rounded-l': [borderRadius] }],
            /**
             * Border Radius Top Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tl': [{ 'rounded-tl': [borderRadius] }],
            /**
             * Border Radius Top Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tr': [{ 'rounded-tr': [borderRadius] }],
            /**
             * Border Radius Bottom Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-br': [{ 'rounded-br': [borderRadius] }],
            /**
             * Border Radius Bottom Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-bl': [{ 'rounded-bl': [borderRadius] }],
            /**
             * Border Width
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w': [{ border: [borderWidth] }],
            /**
             * Border Width Top
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-t': [{ 'border-t': [borderWidth] }],
            /**
             * Border Width Right
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-r': [{ 'border-r': [borderWidth] }],
            /**
             * Border Width Bottom
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-b': [{ 'border-b': [borderWidth] }],
            /**
             * Border Width Left
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-l': [{ 'border-l': [borderWidth] }],
            /**
             * Border Opacity
             * @see https://tailwindcss.com/docs/border-opacity
             */
            'border-opacity': [{ 'border-opacity': [opacity] }],
            /**
             * Border Style
             * @see https://tailwindcss.com/docs/border-style
             */
            'border-style': [{ border: getBorderStyles() }],
            /**
             * Divide Width X
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-x': [{ 'divide-x': [borderWidth] }],
            /**
             * Divide Width X Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-x-reverse': ['divide-x-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-y': [{ 'divide-y': [borderWidth] }],
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-y-reverse': ['divide-y-reverse'],
            /**
             * Divide Opacity
             * @see https://tailwindcss.com/docs/divide-opacity
             */
            'divide-opacity': [{ 'divide-opacity': [opacity] }],
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/divide-style
             */
            'divide-style': [{ divide: getBorderStyles() }],
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color': [{ border: [borderColor] }],
            /**
             * Border Color Top
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-t': [{ 'border-t': [borderColor] }],
            /**
             * Border Color Right
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-r': [{ 'border-r': [borderColor] }],
            /**
             * Border Color Bottom
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-b': [{ 'border-b': [borderColor] }],
            /**
             * Border Color Left
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-l': [{ 'border-l': [borderColor] }],
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            'divide-color': [{ divide: [borderColor] }],
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/ring-width
             */
            'ring-w': [{ ring: getLengthWithEmpty() }],
            /**
             * Ring Width Inset
             * @see https://tailwindcss.com/docs/ring-width
             */
            'ring-w-inset': ['ring-inset'],
            /**
             * Ring Color
             * @see https://tailwindcss.com/docs/ring-color
             */
            'ring-color': [{ ring: [colors] }],
            /**
             * Ring Opacity
             * @see https://tailwindcss.com/docs/ring-opacity
             */
            'ring-opacity': [{ 'ring-opacity': [opacity] }],
            /**
             * Ring Offset Width
             * @see https://tailwindcss.com/docs/ring-offset-width
             */
            'ring-offset-w': [{ 'ring-offset': [isLength] }],
            /**
             * Ring Offset Color
             * @see https://tailwindcss.com/docs/ring-offset-color
             */
            'ring-offset-color': [{ 'ring-offset': [colors] }],
            // Effects
            /**
             * Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow
             */
            shadow: [{ shadow: ['', ...getSizesSimple(), 'inner', 'none'] }],
            /**
             * Opacity
             * @see https://tailwindcss.com/docs/opacity
             */
            opacity: [{ opacity: [opacity] }],
            /**
             * Mix Beldn Mode
             * @see https://tailwindcss.com/docs/mix-blend-mode
             */
            'mix-blend': [{ 'mix-blend': getBlendModes() }],
            // Filters
            /**
             * Filter
             * @see https://tailwindcss.com/docs/filter
             */
            filter: [{ filter: ['', 'none'] }],
            /**
             * Blur
             * @see https://tailwindcss.com/docs/blur
             */
            blur: [{ blur: [blur] }],
            /**
             * Brightness
             * @see https://tailwindcss.com/docs/brightness
             */
            brightness: [{ brightness: [brightness] }],
            /**
             * Contrast
             * @see https://tailwindcss.com/docs/contrast
             */
            contrast: [{ contrast: [contrast] }],
            /**
             * Drop Shadow
             * @see https://tailwindcss.com/docs/drop-shadow
             */
            'drop-shadow': [{ 'drop-shadow': ['', ...getSizesSimple(), 'none'] }],
            /**
             * Grayscale
             * @see https://tailwindcss.com/docs/grayscale
             */
            grayscale: [{ grayscale: [grayscale] }],
            /**
             * Hue Rotate
             * @see https://tailwindcss.com/docs/hue-rotate
             */
            'hue-rotate': [{ 'hue-rotate': [hueRotate] }],
            /**
             * Invert
             * @see https://tailwindcss.com/docs/invert
             */
            invert: [{ invert: [invert] }],
            /**
             * Saturate
             * @see https://tailwindcss.com/docs/saturate
             */
            saturate: [{ saturate: [saturate] }],
            /**
             * Sepia
             * @see https://tailwindcss.com/docs/sepia
             */
            sepia: [{ sepia: [sepia] }],
            /**
             * Backdrop Filter
             * @see https://tailwindcss.com/docs/backdrop-filter
             */
            'backdrop-filter': [{ 'backdrop-filter': ['', 'none'] }],
            /**
             * Backdrop Blur
             * @see https://tailwindcss.com/docs/backdrop-blur
             */
            'backdrop-blur': [{ 'backdrop-blur': [blur] }],
            /**
             * Backdrop Brightness
             * @see https://tailwindcss.com/docs/backdrop-brightness
             */
            'backdrop-brightness': [{ 'backdrop-brightness': [brightness] }],
            /**
             * Backdrop Contrast
             * @see https://tailwindcss.com/docs/backdrop-contrast
             */
            'backdrop-contrast': [{ 'backdrop-contrast': [contrast] }],
            /**
             * Backdrop Grayscale
             * @see https://tailwindcss.com/docs/backdrop-grayscale
             */
            'backdrop-grayscale': [{ 'backdrop-grayscale': [grayscale] }],
            /**
             * Backdrop Hue Rotate
             * @see https://tailwindcss.com/docs/backdrop-hue-rotate
             */
            'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [hueRotate] }],
            /**
             * Backdrop Invert
             * @see https://tailwindcss.com/docs/backdrop-invert
             */
            'backdrop-invert': [{ 'backdrop-invert': [invert] }],
            /**
             * Backdrop Opacity
             * @see https://tailwindcss.com/docs/backdrop-opacity
             */
            'backdrop-opacity': [{ 'backdrop-opacity': [opacity] }],
            /**
             * Backdrop Saturate
             * @see https://tailwindcss.com/docs/backdrop-saturate
             */
            'backdrop-saturate': [{ 'backdrop-saturate': [saturate] }],
            /**
             * Backdrop Sepia
             * @see https://tailwindcss.com/docs/backdrop-sepia
             */
            'backdrop-sepia': [{ 'backdrop-sepia': [sepia] }],
            // Tables
            /**
             * Border Collapse
             * @see https://tailwindcss.com/docs/border-collapse
             */
            'border-collapse': [{ border: ['collapse', 'separate'] }],
            /**
             * Table Layout
             * @see https://tailwindcss.com/docs/table-layout
             */
            'table-layout': [{ table: ['auto', 'fixed'] }],
            // Transitions and Animation
            /**
             * Tranisition Property
             * @see https://tailwindcss.com/docs/transition-property
             */
            transition: [
                {
                    transition: [
                        'none',
                        'all',
                        '',
                        'colors',
                        'opacity',
                        'shadow',
                        'transform',
                        isCustomValue,
                    ],
                },
            ],
            /**
             * Transition Duration
             * @see https://tailwindcss.com/docs/transition-duration
             */
            duration: [{ duration: [isInteger] }],
            /**
             * Transition Timing Function
             * @see https://tailwindcss.com/docs/transition-timing-function
             */
            ease: [{ ease: ['linear', 'in', 'out', 'in-out', isCustomValue] }],
            /**
             * Transition Delay
             * @see https://tailwindcss.com/docs/transition-delay
             */
            delay: [{ delay: [isInteger] }],
            /**
             * Animation
             * @see https://tailwindcss.com/docs/animation
             */
            animate: [{ animate: ['none', 'spin', 'ping', 'pulse', 'bounce', isCustomValue] }],
            // Transforms
            /**
             * Transform
             * @see https://tailwindcss.com/docs/transform
             */
            transform: [{ transform: ['', 'gpu', 'none'] }],
            /**
             * Transform Origin
             * @see https://tailwindcss.com/docs/transform-origin
             */
            'transform-origin': [
                {
                    origin: [
                        'center',
                        'top',
                        'top-right',
                        'right',
                        'bottom-right',
                        'bottom',
                        'bottom-left',
                        'left',
                        'top-left',
                    ],
                },
            ],
            /**
             * Scale
             * @see https://tailwindcss.com/docs/scale
             */
            scale: [{ scale: [scale] }],
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-x': [{ 'scale-x': [scale] }],
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-y': [{ 'scale-y': [scale] }],
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            rotate: [{ rotate: [isInteger] }],
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-x': [{ 'translate-x': [translate] }],
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-y': [{ 'translate-y': [translate] }],
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-x': [{ 'skew-x': [skew] }],
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-y': [{ 'skew-y': [skew] }],
            // Interactivity
            /**
             * Appearance
             * @see https://tailwindcss.com/docs/appearance
             */
            appearance: ['appearance-none'],
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
                        isCustomValue,
                    ],
                },
            ],
            /**
             * Outline
             * @see https://tailwindcss.com/docs/outline
             */
            outline: [{ outline: ['none', 'white', 'black'] }],
            /**
             * Pointer Events
             * @see https://tailwindcss.com/docs/pointer-events
             */
            'pointer-events': [{ 'pointer-events': ['none', 'auto'] }],
            /**
             * Resize
             * @see https://tailwindcss.com/docs/resize
             */
            resize: [{ resize: ['none', 'y', 'x', ''] }],
            /**
             * Select
             * @see https://tailwindcss.com/docs/select
             */
            select: [{ select: ['none', 'text', 'all', 'auto'] }],
            // SVG
            /**
             * Fill
             * @see https://tailwindcss.com/docs/fill
             */
            fill: [{ fill: ['current', isCustomValue] }],
            /**
             * Stroke
             * @see https://tailwindcss.com/docs/stroke
             */
            stroke: [{ stroke: ['current', isCustomValue] }],
            /**
             * Stroke Width
             * @see https://tailwindcss.com/docs/stroke-width
             */
            'stroke-w': [{ stroke: [isLength] }],
            // Accessibility
            /**
             * Screen Readers
             * @see https://tailwindcss.com/docs/screen-readers
             */
            sr: ['sr-only', 'not-sr-only'],
            // Just-in-Time Mode
            /**
             * Content
             * @see https://tailwindcss.com/docs/just-in-time-mode#content-utilities
             */
            content: [{ content: [isCustomValue] }],
            /**
             * Caret Color
             * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
             */
            'caret-color': [{ caret: [colors] }],
        },
        conflictingClassGroups: {
            overflow: ['overflow-x', 'overflow-y'],
            overscroll: ['overscroll-x', 'overscroll-y'],
            inset: ['inset-x', 'inset-y', 'top', 'right', 'bottom', 'left'],
            'inset-x': ['right', 'left'],
            'inset-y': ['top', 'bottom'],
            flex: ['flex-grow', 'flex-shrink'],
            'col-start-end': ['col-start', 'col-end'],
            'row-start-end': ['row-start', 'row-end'],
            gap: ['gap-x', 'gap-y'],
            p: ['px', 'py', 'pt', 'pr', 'pb', 'pl'],
            px: ['pr', 'pl'],
            py: ['pt', 'pb'],
            m: ['mx', 'my', 'mt', 'mr', 'mb', 'ml'],
            mx: ['mr', 'ml'],
            my: ['mt', 'mb'],
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
            rounded: [
                'rounded-t',
                'rounded-r',
                'rounded-b',
                'rounded-l',
                'rounded-tl',
                'rounded-tr',
                'rounded-br',
                'rounded-bl',
            ],
            'rounded-t': ['rounded-tl', 'rounded-tr'],
            'rounded-r': ['rounded-tr', 'rounded-br'],
            'rounded-b': ['rounded-br', 'rounded-bl'],
            'rounded-l': ['rounded-tl', 'rounded-bl'],
            'border-w': ['border-w-t', 'border-w-r', 'border-w-b', 'border-w-l'],
            'border-color': [
                'border-color-t',
                'border-color-r',
                'border-color-b',
                'border-color-l',
            ],
        },
    } as const
}
