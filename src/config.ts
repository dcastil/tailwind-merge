const SPACING_ABSOLUTE = [
    '0',
    'px',
    '0.5',
    '1',
    '1.5',
    '2',
    '2.5',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '14',
    '16',
    '20',
    '24',
    '28',
    '32',
    '36',
    '40',
    '44',
    '48',
    '52',
    '56',
    '60',
    '64',
    '72',
    '80',
    '96',
] as const
const SPACING_VARIABLE_SIMPLE = ['1/2', '1/3', '2/3', '1/4', '2/4', '3/4', 'full'] as const
const SPACING_VARIABLE_EXTENDED = [
    '1/5',
    '2/5',
    '3/5',
    '4/5',
    '1/6',
    '2/6',
    '3/6',
    '4/6',
    '5/6',
    '1/12',
    '2/12',
    '3/12',
    '4/12',
    '5/12',
    '6/12',
    '7/12',
    '8/12',
    '9/12',
    '10/12',
    '11/12',
    'screen',
] as const
const SIZES_SIMPLE = ['sm', 'md', 'lg', 'xl', '2xl'] as const
const SIZES_EXTENDED = ['3xl', '4xl', '5xl', '6xl', '7xl'] as const
const OVERSCROLL = ['auto', 'contain', 'none'] as const
const OVERFLOW = ['auto', 'hidden', 'visible', 'scroll'] as const
const PLACEMENT_POSITION = [...SPACING_ABSOLUTE, ...SPACING_VARIABLE_SIMPLE] as const
const MARGIN = [...SPACING_ABSOLUTE, 'auto'] as const
const OPACITIES = [
    '0',
    '5',
    '10',
    '20',
    '30',
    '40',
    '50',
    '60',
    '70',
    '75',
    '80',
    '90',
    '95',
    '100',
] as const
;(OPACITIES as any).delimiter = '/'
const COLOR_SCALE = [
    {
        '50': OPACITIES,
        '100': OPACITIES,
        '200': OPACITIES,
        '300': OPACITIES,
        '400': OPACITIES,
        '500': OPACITIES,
        '600': OPACITIES,
        '700': OPACITIES,
        '800': OPACITIES,
        '900': OPACITIES,
    },
] as const
const COLORS = [
    'transparent',
    'current',
    'black',
    'white',
    {
        gray: COLOR_SCALE,
        red: COLOR_SCALE,
        yellow: COLOR_SCALE,
        green: COLOR_SCALE,
        blue: COLOR_SCALE,
        indigo: COLOR_SCALE,
        purple: COLOR_SCALE,
        pink: COLOR_SCALE,
    },
] as const
const POSITIONS = [
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
const ROUNDED = ['none', '', ...SIZES_SIMPLE, '3xl', 'full'] as const
const BORDERS = ['0', '2', '4', '8', ''] as const
const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'] as const
const BLEND_MODES = [
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
const SCALES = ['0', '50', '75', '90', '95', '100', '105', '110', '125', '150'] as const

export const CONFIG = {
    prefixes: [
        ...SIZES_SIMPLE,
        'dark',
        'motion-safe',
        'motion-reduce',
        'first',
        'last',
        'odd',
        'even',
        'visited',
        'checked',
        'group-hover',
        'group-focus',
        'focus-within',
        'hover',
        'focus',
        'focus-visible',
        'active',
        'disabled',
    ],
    adjustableClasses: {
        // Layout
        decoration: [
            /**
             * Box Decoration Break
             * @see https://tailwindcss.com/docs/box-decoration-break
             */
            ['slice', 'clone'],
        ],
        box: [
            /**
             * Box Sizing
             * @see https://tailwindcss.com/docs/box-sizing
             */
            ['border', 'content'],
        ],
        float: [
            /**
             * Floats
             * @see https://tailwindcss.com/docs/float
             */
            ['right', 'left', 'none'],
        ],
        clear: [
            /**
             * Clear
             * @see https://tailwindcss.com/docs/clear
             */
            ['left', 'right', 'both', 'none'],
        ],
        object: [
            /**
             * Object Fit
             * @see https://tailwindcss.com/docs/object-fit
             */
            ['contain', 'cover', 'fill', 'none', 'scale-down'],
            /**
             * Object Position
             * @see https://tailwindcss.com/docs/object-position
             */
            POSITIONS,
        ],
        overflow: [
            /**
             * Overflow
             * @see https://tailwindcss.com/docs/overflow
             */
            OVERFLOW,
            /**
             * Overflow X
             * @see https://tailwindcss.com/docs/overflow
             */
            [{ x: OVERFLOW }],
            /**
             * Overflow Y
             * @see https://tailwindcss.com/docs/overflow
             */
            [{ y: OVERFLOW }],
        ],
        overscroll: [
            /**
             * Overscroll Behavior
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            OVERSCROLL,
            /**
             * Overscroll Behavior X
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            [{ x: OVERSCROLL }],
            /**
             * Overscroll Behavior Y
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            [{ y: OVERSCROLL }],
        ],
        inset: [
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            PLACEMENT_POSITION,
            /**
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            [{ x: PLACEMENT_POSITION }],
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            [{ y: PLACEMENT_POSITION }],
        ],
        top: [
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            PLACEMENT_POSITION,
        ],
        right: [
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            PLACEMENT_POSITION,
        ],
        bottom: [
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            PLACEMENT_POSITION,
        ],
        left: [
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            PLACEMENT_POSITION,
        ],
        z: [
            /**
             * Z-Index
             * @see https://tailwindcss.com/docs/z-index
             */
            ['0', '10', '20', '30', '40', '50', 'auto'],
        ],
        // Flexbox and Grid
        flex: [
            /**
             * Flex Direction
             * @see https://tailwindcss.com/docs/flex-direction
             */
            ['row', 'row-reverse', 'col', 'col-reverse'],
            /**
             * Flex Wrap
             * @see https://tailwindcss.com/docs/flex-wrap
             */
            ['wrap', 'wrap-reverse', 'nowrap'],
            /**
             * Flex
             * @see https://tailwindcss.com/docs/flex
             */
            ['1', 'auto', 'initial', 'none'],
            /**
             * Flex Grow
             * @see https://tailwindcss.com/docs/flex-grow
             */
            [{ grow: ['0', ''] }],
            /**
             * Flex Shrink
             * @see https://tailwindcss.com/docs/flex-shrink
             */
            [{ shrink: ['0', ''] }],
        ],
        order: [
            /**
             * Order
             * @see https://tailwindcss.com/docs/order
             */
            [
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                '11',
                '12',
                'first',
                'last',
                'none',
            ],
        ],
        grid: [
            /**
             * Grid Template Columns
             * @see https://tailwindcss.com/docs/grid-template-columns
             */
            [
                {
                    cols: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'none']],
                },
            ],
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            [{ rows: ['1', '2', '3', '4', '5', '6', 'none'] }],
            /**
             * Grid Auto Flow
             * @see https://tailwindcss.com/docs/grid-auto-flow
             */
            [{ flow: ['row', 'col', 'row-dense', 'col-dense'] }],
        ],
        col: [
            /**
             * Grid Column Start / End
             * @see https://tailwindcss.com/docs/grid-column
             */
            [
                'auto',
                { span: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'full'] },
            ],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            [
                {
                    start: [
                        '1',
                        '2',
                        '3',
                        '4',
                        '5',
                        '6',
                        '7',
                        '8',
                        '9',
                        '10',
                        '11',
                        '12',
                        '13',
                        'auto',
                    ],
                },
            ],
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            [
                {
                    end: [
                        '1',
                        '2',
                        '3',
                        '4',
                        '5',
                        '6',
                        '7',
                        '8',
                        '9',
                        '10',
                        '11',
                        '12',
                        '13',
                        'auto',
                    ],
                },
            ],
        ],
        row: [
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            ['auto', { span: ['1', '2', '3', '4', '5', '6', 'full'] }],
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            [{ start: ['1', '2', '3', '4', '5', '6', '7', 'auto'] }],
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            [{ end: ['1', '2', '3', '4', '5', '6', '7', 'auto'] }],
        ],
        auto: [
            /**
             * Grid Auto Columns
             * @see https://tailwindcss.com/docs/grid-auto-columns
             */
            [{ cols: ['auto', 'min', 'max', 'fr'] }],
            /**
             * Grid Auto Rows
             * @see https://tailwindcss.com/docs/grid-auto-rows
             */
            [{ rows: ['auto', 'min', 'max', 'fr'] }],
        ],
        gap: [
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            SPACING_ABSOLUTE,
            /**
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            [{ x: SPACING_ABSOLUTE }],
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            [{ y: SPACING_ABSOLUTE }],
        ],
        justify: [
            /**
             * Justify Content
             * @see https://tailwindcss.com/docs/justify-content
             */
            ['start', 'end', 'center', 'between', 'around', 'evenly'],
            /**
             * Justify Items
             * @see https://tailwindcss.com/docs/justify-items
             */
            [{ items: ['start', 'end', 'center', 'stretch'] }],
            /**
             * Justify Self
             * @see https://tailwindcss.com/docs/justify-self
             */
            [{ self: ['auto', 'start', 'end', 'center', 'stretch'] }],
        ],
        content: [
            /**
             * Align Content
             * @see https://tailwindcss.com/docs/align-content
             */
            ['center', 'start', 'end', 'between', 'around', 'evenly'],
        ],
        items: [
            /**
             * Align Items
             * @see https://tailwindcss.com/docs/align-items
             */
            ['start', 'end', 'center', 'baseline', 'stretch'],
        ],
        self: [
            /**
             * Align Self
             * @see https://tailwindcss.com/docs/align-self
             */
            ['auto', 'start', 'end', 'center', 'stretch'],
        ],
        place: [
            /**
             * Place Content
             * @see https://tailwindcss.com/docs/place-content
             */
            [{ content: ['center', 'start', 'end', 'between', 'around', 'evenly', 'stretch'] }],
            /**
             * Place Items
             * @see https://tailwindcss.com/docs/place-items
             */
            [{ items: ['start', 'end', 'center', 'stretch'] }],
            /**
             * Place Self
             * @see https://tailwindcss.com/docs/place-self
             */
            [{ self: ['auto', 'start', 'end', 'center', 'stretch'] }],
        ],
        // Spacing
        p: [
            /**
             * Padding
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        px: [
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        py: [
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        pt: [
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        pr: [
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        pb: [
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        pl: [
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            SPACING_ABSOLUTE,
        ],
        m: [
            /**
             * Margin
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        mx: [
            /**
             * Margin X
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        my: [
            /**
             * Margin Y
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        mt: [
            /**
             * Margin Top
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        mr: [
            /**
             * Margin Right
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        mb: [
            /**
             * Margin Bottom
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        ml: [
            /**
             * Margin Left
             * @see https://tailwindcss.com/docs/margin
             */
            MARGIN,
        ],
        space: [
            /**
             * Space Between X Reverse
             * @see https://tailwindcss.com/docs/space
             */
            ['x-reverse'],
            /**
             * Space Between X
             * @see https://tailwindcss.com/docs/space
             */
            [{ x: SPACING_ABSOLUTE }],
            /**
             * Space Between Y Reverse
             * @see https://tailwindcss.com/docs/space
             */
            ['y-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/space
             */
            [{ y: SPACING_ABSOLUTE }],
        ],
        // Sizing
        w: [
            /**
             * Width
             * @see https://tailwindcss.com/docs/width
             */
            [
                ...SPACING_ABSOLUTE,
                ...SPACING_VARIABLE_SIMPLE,
                'auto',
                ...SPACING_VARIABLE_EXTENDED,
                'min',
                'max',
            ],
        ],
        min: [
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            [{ w: ['0', 'full', 'min', 'max'] }],
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            [{ h: ['0', 'full', 'screen'] }],
        ],
        max: [
            /**
             * Max-Width
             * @see https://tailwindcss.com/docs/max-width
             */
            [
                {
                    w: [
                        '0',
                        'none',
                        ...SIZES_SIMPLE,
                        ...SIZES_EXTENDED,
                        'full',
                        'min',
                        'max',
                        'prose',
                        { screen: SIZES_SIMPLE },
                    ],
                },
            ],
            /**
             * Max-Height
             * @see https://tailwindcss.com/docs/max-height
             */
            [{ h: [...SPACING_ABSOLUTE, 'full', 'screen'] }],
        ],
        h: [
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            [...SPACING_ABSOLUTE, ...SPACING_VARIABLE_SIMPLE, 'auto', ...SPACING_VARIABLE_EXTENDED],
        ],
        // Typography
        font: [
            /**
             * Font Family
             * @see https://tailwindcss.com/docs/font-family
             */
            ['sans', 'serif', 'mono'],
            /**
             * Font Weight
             * @see https://tailwindcss.com/docs/font-weight
             */
            [
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
        ],
        text: [
            /**
             * Font Size
             * @see https://tailwindcss.com/docs/font-size
             */
            ['xs', ...SIZES_SIMPLE, 'base', ...SIZES_EXTENDED, '8xl', '9xl'],
            /**
             * Text Alignment
             * @see https://tailwindcss.com/docs/text-align
             */
            ['left', 'center', 'right', 'justify'],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            COLORS,
            /**
             * Text Opacity
             * @see https://tailwindcss.com/docs/text-opacity
             */
            [{ opacity: OPACITIES }],
        ],
        tracking: [
            /**
             * Letter Spacing
             * @see https://tailwindcss.com/docs/letter-spacing
             */
            ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
        ],
        leading: [
            /**
             * Line Height
             * @see https://tailwindcss.com/docs/line-height
             */
            [
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                'none',
                'tight',
                'snug',
                'normal',
                'relaxed',
                'loose',
            ],
        ],
        list: [
            /**
             * List Style Type
             * @see https://tailwindcss.com/docs/list-style-type
             */
            ['none', 'disc', 'decimal'],
            /**
             * List Style Position
             * @see https://tailwindcss.com/docs/list-style-position
             */
            ['inside', 'outside'],
        ],
        placeholder: [
            /**
             * Placeholder Color
             * @see https://tailwindcss.com/docs/placeholder-color
             */
            COLORS,
            /**
             * Placeholder Opacity
             * @see https://tailwindcss.com/docs/placeholder-opacity
             */
            [{ opacity: OPACITIES }],
        ],
        align: [
            /**
             * Vertical Alignment
             * @see https://tailwindcss.com/docs/vertical-align
             */
            ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom'],
        ],
        whitespace: [
            /**
             * Whitespace
             * @see https://tailwindcss.com/docs/whitespace
             */
            ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'],
        ],
        break: [
            /**
             * Word Break
             * @see https://tailwindcss.com/docs/word-break
             */
            ['normal', 'words', 'all'],
        ],
        // Backgrounds
        bg: [
            /**
             * Background Attachment
             * @see https://tailwindcss.com/docs/background-attachment
             */
            ['fixed', 'local', 'scroll'],
            /**
             * Background Clip
             * @see https://tailwindcss.com/docs/background-clip
             */
            [{ clip: ['border', 'padding', 'content', 'text'] }],
            /**
             * Background Color
             * @see https://tailwindcss.com/docs/background-color
             */
            COLORS,
            /**
             * Background Opacity
             * @see https://tailwindcss.com/docs/background-opacity
             */
            [{ opacity: OPACITIES }],
            /**
             * Background Origin
             * @see https://tailwindcss.com/docs/background-origin
             */
            [{ origin: ['border', 'padding', 'content'] }],
            /**
             * Background Position
             * @see https://tailwindcss.com/docs/background-position
             */
            POSITIONS,
            /**
             * Background Repeat
             * @see https://tailwindcss.com/docs/background-repeat
             */
            ['repeat', 'no-repeat', { repeat: ['x', 'y', 'round', 'space'] }],
            /**
             * Background Size
             * @see https://tailwindcss.com/docs/background-size
             */
            ['auto', 'cover', 'contain'],
            /**
             * Background Image
             * @see https://tailwindcss.com/docs/background-image
             */
            ['none', { 'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] }],
            /**
             * Background Blend Mode
             * @see https://tailwindcss.com/docs/background-blend-mode
             */
            BLEND_MODES,
        ],
        from: [
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            COLORS,
        ],
        via: [
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            COLORS,
        ],
        to: [
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            COLORS,
        ],
        // Borders
        rounded: [
            /**
             * Border Radius
             * @see https://tailwindcss.com/docs/border-radius
             */
            ROUNDED,
            /**
             * Border Radius Top
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ t: ROUNDED }],
            /**
             * Border Radius Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ r: ROUNDED }],
            /**
             * Border Radius Bottom
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ b: ROUNDED }],
            /**
             * Border Radius Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ l: ROUNDED }],
            /**
             * Border Radius Top Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ tl: ROUNDED }],
            /**
             * Border Radius Top Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ tr: ROUNDED }],
            /**
             * Border Radius Bottom Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ br: ROUNDED }],
            /**
             * Border Radius Bottom Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            [{ bl: ROUNDED }],
        ],
        border: [
            /**
             * Border Width
             * @see https://tailwindcss.com/docs/border-width
             */
            BORDERS,
            /**
             * Border Width Top
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ t: BORDERS }],
            /**
             * Border Width Right
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ r: BORDERS }],
            /**
             * Border Width Bottom
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ b: BORDERS }],
            /**
             * Border Width Left
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ l: BORDERS }],
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            COLORS,
            /**
             * Border Opacity
             * @see https://tailwindcss.com/docs/border-opacity
             */
            [{ opacity: OPACITIES }],
            /**
             * Border Style
             * @see https://tailwindcss.com/docs/border-style
             */
            BORDER_STYLES,
            /**
             * Border Collapse
             * @see https://tailwindcss.com/docs/border-collapse
             */
            ['collapse', 'separate'],
        ],
        divide: [
            /**
             * Divide Width X Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            ['x-reverse'],
            /**
             * Divide Width X
             * @see https://tailwindcss.com/docs/divide-width
             */
            [{ x: BORDERS }],
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            ['y-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/divide-width
             */
            [{ y: BORDERS }],
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            COLORS,
            /**
             * Divide Opacity
             * @see https://tailwindcss.com/docs/divide-opacity
             */
            [{ opacity: OPACITIES }],
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/divide-style
             */
            BORDER_STYLES,
        ],
        ring: [
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/ring-width
             */
            ['0', '1', '2', '4', '8', ''],
            /**
             * Ring Width Inset
             * @see https://tailwindcss.com/docs/ring-width
             */
            ['inset'],
            /**
             * Ring Color
             * @see https://tailwindcss.com/docs/ring-color
             */
            COLORS,
            /**
             * Ring Opacity
             * @see https://tailwindcss.com/docs/ring-opacity
             */
            [{ opacity: OPACITIES }],
            /**
             * Ring Offset Width
             * @see https://tailwindcss.com/docs/ring-offset-width
             */
            [{ offset: ['0', '1', '2', '4', '8'] }],
            /**
             * Ring Offset Color
             * @see https://tailwindcss.com/docs/ring-offset-color
             */
            [{ offset: COLORS }],
        ],
        // Effects
        shadow: [
            /**
             * Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow
             */
            ['', ...SIZES_SIMPLE, 'inner', 'none'],
        ],
        opacity: [
            /**
             * Opacity
             * @see https://tailwindcss.com/docs/opacity
             */
            OPACITIES,
        ],
        mix: [
            /**
             * Mix Beldn Mode
             * @see https://tailwindcss.com/docs/mix-blend-mode
             */
            BLEND_MODES,
        ],
        // Filters
        filter: [
            /**
             * Filter
             * @see https://tailwindcss.com/docs/filter
             */
            ['', 'none'],
        ],
        blur: [
            /**
             * Blur
             * @see https://tailwindcss.com/docs/blur
             */
            ['none', '', ...SIZES_SIMPLE, '3xl'],
        ],
        brightness: [
            /**
             * Brightness
             * @see https://tailwindcss.com/docs/brightness
             */
            ['0', '50', '75', '90', '95', '100', '105', '110', '125', '150', '200'],
        ],
        contrast: [
            /**
             * Contrast
             * @see https://tailwindcss.com/docs/contrast
             */
            ['0', '50', '75', '100', '125', '150', '200'],
        ],
        drop: [
            /**
             * Drop Shadow
             * @see https://tailwindcss.com/docs/drop-shadow
             */
            { shadow: ['', ...SIZES_SIMPLE, 'none'] },
        ],
        grayscale: [
            /**
             * Grayscale
             * @see https://tailwindcss.com/docs/grayscale
             */
            ['0', ''],
        ],
        hue: [
            /**
             * Hue Rotate
             * @see https://tailwindcss.com/docs/hue-rotate
             */
            [{ rotate: ['0', '15', '30', '60', '90', '180'] }],
        ],
        invert: [
            /**
             * Invert
             * @see https://tailwindcss.com/docs/invert
             */
            ['0', ''],
        ],
        saturate: [
            /**
             * Saturate
             * @see https://tailwindcss.com/docs/saturate
             */
            ['0', '50', '100', '150', '200'],
        ],
        sepia: [
            /**
             * Sepia
             * @see https://tailwindcss.com/docs/sepia
             */
            ['0', ''],
        ],
        backdrop: [
            /**
             * Backdrop Filter
             * @see https://tailwindcss.com/docs/backdrop-filter
             */
            [{ filter: ['', 'none'] }],
            /**
             * Backdrop Blur
             * @see https://tailwindcss.com/docs/backdrop-blur
             */
            [{ blur: ['none', '', ...SIZES_SIMPLE, '3xl'] }],
            /**
             * Backdrop Brightness
             * @see https://tailwindcss.com/docs/backdrop-brightness
             */
            [
                {
                    brightness: [
                        '0',
                        '50',
                        '75',
                        '90',
                        '95',
                        '100',
                        '105',
                        '110',
                        '125',
                        '150',
                        '200',
                    ],
                },
            ],
            /**
             * Backdrop Contrast
             * @see https://tailwindcss.com/docs/backdrop-contrast
             */
            [{ contrast: ['0', '50', '75', '100', '125', '150', '200'] }],
            /**
             * Backdrop Grayscale
             * @see https://tailwindcss.com/docs/backdrop-grayscale
             */
            [{ grayscale: ['0', ''] }],
            /**
             * Backdrop Hue Rotate
             * @see https://tailwindcss.com/docs/backdrop-hue-rotate
             */
            [{ 'hue-rotate': ['0', '15', '30', '60', '90', '180'] }],
            /**
             * Backdrop Invert
             * @see https://tailwindcss.com/docs/backdrop-invert
             */
            [{ invert: ['0', ''] }],
            /**
             * Backdrop Opacity
             * @see https://tailwindcss.com/docs/backdrop-opacity
             */
            [{ opacity: OPACITIES }],
            /**
             * Backdrop Saturate
             * @see https://tailwindcss.com/docs/backdrop-saturate
             */
            [{ saturate: ['0', '50', '100', '150', '200'] }],
            /**
             * Backdrop Sepia
             * @see https://tailwindcss.com/docs/backdrop-sepia
             */
            [{ sepia: ['0', ''] }],
        ],
        // Tables
        table: [
            /**
             * Table Layout
             * @see https://tailwindcss.com/docs/table-layout
             */
            ['auto', 'fixed'],
        ],
        // Transitions and Animation
        transition: [
            /**
             * Tranisition Property
             * @see https://tailwindcss.com/docs/transition-property
             */
            ['none', 'all', '', 'colors', 'opacity', 'shadow', 'transform'],
        ],
        duration: [
            /**
             * Transition Duration
             * @see https://tailwindcss.com/docs/transition-duration
             */
            ['75', '100', '150', '200', '300', '500', '700', '1000'],
        ],
        ease: [
            /**
             * Transition Timing Function
             * @see https://tailwindcss.com/docs/transition-timing-function
             */
            ['linear', 'in', 'out', 'in-out'],
        ],
        delay: [
            /**
             * Transition Delay
             * @see https://tailwindcss.com/docs/transition-delay
             */
            ['75', '100', '150', '200', '300', '500', '700', '1000'],
        ],
        animate: [
            /**
             * Animation
             * @see https://tailwindcss.com/docs/animation
             */
            ['none', 'spin', 'ping', 'pulse', 'bounce'],
        ],
        // Transforms
        transform: [
            /**
             * Transform
             * @see https://tailwindcss.com/docs/transform
             */
            ['', 'gpu', 'none'],
            /**
             * Transform Origin
             * @see https://tailwindcss.com/docs/transform-origin
             */
            [
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
        ],
        scale: [
            /**
             * Scale
             * @see https://tailwindcss.com/docs/scale
             */
            SCALES,
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            [{ x: SCALES }],
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            [{ y: SCALES }],
        ],
        rotate: [
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            ['0', '1', '2', '3', '6', '12', '45', '90', '180'],
        ],
        translate: [
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            [{ x: [...SPACING_ABSOLUTE, ...SPACING_VARIABLE_SIMPLE] }],
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            [{ y: [...SPACING_ABSOLUTE, ...SPACING_VARIABLE_SIMPLE] }],
        ],
        skew: [
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            [{ x: ['0', '1', '2', '3', '6', '12'] }],
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            [{ y: ['0', '1', '2', '3', '6', '12'] }],
        ],
        // Interactivity
        cursor: [
            /**
             * Cursor
             * @see https://tailwindcss.com/docs/cursor
             */
            ['auto', 'default', 'pointer', 'wait', 'text', 'move', 'help', 'not-allowed'],
        ],
        outline: [
            /**
             * Outline
             * @see https://tailwindcss.com/docs/outline
             */
            ['none', 'white', 'black'],
        ],
        pointer: [
            /**
             * Pointer Events
             * @see https://tailwindcss.com/docs/pointer-events
             */
            [{ events: ['none', 'auto'] }],
        ],
        resize: [
            /**
             * Resize
             * @see https://tailwindcss.com/docs/resize
             */
            ['none', 'y', 'x', ''],
        ],
        select: [
            /**
             * Select
             * @see https://tailwindcss.com/docs/select
             */
            ['none', 'text', 'all', 'auto'],
        ],
        stroke: [
            /**
             * Stroke
             * @see https://tailwindcss.com/docs/stroke
             */
            ['current'],
            /**
             * Stroke Width
             * @see https://tailwindcss.com/docs/stroke-width
             */
            ['0', '1', '2'],
        ],
    },
    standaloneClasses: [
        // Layout
        /**
         * Container
         * @see https://tailwindcss.com/docs/container
         */
        ['container'],
        /**
         * Display
         * @see https://tailwindcss.com/docs/display
         */
        [
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
         * Isolation
         * @see https://tailwindcss.com/docs/isolation
         */
        ['isolate', 'isolation-auto'],
        /**
         * Position
         * @see https://tailwindcss.com/docs/position
         */
        ['static', 'fixed', 'absolute', 'relative', 'sticky'],
        /**
         * Visibility
         * @see https://tailwindcss.com/docs/visibility
         */
        ['visible', 'invisible'],
        // Typography
        /**
         * Font Smoothing
         * @see https://tailwindcss.com/docs/font-smoothing
         */
        ['antialiased', 'subpixel-antialiased'],
        /**
         * Font Style
         * @see https://tailwindcss.com/docs/font-style
         */
        ['italic', 'not-italic'],
        /**
         * Font Variant Numeric
         * @see https://tailwindcss.com/docs/font-variant-numeric
         */
        [
            'normal-nums',
            'ordinal',
            'slashed-zero',
            'lining-nums',
            'oldstyle-nums',
            'tabular-nums',
            'diagonal-nums',
            'stacked-fractons',
        ],
        /**
         * Text Decoration
         * @see https://tailwindcss.com/docs/text-decoration
         */
        ['underline', 'line-through', 'no-underline'],
        /**
         * Text Transform
         * @see https://tailwindcss.com/docs/text-transform
         */
        ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
        /**
         * Text Overflow
         * @see https://tailwindcss.com/docs/text-overflow
         */
        ['truncate', 'overflow-ellipsis', 'overflow-clip'],
        // Interactivity
        /**
         * Appearance
         * @see https://tailwindcss.com/docs/appearance
         */
        ['appearance-none'],
        // SVG
        /**
         * Fill
         * @see https://tailwindcss.com/docs/fill
         */
        ['fill-current'],
        // Accessibility
        /**
         * Screen Readers
         * @see https://tailwindcss.com/docs/screen-readers
         */
        ['sr-only', 'not-sr-only'],
    ],
    conflictingClasses: [
        {
            creators: [{ overflow: OVERFLOW }],
            receivers: [{ 'overflow-x': OVERFLOW, 'overflow-y': OVERFLOW }],
        },
        {
            creators: [{ overscroll: OVERSCROLL }],
            receivers: [{ 'overscroll-x': OVERSCROLL, 'overscroll-y': OVERSCROLL }],
        },
        {
            creators: [{ inset: PLACEMENT_POSITION }],
            receivers: [
                {
                    'inset-x': PLACEMENT_POSITION,
                    'inset-y': PLACEMENT_POSITION,
                    top: PLACEMENT_POSITION,
                    right: PLACEMENT_POSITION,
                    bottom: PLACEMENT_POSITION,
                    left: PLACEMENT_POSITION,
                },
            ],
        },
        {
            creators: [{ 'inset-x': PLACEMENT_POSITION }],
            receivers: [
                {
                    right: PLACEMENT_POSITION,
                    left: PLACEMENT_POSITION,
                },
            ],
        },
        {
            creators: [{ 'inset-y': PLACEMENT_POSITION }],
            receivers: [
                {
                    top: PLACEMENT_POSITION,
                    bottom: PLACEMENT_POSITION,
                },
            ],
        },
        {
            creators: [{ flex: ['1', 'auto', 'initial', 'none'] }],
            receivers: [
                {
                    'flex-grow': ['0', ''],
                    'flex-shrink': ['0', ''],
                },
            ],
        },
        {
            creators: [
                {
                    col: [
                        'auto',
                        {
                            span: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                'full',
                            ],
                        },
                    ],
                },
            ],
            receivers: [
                {
                    col: [
                        {
                            start: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                '13',
                                'auto',
                            ],
                            end: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                '13',
                                'auto',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            creators: [
                {
                    row: [
                        'auto',
                        {
                            span: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                'full',
                            ],
                        },
                    ],
                },
            ],
            receivers: [
                {
                    row: [
                        {
                            start: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                '13',
                                'auto',
                            ],
                            end: [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                                '10',
                                '11',
                                '12',
                                '13',
                                'auto',
                            ],
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ gap: SPACING_ABSOLUTE }],
            receivers: [{ gap: [{ x: SPACING_ABSOLUTE, y: SPACING_ABSOLUTE }] }],
        },
        {
            creators: [{ p: SPACING_ABSOLUTE }],
            receivers: [
                {
                    px: SPACING_ABSOLUTE,
                    py: SPACING_ABSOLUTE,
                    pt: SPACING_ABSOLUTE,
                    pr: SPACING_ABSOLUTE,
                    pb: SPACING_ABSOLUTE,
                    pl: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ px: SPACING_ABSOLUTE }],
            receivers: [
                {
                    pr: SPACING_ABSOLUTE,
                    pl: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ py: SPACING_ABSOLUTE }],
            receivers: [
                {
                    pt: SPACING_ABSOLUTE,
                    pb: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ m: SPACING_ABSOLUTE }],
            receivers: [
                {
                    mx: SPACING_ABSOLUTE,
                    my: SPACING_ABSOLUTE,
                    mt: SPACING_ABSOLUTE,
                    mr: SPACING_ABSOLUTE,
                    mb: SPACING_ABSOLUTE,
                    ml: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ mx: SPACING_ABSOLUTE }],
            receivers: [
                {
                    mr: SPACING_ABSOLUTE,
                    ml: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ py: SPACING_ABSOLUTE }],
            receivers: [
                {
                    mt: SPACING_ABSOLUTE,
                    mb: SPACING_ABSOLUTE,
                },
            ],
        },
        {
            creators: [{ text: ['xs', ...SIZES_SIMPLE, 'base', ...SIZES_EXTENDED, '8xl', '9xl'] }],
            receivers: [
                {
                    leading: [
                        '3',
                        '4',
                        '5',
                        '6',
                        '7',
                        '8',
                        '9',
                        '10',
                        'none',
                        'tight',
                        'snug',
                        'normal',
                        'relaxed',
                        'loose',
                    ],
                },
            ],
        },
        {
            creators: [{ rounded: ROUNDED }],
            receivers: [
                {
                    rounded: [
                        {
                            t: ROUNDED,
                            r: ROUNDED,
                            b: ROUNDED,
                            l: ROUNDED,
                            tl: ROUNDED,
                            tr: ROUNDED,
                            br: ROUNDED,
                            bl: ROUNDED,
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ 'rounded-t': ROUNDED }],
            receivers: [
                {
                    rounded: [
                        {
                            tl: ROUNDED,
                            tr: ROUNDED,
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ 'rounded-r': ROUNDED }],
            receivers: [
                {
                    rounded: [
                        {
                            tr: ROUNDED,
                            br: ROUNDED,
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ 'rounded-b': ROUNDED }],
            receivers: [
                {
                    rounded: [
                        {
                            br: ROUNDED,
                            bl: ROUNDED,
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ 'rounded-l': ROUNDED }],
            receivers: [
                {
                    rounded: [
                        {
                            tl: ROUNDED,
                            bl: ROUNDED,
                        },
                    ],
                },
            ],
        },
        {
            creators: [{ border: BORDERS }],
            receivers: [
                {
                    border: [
                        {
                            t: BORDERS,
                            r: BORDERS,
                            b: BORDERS,
                            l: BORDERS,
                        },
                    ],
                },
            ],
        },
        {
            creators: [
                {
                    ring: ['0', '1', '2', '4', '8', ''],
                    shadow: ['', ...SIZES_SIMPLE, 'inner', 'none'],
                },
            ],
            receivers: [
                {
                    ring: ['0', '1', '2', '4', '8', ''],
                    shadow: ['', ...SIZES_SIMPLE, 'inner', 'none'],
                },
            ],
        },
    ],
} as const
