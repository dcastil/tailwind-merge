import { isAny, isInteger, isLength } from './config-helpers'

const SIZES_SIMPLE = ['sm', 'md', 'lg', 'xl', '2xl'] as const
const SIZES_EXTENDED = ['3xl', '4xl', '5xl', '6xl', '7xl'] as const
const OVERSCROLL = ['auto', 'contain', 'none'] as const
const OVERFLOW = ['auto', 'hidden', 'visible', 'scroll'] as const
const LENGTH = [isLength] as const
const MARGIN = ['auto', isLength] as const
const INTEGER = [isInteger] as const
const ANY = [isAny] as const
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
    dynamicClasses: {
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
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            [{ x: LENGTH }],
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            [{ y: LENGTH }],
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            LENGTH,
        ],
        top: [
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            LENGTH,
        ],
        right: [
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            LENGTH,
        ],
        bottom: [
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            LENGTH,
        ],
        left: [
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            LENGTH,
        ],
        z: [
            /**
             * Z-Index
             * @see https://tailwindcss.com/docs/z-index
             */
            LENGTH,
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
            [{ grow: ['', isInteger] }],
            /**
             * Flex Shrink
             * @see https://tailwindcss.com/docs/flex-shrink
             */
            [{ shrink: ['', isInteger] }],
        ],
        order: [
            /**
             * Order
             * @see https://tailwindcss.com/docs/order
             */
            ['first', 'last', 'none', isInteger],
        ],
        grid: [
            /**
             * Grid Template Columns
             * @see https://tailwindcss.com/docs/grid-template-columns
             */
            [{ cols: ['none', isInteger] }],
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            [{ rows: ['none', isInteger] }],
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
            ['auto', { span: INTEGER }],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            [{ start: ['auto', isInteger] }],
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            [{ end: ['auto', isInteger] }],
        ],
        row: [
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            ['auto', { span: INTEGER }],
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            [{ start: ['auto', isInteger] }],
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            [{ end: ['auto', isInteger] }],
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
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            [{ x: LENGTH }],
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            [{ y: LENGTH }],
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            LENGTH,
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
            LENGTH,
        ],
        px: [
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
        ],
        py: [
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
        ],
        pt: [
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
        ],
        pr: [
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
        ],
        pb: [
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
        ],
        pl: [
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            LENGTH,
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
            [{ x: LENGTH }],
            /**
             * Space Between Y Reverse
             * @see https://tailwindcss.com/docs/space
             */
            ['y-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/space
             */
            [{ y: LENGTH }],
        ],
        // Sizing
        w: [
            /**
             * Width
             * @see https://tailwindcss.com/docs/width
             */
            ['auto', 'min', 'max', isLength],
        ],
        min: [
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            [{ w: ['full', 'min', 'max', isLength] }],
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            [{ h: ['full', 'screen', isLength] }],
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
            [{ h: ['full', 'screen', isLength] }],
        ],
        h: [
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            ['auto', isLength],
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
             * Text Opacity
             * @see https://tailwindcss.com/docs/text-opacity
             */
            [{ opacity: INTEGER }],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            ANY,
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
            ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', isLength],
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
             * Placeholder Opacity
             * @see https://tailwindcss.com/docs/placeholder-opacity
             */
            [{ opacity: INTEGER }],
            /**
             * Placeholder Color
             * @see https://tailwindcss.com/docs/placeholder-color
             */
            ANY,
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
             * Background Opacity
             * @see https://tailwindcss.com/docs/background-opacity
             */
            [{ opacity: INTEGER }],
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
            ['no-repeat', { repeat: ['', 'x', 'y', 'round', 'space'] }],
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
            /**
             * Background Color
             * @see https://tailwindcss.com/docs/background-color
             */
            ANY,
        ],
        from: [
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            ANY,
        ],
        via: [
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            ANY,
        ],
        to: [
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            ANY,
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
            LENGTH,
            /**
             * Border Width Top
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ t: LENGTH }],
            /**
             * Border Width Right
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ r: LENGTH }],
            /**
             * Border Width Bottom
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ b: LENGTH }],
            /**
             * Border Width Left
             * @see https://tailwindcss.com/docs/border-width
             */
            [{ l: LENGTH }],
            /**
             * Border Opacity
             * @see https://tailwindcss.com/docs/border-opacity
             */
            [{ opacity: INTEGER }],
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
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            ANY,
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
            [{ x: LENGTH }],
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            ['y-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/divide-width
             */
            [{ y: LENGTH }],
            /**
             * Divide Opacity
             * @see https://tailwindcss.com/docs/divide-opacity
             */
            [{ opacity: INTEGER }],
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/divide-style
             */
            BORDER_STYLES,
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            ANY,
        ],
        ring: [
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/ring-width
             */
            ['', isLength],
            /**
             * Ring Width Inset
             * @see https://tailwindcss.com/docs/ring-width
             */
            ['inset'],
            /**
             * Ring Opacity
             * @see https://tailwindcss.com/docs/ring-opacity
             */
            [{ opacity: INTEGER }],
            /**
             * Ring Offset Width
             * @see https://tailwindcss.com/docs/ring-offset-width
             */
            [{ offset: LENGTH }],
            /**
             * Ring Offset Color
             * @see https://tailwindcss.com/docs/ring-offset-color
             */
            [{ offset: ANY }],
            /**
             * Ring Color
             * @see https://tailwindcss.com/docs/ring-color
             */
            ANY,
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
            INTEGER,
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
            INTEGER,
        ],
        contrast: [
            /**
             * Contrast
             * @see https://tailwindcss.com/docs/contrast
             */
            INTEGER,
        ],
        drop: [
            /**
             * Drop Shadow
             * @see https://tailwindcss.com/docs/drop-shadow
             */
            [{ shadow: ['', ...SIZES_SIMPLE, 'none'] }],
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
            [{ rotate: INTEGER }],
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
            INTEGER,
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
            [{ brightness: INTEGER }],
            /**
             * Backdrop Contrast
             * @see https://tailwindcss.com/docs/backdrop-contrast
             */
            [{ contrast: INTEGER }],
            /**
             * Backdrop Grayscale
             * @see https://tailwindcss.com/docs/backdrop-grayscale
             */
            [{ grayscale: ['0', ''] }],
            /**
             * Backdrop Hue Rotate
             * @see https://tailwindcss.com/docs/backdrop-hue-rotate
             */
            [{ 'hue-rotate': INTEGER }],
            /**
             * Backdrop Invert
             * @see https://tailwindcss.com/docs/backdrop-invert
             */
            [{ invert: ['0', ''] }],
            /**
             * Backdrop Opacity
             * @see https://tailwindcss.com/docs/backdrop-opacity
             */
            [{ opacity: INTEGER }],
            /**
             * Backdrop Saturate
             * @see https://tailwindcss.com/docs/backdrop-saturate
             */
            [{ saturate: INTEGER }],
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
            INTEGER,
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
            INTEGER,
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
            INTEGER,
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            [{ x: INTEGER }],
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            [{ y: INTEGER }],
        ],
        rotate: [
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            INTEGER,
        ],
        translate: [
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            [{ x: LENGTH }],
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            [{ y: LENGTH }],
        ],
        skew: [
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            [{ x: INTEGER }],
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            [{ y: INTEGER }],
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
            LENGTH,
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
            creators: [
                // Overflow
                ['dynamicClasses', 'overflow', '0'],
            ],
            receivers: [
                // Overflow X
                ['dynamicClasses', 'overflow', '1'],
                // Overflow Y
                ['dynamicClasses', 'overflow', '2'],
            ],
        },
        {
            creators: [
                // Overscroll
                ['dynamicClasses', 'overscroll', '0'],
            ],
            receivers: [
                // Overscroll X
                ['dynamicClasses', 'overscroll', '1'],
                // Overscroll Y
                ['dynamicClasses', 'overscroll', '2'],
            ],
        },
        {
            creators: [
                // Top / Right / Bottom / Left
                ['dynamicClasses', 'inset', '2'],
            ],
            receivers: [
                // Right / Left
                ['dynamicClasses', 'inset', '0'],
                // Top / Bottom
                ['dynamicClasses', 'inset', '1'],
                // Top
                ['dynamicClasses', 'top', '0'],
                // Right
                ['dynamicClasses', 'right', '0'],
                // Bottom
                ['dynamicClasses', 'bottom', '0'],
                // Left
                ['dynamicClasses', 'left', '0'],
            ],
        },
        {
            creators: [
                // Right / Left
                ['dynamicClasses', 'inset', '0'],
            ],
            receivers: [
                // Right
                ['dynamicClasses', 'right', '0'],
                // Left
                ['dynamicClasses', 'left', '0'],
            ],
        },
        {
            creators: [
                // Top / Bottom
                ['dynamicClasses', 'inset', '1'],
            ],
            receivers: [
                // Top
                ['dynamicClasses', 'top', '0'],
                // Bottom
                ['dynamicClasses', 'bottom', '0'],
            ],
        },
        {
            creators: [
                // Flex
                ['dynamicClasses', 'flex', '2'],
            ],
            receivers: [
                // Flex Grow
                ['dynamicClasses', 'flex', '3'],
                // Flex Shrink
                ['dynamicClasses', 'flex', '4'],
            ],
        },
        {
            creators: [
                // Grid Column Start / End
                ['dynamicClasses', 'col', '0'],
            ],
            receivers: [
                // Grid Column Start
                ['dynamicClasses', 'col', '1'],
                // Grid Column End
                ['dynamicClasses', 'col', '2'],
            ],
        },
        {
            creators: [
                // Grid Row Start / End
                ['dynamicClasses', 'row', '0'],
            ],
            receivers: [
                // Grid Row Start
                ['dynamicClasses', 'row', '1'],
                // Grid Row End
                ['dynamicClasses', 'row', '2'],
            ],
        },
        {
            creators: [
                // Gap
                ['dynamicClasses', 'gap', '2'],
            ],
            receivers: [
                // Gap X
                ['dynamicClasses', 'gap', '0'],
                // Gap Y
                ['dynamicClasses', 'gap', '1'],
            ],
        },
        {
            creators: [
                // Padding
                ['dynamicClasses', 'p', '0'],
            ],
            receivers: [
                // Padding X
                ['dynamicClasses', 'px', '0'],
                // Padding Y
                ['dynamicClasses', 'py', '0'],
                // Padding Top
                ['dynamicClasses', 'pt', '0'],
                // Padding Right
                ['dynamicClasses', 'pr', '0'],
                // Padding Bottom
                ['dynamicClasses', 'pb', '0'],
                // Padding Left
                ['dynamicClasses', 'pl', '0'],
            ],
        },
        {
            creators: [
                // Padding X
                ['dynamicClasses', 'px', '0'],
            ],
            receivers: [
                // Padding Right
                ['dynamicClasses', 'pr', '0'],
                // Padding Left
                ['dynamicClasses', 'pl', '0'],
            ],
        },
        {
            creators: [
                // Padding Y
                ['dynamicClasses', 'py', '0'],
            ],
            receivers: [
                // Padding Top
                ['dynamicClasses', 'pt', '0'],
                // Padding Bottom
                ['dynamicClasses', 'pb', '0'],
            ],
        },
        {
            creators: [
                // Margin
                ['dynamicClasses', 'm', '0'],
            ],
            receivers: [
                // Margin X
                ['dynamicClasses', 'mx', '0'],
                // Margin Y
                ['dynamicClasses', 'my', '0'],
                // Margin Top
                ['dynamicClasses', 'mt', '0'],
                // Margin Right
                ['dynamicClasses', 'mr', '0'],
                // Margin Bottom
                ['dynamicClasses', 'mb', '0'],
                // Margin Left
                ['dynamicClasses', 'ml', '0'],
            ],
        },
        {
            creators: [
                // Margin X
                ['dynamicClasses', 'mx', '0'],
            ],
            receivers: [
                // Margin Right
                ['dynamicClasses', 'mr', '0'],
                // Margin Left
                ['dynamicClasses', 'ml', '0'],
            ],
        },
        {
            creators: [
                // Margin Y
                ['dynamicClasses', 'my', '0'],
            ],
            receivers: [
                // Margin Top
                ['dynamicClasses', 'mt', '0'],
                // Margin Bottom
                ['dynamicClasses', 'mb', '0'],
            ],
        },
        {
            creators: [
                // Font Size
                ['dynamicClasses', 'text', '0'],
            ],
            receivers: [
                // Line Height
                ['dynamicClasses', 'leading', '0'],
            ],
        },
        {
            creators: [
                // Border Radius
                ['dynamicClasses', 'rounded', '0'],
            ],
            receivers: [
                // Border Radius Top
                ['dynamicClasses', 'rounded', '1'],
                // Border Radius Right
                ['dynamicClasses', 'rounded', '2'],
                // Border Radius Bottom
                ['dynamicClasses', 'rounded', '3'],
                // Border Radius Left
                ['dynamicClasses', 'rounded', '4'],
                // Border Radius Top Left
                ['dynamicClasses', 'rounded', '5'],
                // Border Radius Top Right
                ['dynamicClasses', 'rounded', '6'],
                // Border Radius Bottom Right
                ['dynamicClasses', 'rounded', '7'],
                // Border Radius Bottom Left
                ['dynamicClasses', 'rounded', '8'],
            ],
        },
        {
            creators: [
                // Border Radius Top
                ['dynamicClasses', 'rounded', '1'],
            ],
            receivers: [
                // Border Radius Top Left
                ['dynamicClasses', 'rounded', '5'],
                // Border Radius Top Right
                ['dynamicClasses', 'rounded', '6'],
            ],
        },
        {
            creators: [
                // Border Radius Right
                ['dynamicClasses', 'rounded', '2'],
            ],
            receivers: [
                // Border Radius Top Right
                ['dynamicClasses', 'rounded', '6'],
                // Border Radius Bottom Right
                ['dynamicClasses', 'rounded', '7'],
            ],
        },
        {
            creators: [
                // Border Radius Bottom
                ['dynamicClasses', 'rounded', '3'],
            ],
            receivers: [
                // Border Radius Bottom Right
                ['dynamicClasses', 'rounded', '7'],
                // Border Radius Bottom Left
                ['dynamicClasses', 'rounded', '8'],
            ],
        },
        {
            creators: [
                // Border Radius Left
                ['dynamicClasses', 'rounded', '4'],
            ],
            receivers: [
                // Border Radius Top Left
                ['dynamicClasses', 'rounded', '5'],
                // Border Radius Bottom Left
                ['dynamicClasses', 'rounded', '8'],
            ],
        },
        {
            creators: [
                // Border Width
                ['dynamicClasses', 'border', '0'],
            ],
            receivers: [
                // Border Width Top
                ['dynamicClasses', 'border', '1'],
                // Border Width Right
                ['dynamicClasses', 'border', '2'],
                // Border Width Bottom
                ['dynamicClasses', 'border', '3'],
                // Border Width Left
                ['dynamicClasses', 'border', '4'],
            ],
        },
        {
            creators: [
                // Ring Width
                ['dynamicClasses', 'ring', '0'],
                //  Box Shadow
                ['dynamicClasses', 'shadow', '0'],
            ],
            receivers: [
                // Ring Width
                ['dynamicClasses', 'ring', '0'],
                //  Box Shadow
                ['dynamicClasses', 'shadow', '0'],
            ],
        },
    ],
}
