import { fromTheme } from './from-theme'
import {
    isAny,
    isArbitraryLength,
    isArbitraryPosition,
    isArbitrarySize,
    isArbitraryUrl,
    isArbitraryValue,
    isArbitraryWeight,
    isLength,
    isTshirtSize,
} from './validators'

// TODO: Create new package entry point for this config
// TODO: Check in class-map test that `classGroupsByFirstPart` is same for both normal and minimal config. Also check that order of keys is the same.
// TODO: Check bundle size of package with minimal config to figure out whether it's even worth it
// TODO: Check runtime performance with minimal config, indeally in a real project using tailwind-merge
export function getDefaultConfigMinimal() {
    const borderWidth = fromTheme('borderWidth')

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
    const getLineStyles = () => ['solid', 'dashed', 'dotted', 'double', 'none'] as const

    return {
        cacheSize: 500,
        theme: {
            borderWidth: ['', isLength],
        },
        classGroups: {
            // Layout
            /**
             * Aspect Ratio
             * @see https://tailwindcss.com/docs/aspect-ratio
             */
            aspect: getIsAnyForKey('aspect'),
            /**
             * Container
             * @see https://tailwindcss.com/docs/container
             */
            container: ['container'],
            /**
             * Columns
             * @see https://tailwindcss.com/docs/columns
             */
            columns: getIsAnyForKey('columns'),
            /**
             * Break After
             * @see https://tailwindcss.com/docs/break-after
             */
            'break-after': getIsAnyForKey('break-after'),
            /**
             * Break Before
             * @see https://tailwindcss.com/docs/break-before
             */
            'break-before': getIsAnyForKey('break-before'),
            /**
             * Break Inside
             * @see https://tailwindcss.com/docs/break-inside
             */
            'break-inside': [{ 'break-before': ['auto', 'avoid', 'avoid-page', 'avoid-column'] }],
            /**
             * Box Decoration Break
             * @see https://tailwindcss.com/docs/box-decoration-break
             */
            'box-decoration': getIsAnyForKey('box-decoration'),
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
            float: getIsAnyForKey('float'),
            /**
             * Clear
             * @see https://tailwindcss.com/docs/clear
             */
            clear: getIsAnyForKey('clear'),
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
            overflow: getIsAnyForKey('overflow'),
            /**
             * Overflow X
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-x': getIsAnyForKey('overflow-x'),
            /**
             * Overflow Y
             * @see https://tailwindcss.com/docs/overflow
             */
            'overflow-y': getIsAnyForKey('overflow-y'),
            /**
             * Overscroll Behavior
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            overscroll: getIsAnyForKey('overscroll'),
            /**
             * Overscroll Behavior X
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-x': getIsAnyForKey('overrscroll-x'),
            /**
             * Overscroll Behavior Y
             * @see https://tailwindcss.com/docs/overscroll-behavior
             */
            'overscroll-y': getIsAnyForKey('overscroll-y'),
            /**
             * Position
             * @see https://tailwindcss.com/docs/position
             */
            position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
            /**
             * Top / Right / Bottom / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            inset: getIsAnyForKey('inset'),
            /**
             * Right / Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-x': getIsAnyForKey('inset-x'),
            /**
             * Top / Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            'inset-y': getIsAnyForKey('inset-y'),
            /**
             * Top
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            top: getIsAnyForKey('top'),
            /**
             * Right
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            right: getIsAnyForKey('right'),
            /**
             * Bottom
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            bottom: getIsAnyForKey('bottom'),
            /**
             * Left
             * @see https://tailwindcss.com/docs/top-right-bottom-left
             */
            left: getIsAnyForKey('left'),
            /**
             * Visibility
             * @see https://tailwindcss.com/docs/visibility
             */
            visibility: ['visible', 'invisible'],
            /**
             * Z-Index
             * @see https://tailwindcss.com/docs/z-index
             */
            z: getIsAnyForKey('z'),
            // Flexbox and Grid
            /**
             * Flex Basis
             * @see https://tailwindcss.com/docs/flex-basis
             */
            basis: getIsAnyForKey('basis'),
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
            flex: [{ flex: ['1', 'auto', 'initial', 'none', isArbitraryValue] }],
            /**
             * Flex Grow
             * @see https://tailwindcss.com/docs/flex-grow
             */
            grow: getIsAnyAndEmptyForKey('grow'),
            /**
             * Flex Shrink
             * @see https://tailwindcss.com/docs/flex-shrink
             */
            shrink: getIsAnyAndEmptyForKey('shrink'),
            /**
             * Order
             * @see https://tailwindcss.com/docs/order
             */
            order: getIsAnyForKey('order'),
            /**
             * Grid Template Columns
             * @see https://tailwindcss.com/docs/grid-template-columns
             */
            'grid-cols': getIsAnyForKey('grid-cols'),
            /**
             * Grid Column Start / End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start-end': [{ col: ['auto', ...getIsAnyForKey('span')] }],
            /**
             * Grid Column Start
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-start': getIsAnyForKey('col-start'),
            /**
             * Grid Column End
             * @see https://tailwindcss.com/docs/grid-column
             */
            'col-end': getIsAnyForKey('col-end'),
            /**
             * Grid Template Rows
             * @see https://tailwindcss.com/docs/grid-template-rows
             */
            'grid-rows': getIsAnyForKey('grid-rows'),
            /**
             * Grid Row Start / End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start-end': getIsAnyForKey('row'),
            /**
             * Grid Row Start
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-start': getIsAnyForKey('row-start'),
            /**
             * Grid Row End
             * @see https://tailwindcss.com/docs/grid-row
             */
            'row-end': getIsAnyForKey('row-end'),
            /**
             * Grid Auto Flow
             * @see https://tailwindcss.com/docs/grid-auto-flow
             */
            'grid-flow': getIsAnyForKey('grid-flow'),
            /**
             * Grid Auto Columns
             * @see https://tailwindcss.com/docs/grid-auto-columns
             */
            'auto-cols': getIsAnyForKey('auto-cols'),
            /**
             * Grid Auto Rows
             * @see https://tailwindcss.com/docs/grid-auto-rows
             */
            'auto-rows': getIsAnyForKey('auto-rows'),
            /**
             * Gap
             * @see https://tailwindcss.com/docs/gap
             */
            gap: getIsAnyForKey('gap'),
            /**
             * Gap X
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-x': getIsAnyForKey('gap-x'),
            /**
             * Gap Y
             * @see https://tailwindcss.com/docs/gap
             */
            'gap-y': getIsAnyForKey('gap-y'),
            /**
             * Justify Content
             * @see https://tailwindcss.com/docs/justify-content
             */
            'justify-content': getIsAnyForKey('justify'),
            /**
             * Justify Items
             * @see https://tailwindcss.com/docs/justify-items
             */
            'justify-items': getIsAnyForKey('justify-items'),
            /**
             * Justify Self
             * @see https://tailwindcss.com/docs/justify-self
             */
            'justify-self': getIsAnyForKey('justify-self'),
            /**
             * Align Content
             * @see https://tailwindcss.com/docs/align-content
             */
            'align-content': [
                { content: ['start', 'end', 'center', 'between', 'around', 'evenly'] },
            ],
            /**
             * Align Items
             * @see https://tailwindcss.com/docs/align-items
             */
            'align-items': getIsAnyForKey('items'),
            /**
             * Align Self
             * @see https://tailwindcss.com/docs/align-self
             */
            'align-self': getIsAnyForKey('self'),
            /**
             * Place Content
             * @see https://tailwindcss.com/docs/place-content
             */
            'place-content': getIsAnyForKey('place-content'),
            /**
             * Place Items
             * @see https://tailwindcss.com/docs/place-items
             */
            'place-items': getIsAnyForKey('place-items'),
            /**
             * Place Self
             * @see https://tailwindcss.com/docs/place-self
             */
            'place-self': getIsAnyForKey('place-self'),
            // Spacing
            /**
             * Padding
             * @see https://tailwindcss.com/docs/padding
             */
            p: getIsAnyForKey('p'),
            /**
             * Padding X
             * @see https://tailwindcss.com/docs/padding
             */
            px: getIsAnyForKey('px'),
            /**
             * Padding Y
             * @see https://tailwindcss.com/docs/padding
             */
            py: getIsAnyForKey('py'),
            /**
             * Padding Top
             * @see https://tailwindcss.com/docs/padding
             */
            pt: getIsAnyForKey('pt'),
            /**
             * Padding Right
             * @see https://tailwindcss.com/docs/padding
             */
            pr: getIsAnyForKey('pr'),
            /**
             * Padding Bottom
             * @see https://tailwindcss.com/docs/padding
             */
            pb: getIsAnyForKey('pb'),
            /**
             * Padding Left
             * @see https://tailwindcss.com/docs/padding
             */
            pl: getIsAnyForKey('pl'),
            /**
             * Margin
             * @see https://tailwindcss.com/docs/margin
             */
            m: getIsAnyForKey('m'),
            /**
             * Margin X
             * @see https://tailwindcss.com/docs/margin
             */
            mx: getIsAnyForKey('mx'),
            /**
             * Margin Y
             * @see https://tailwindcss.com/docs/margin
             */
            my: getIsAnyForKey('my'),
            /**
             * Margin Top
             * @see https://tailwindcss.com/docs/margin
             */
            mt: getIsAnyForKey('mt'),
            /**
             * Margin Right
             * @see https://tailwindcss.com/docs/margin
             */
            mr: getIsAnyForKey('mr'),
            /**
             * Margin Bottom
             * @see https://tailwindcss.com/docs/margin
             */
            mb: getIsAnyForKey('mb'),
            /**
             * Margin Left
             * @see https://tailwindcss.com/docs/margin
             */
            ml: getIsAnyForKey('ml'),
            /**
             * Space Between X
             * @see https://tailwindcss.com/docs/space
             */
            'space-x': getIsAnyForKey('space-x'),
            /**
             * Space Between X Reverse
             * @see https://tailwindcss.com/docs/space
             */
            'space-x-reverse': ['space-x-reverse'],
            /**
             * Space Between Y
             * @see https://tailwindcss.com/docs/space
             */
            'space-y': getIsAnyForKey('space-y'),
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
            w: getIsAnyForKey('w'),
            /**
             * Min-Width
             * @see https://tailwindcss.com/docs/min-width
             */
            'min-w': getIsAnyForKey('min-w'),
            /**
             * Max-Width
             * @see https://tailwindcss.com/docs/max-width
             */
            'max-w': getIsAnyForKey('max-w'),
            /**
             * Height
             * @see https://tailwindcss.com/docs/height
             */
            h: getIsAnyForKey('h'),
            /**
             * Min-Height
             * @see https://tailwindcss.com/docs/min-height
             */
            'min-h': getIsAnyForKey('min-h'),
            /**
             * Max-Height
             * @see https://tailwindcss.com/docs/max-height
             */
            'max-h': getIsAnyForKey('max-h'),
            // Typography
            /**
             * Font Size
             * @see https://tailwindcss.com/docs/font-size
             */
            'font-size': [{ text: ['base', isTshirtSize, isArbitraryLength] }],
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
                        isArbitraryWeight,
                    ],
                },
            ],
            /**
             * Font Family
             * @see https://tailwindcss.com/docs/font-family
             */
            'font-family': getIsAnyForKey('font'),
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
            tracking: getIsAnyForKey('tracking'),
            /**
             * Line Height
             * @see https://tailwindcss.com/docs/line-height
             */
            leading: getIsAnyForKey('leading'),
            /**
             * List Style Type
             * @see https://tailwindcss.com/docs/list-style-type
             */
            'list-style-type': [{ list: ['none', 'disc', 'decimal', isArbitraryValue] }],
            /**
             * List Style Position
             * @see https://tailwindcss.com/docs/list-style-position
             */
            'list-style-position': [{ list: ['inside', 'outside'] }],
            /**
             * Placeholder Color
             * @see https://tailwindcss.com/docs/placeholder-color
             */
            'placeholder-color': getIsAnyForKey('placeholder'),
            /**
             * Placeholder Opacity
             * @see https://tailwindcss.com/docs/placeholder-opacity
             */
            'placeholder-opacity': getIsAnyForKey('placeholder-opacity'),
            /**
             * Text Alignment
             * @see https://tailwindcss.com/docs/text-align
             */
            'text-alignment': [{ text: ['left', 'center', 'right', 'justify'] }],
            /**
             * Text Color
             * @see https://tailwindcss.com/docs/text-color
             */
            'text-color': getIsAnyForKey('text'),
            /**
             * Text Opacity
             * @see https://tailwindcss.com/docs/text-opacity
             */
            'text-opacity': getIsAnyForKey('text-opacity'),
            /**
             * Text Decoration
             * @see https://tailwindcss.com/docs/text-decoration
             */
            'text-decoration': ['underline', 'line-through', 'no-underline'],
            /**
             * Text Decoration Style
             * @see https://tailwindcss.com/docs/text-decoration-style
             */
            'text-decoration-style': [{ decoration: [...getLineStyles(), 'wavy'] }],
            /**
             * Text Decoration Thickness
             * @see https://tailwindcss.com/docs/text-decoration-thickness
             */
            'text-decoration-thickness': [{ decoration: ['auto', 'from-font', isLength] }],
            /**
             * Text Decoration Color
             * @see https://tailwindcss.com/docs/text-decoration-color
             */
            'text-decoration-color': getIsAnyForKey('decoration'),
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
             * Text Indent
             * @see https://tailwindcss.com/docs/text-indent
             */
            indent: getIsAnyForKey('indent'),
            /**
             * Vertical Alignment
             * @see https://tailwindcss.com/docs/vertical-align
             */
            'vertical-align': getIsAnyForKey('align'),
            /**
             * Whitespace
             * @see https://tailwindcss.com/docs/whitespace
             */
            whitespace: getIsAnyForKey('whitespace'),
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
            'bg-clip': getIsAnyForKey('bg-clip'),
            /**
             * Background Opacity
             * @see https://tailwindcss.com/docs/background-opacity
             */
            'bg-opacity': getIsAnyForKey('bg-opacity'),
            /**
             * Background Origin
             * @see https://tailwindcss.com/docs/background-origin
             */
            'bg-origin': getIsAnyForKey('bg-origin'),
            /**
             * Background Position
             * @see https://tailwindcss.com/docs/background-position
             */
            'bg-position': [{ bg: [...getPositions(), isArbitraryPosition] }],
            /**
             * Background Repeat
             * @see https://tailwindcss.com/docs/background-repeat
             */
            'bg-repeeat': [{ bg: ['no-repeat', ...getIsAnyForKey('repeat')] }],
            /**
             * Background Size
             * @see https://tailwindcss.com/docs/background-size
             */
            'bg-size': [{ bg: ['auto', 'cover', 'contain', isArbitrarySize] }],
            /**
             * Background Image
             * @see https://tailwindcss.com/docs/background-image
             */
            'bg-image': [{ bg: ['none', getIsAnyForKey('gradient-to'), isArbitraryUrl] }],
            /**
             * Background Blend Mode
             * @see https://tailwindcss.com/docs/background-blend-mode
             */
            'bg-blend': getIsAnyForKey('bg-blend'),
            /**
             * Background Color
             * @see https://tailwindcss.com/docs/background-color
             */
            'bg-color': getIsAnyForKey('bg'),
            /**
             * Gradient Color Stops From
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-from': getIsAnyForKey('from'),
            /**
             * Gradient Color Stops Via
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-via': getIsAnyForKey('via'),
            /**
             * Gradient Color Stops To
             * @see https://tailwindcss.com/docs/gradient-color-stops
             */
            'gradient-to': getIsAnyForKey('to'),
            // Borders
            /**
             * Border Radius
             * @see https://tailwindcss.com/docs/border-radius
             */
            rounded: getIsAnyAndEmptyForKey('rounded'),
            /**
             * Border Radius Top
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-t': getIsAnyAndEmptyForKey('rounded-t'),
            /**
             * Border Radius Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-r': getIsAnyAndEmptyForKey('rounded-r'),
            /**
             * Border Radius Bottom
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-b': getIsAnyAndEmptyForKey('rounded-b'),
            /**
             * Border Radius Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-l': getIsAnyAndEmptyForKey('rounded-l'),
            /**
             * Border Radius Top Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tl': getIsAnyAndEmptyForKey('rounded-tl'),
            /**
             * Border Radius Top Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-tr': getIsAnyAndEmptyForKey('rounded-tr'),
            /**
             * Border Radius Bottom Right
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-br': getIsAnyAndEmptyForKey('rounded-br'),
            /**
             * Border Radius Bottom Left
             * @see https://tailwindcss.com/docs/border-radius
             */
            'rounded-bl': getIsAnyAndEmptyForKey('rounded-bl'),
            /**
             * Border Width
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w': [{ border: [borderWidth] }],
            /**
             * Border Width X
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-x': [{ 'border-x': [borderWidth] }],
            /**
             * Border Width Y
             * @see https://tailwindcss.com/docs/border-width
             */
            'border-w-y': [{ 'border-y': [borderWidth] }],
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
            'border-opacity': getIsAnyForKey('border-opacity'),
            /**
             * Border Style
             * @see https://tailwindcss.com/docs/border-style
             */
            'border-style': [{ border: [...getLineStyles(), 'hidden'] }],
            /**
             * Divide Width X
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-x': getIsAnyForKey('divide-x'),
            /**
             * Divide Width X Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-x-reverse': ['divide-x-reverse'],
            /**
             * Divide Width Y
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-y': getIsAnyForKey('divide-y'),
            /**
             * Divide Width Y Reverse
             * @see https://tailwindcss.com/docs/divide-width
             */
            'divide-y-reverse': ['divide-y-reverse'],
            /**
             * Divide Opacity
             * @see https://tailwindcss.com/docs/divide-opacity
             */
            'divide-opacity': getIsAnyForKey('divide-opacity'),
            /**
             * Divide Style
             * @see https://tailwindcss.com/docs/divide-style
             */
            'divide-style': [{ divide: getLineStyles() }],
            /**
             * Border Color
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color': getIsAnyForKey('border'),
            /**
             * Border Color X
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-x': getIsAnyForKey('border-x'),
            /**
             * Border Color Y
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-y': getIsAnyForKey('border-y'),
            /**
             * Border Color Top
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-t': getIsAnyForKey('border-t'),
            /**
             * Border Color Right
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-r': getIsAnyForKey('border-r'),
            /**
             * Border Color Bottom
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-b': getIsAnyForKey('border-b'),
            /**
             * Border Color Left
             * @see https://tailwindcss.com/docs/border-color
             */
            'border-color-l': getIsAnyForKey('border-l'),
            /**
             * Divide Color
             * @see https://tailwindcss.com/docs/divide-color
             */
            'divide-color': getIsAnyForKey('divide'),
            /**
             * Ring Width
             * @see https://tailwindcss.com/docs/ring-width
             */
            'ring-w': [{ ring: ['', isLength] }],
            /**
             * Ring Width Inset
             * @see https://tailwindcss.com/docs/ring-width
             */
            'ring-w-inset': ['ring-inset'],
            /**
             * Ring Color
             * @see https://tailwindcss.com/docs/ring-color
             */
            'ring-color': getIsAnyForKey('ring'),
            /**
             * Ring Opacity
             * @see https://tailwindcss.com/docs/ring-opacity
             */
            'ring-opacity': getIsAnyForKey('ring-opacity'),
            /**
             * Ring Offset Width
             * @see https://tailwindcss.com/docs/ring-offset-width
             */
            'ring-offset-w': [{ 'ring-offset': [isLength] }],
            /**
             * Ring Offset Color
             * @see https://tailwindcss.com/docs/ring-offset-color
             */
            'ring-offset-color': getIsAnyForKey('ring-offset'),
            // Effects
            /**
             * Box Shadow
             * @see https://tailwindcss.com/docs/box-shadow
             */
            shadow: [{ shadow: ['', 'inner', 'none', isTshirtSize] }],
            /**
             * Box Shadow Color
             * @see https://tailwindcss.com/docs/box-shadow-color
             */
            'shadow-color': getIsAnyForKey('shadow'),
            /**
             * Opacity
             * @see https://tailwindcss.com/docs/opacity
             */
            opacity: getIsAnyForKey('opacity'),
            /**
             * Mix Beldn Mode
             * @see https://tailwindcss.com/docs/mix-blend-mode
             */
            'mix-blend': getIsAnyForKey('mix-blend'),
            // Filters
            /**
             * Filter
             * @see https://tailwindcss.com/docs/filter
             */
            filter: getIsAnyForKey('filter'),
            /**
             * Blur
             * @see https://tailwindcss.com/docs/blur
             */
            blur: getIsAnyAndEmptyForKey('blur'),
            /**
             * Brightness
             * @see https://tailwindcss.com/docs/brightness
             */
            brightness: getIsAnyForKey('brightness'),
            /**
             * Contrast
             * @see https://tailwindcss.com/docs/contrast
             */
            contrast: getIsAnyForKey('isAny'),
            /**
             * Drop Shadow
             * @see https://tailwindcss.com/docs/drop-shadow
             */
            'drop-shadow': getIsAnyForKey('drop'),
            /**
             * Grayscale
             * @see https://tailwindcss.com/docs/grayscale
             */
            grayscale: getIsAnyForKey('grayscale'),
            /**
             * Hue Rotate
             * @see https://tailwindcss.com/docs/hue-rotate
             */
            'hue-rotate': getIsAnyForKey('hue'),
            /**
             * Invert
             * @see https://tailwindcss.com/docs/invert
             */
            invert: getIsAnyForKey('invert'),
            /**
             * Saturate
             * @see https://tailwindcss.com/docs/saturate
             */
            saturate: getIsAnyForKey('saturate'),
            /**
             * Sepia
             * @see https://tailwindcss.com/docs/sepia
             */
            sepia: getIsAnyAndEmptyForKey('sepia'),
            /**
             * Backdrop Filter
             * @see https://tailwindcss.com/docs/backdrop-filter
             */
            'backdrop-filter': getIsAnyForKey('backdrop-filter'),
            /**
             * Backdrop Blur
             * @see https://tailwindcss.com/docs/backdrop-blur
             */
            'backdrop-blur': getIsAnyAndEmptyForKey('backdrop-blur'),
            /**
             * Backdrop Brightness
             * @see https://tailwindcss.com/docs/backdrop-brightness
             */
            'backdrop-brightness': getIsAnyForKey('backdrop-brightness'),
            /**
             * Backdrop Contrast
             * @see https://tailwindcss.com/docs/backdrop-contrast
             */
            'backdrop-contrast': getIsAnyForKey('backdrop-contrast'),
            /**
             * Backdrop Grayscale
             * @see https://tailwindcss.com/docs/backdrop-grayscale
             */
            'backdrop-grayscale': getIsAnyForKey('backdrop-grayscale'),
            /**
             * Backdrop Hue Rotate
             * @see https://tailwindcss.com/docs/backdrop-hue-rotate
             */
            'backdrop-hue-rotate': getIsAnyForKey('backdrop-hue'),
            /**
             * Backdrop Invert
             * @see https://tailwindcss.com/docs/backdrop-invert
             */
            'backdrop-invert': getIsAnyForKey('backdrop-invert'),
            /**
             * Backdrop Opacity
             * @see https://tailwindcss.com/docs/backdrop-opacity
             */
            'backdrop-opacity': getIsAnyForKey('backdrop-opacity'),
            /**
             * Backdrop Saturate
             * @see https://tailwindcss.com/docs/backdrop-saturate
             */
            'backdrop-saturate': getIsAnyForKey('backdrop-saturate'),
            /**
             * Backdrop Sepia
             * @see https://tailwindcss.com/docs/backdrop-sepia
             */
            'backdrop-sepia': getIsAnyForKey('backdrop-sepia'),
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
            transition: getIsAnyAndEmptyForKey('transition'),
            /**
             * Transition Duration
             * @see https://tailwindcss.com/docs/transition-duration
             */
            duration: getIsAnyForKey('duration'),
            /**
             * Transition Timing Function
             * @see https://tailwindcss.com/docs/transition-timing-function
             */
            ease: getIsAnyForKey('ease'),
            /**
             * Transition Delay
             * @see https://tailwindcss.com/docs/transition-delay
             */
            delay: getIsAnyForKey('delay'),
            /**
             * Animation
             * @see https://tailwindcss.com/docs/animation
             */
            animate: getIsAnyForKey('animate'),
            // Transforms
            /**
             * Transform
             * @see https://tailwindcss.com/docs/transform
             */
            transform: getIsAnyAndEmptyForKey('transform'),
            /**
             * Transform Origin
             * @see https://tailwindcss.com/docs/transform-origin
             */
            'transform-origin': getIsAnyForKey('origin'),
            /**
             * Scale
             * @see https://tailwindcss.com/docs/scale
             */
            scale: getIsAnyForKey('scale'),
            /**
             * Scale X
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-x': getIsAnyForKey('scale-x'),
            /**
             * Scale Y
             * @see https://tailwindcss.com/docs/scale
             */
            'scale-y': getIsAnyForKey('scale-y'),
            /**
             * Rotate
             * @see https://tailwindcss.com/docs/rotate
             */
            rotate: getIsAnyForKey('rotate'),
            /**
             * Translate X
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-x': getIsAnyForKey('translate-x'),
            /**
             * Translate Y
             * @see https://tailwindcss.com/docs/translate
             */
            'translate-y': getIsAnyForKey('translate-y'),
            /**
             * Skew X
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-x': getIsAnyForKey('skew-x'),
            /**
             * Skew Y
             * @see https://tailwindcss.com/docs/skew
             */
            'skew-y': getIsAnyForKey('skew-y'),
            // Interactivity
            /**
             * Accent Color
             * @see https://tailwindcss.com/docs/accent-color
             */
            accent: getIsAnyForKey('accent'),
            /**
             * Appearance
             * @see https://tailwindcss.com/docs/appearance
             */
            appearance: ['appearance-none'],
            /**
             * Cursor
             * @see https://tailwindcss.com/docs/cursor
             */
            cursor: getIsAnyForKey('cursor'),
            /**
             * Outline Width
             * @see https://tailwindcss.com/docs/outline-width
             */
            'outline-w': [{ outline: [isLength] }],
            /**
             * Outline Style
             * @see https://tailwindcss.com/docs/outline-style
             */
            'outline-style': [{ outline: ['', ...getLineStyles(), 'hidden'] }],
            /**
             * Outline Offset
             * @see https://tailwindcss.com/docs/outline-offset
             */
            'outline-offset': getIsAnyForKey('outline-offset'),
            /**
             * Outline Color
             * @see https://tailwindcss.com/docs/outline-color
             */
            'outline-color': getIsAnyForKey('outline'),
            /**
             * Pointer Events
             * @see https://tailwindcss.com/docs/pointer-events
             */
            'pointer-events': getIsAnyForKey('pointer'),
            /**
             * Resize
             * @see https://tailwindcss.com/docs/resize
             */
            resize: getIsAnyForKey('resize'),
            /**
             * Scroll Behavior
             * @see https://tailwindcss.com/docs/scroll-behavior
             */
            'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
            /**
             * Scroll Margin
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-m': getIsAnyForKey('scroll-m'),
            /**
             * Scroll Margin X
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mx': getIsAnyForKey('scroll-mx'),
            /**
             * Scroll Margin Y
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-my': getIsAnyForKey('scroll-my'),
            /**
             * Scroll Margin Top
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mt': getIsAnyForKey('scroll-mt'),
            /**
             * Scroll Margin Right
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mr': getIsAnyForKey('scroll-mr'),
            /**
             * Scroll Margin Bottom
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-mb': getIsAnyForKey('scroll-mb'),
            /**
             * Scroll Margin Left
             * @see https://tailwindcss.com/docs/scroll-margin
             */
            'scroll-ml': getIsAnyForKey('scroll-ml'),
            /**
             * Scroll Padding
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-p': getIsAnyForKey('scroll-p'),
            /**
             * Scroll Padding X
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-px': getIsAnyForKey('scroll-px'),
            /**
             * Scroll Padding Y
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-py': getIsAnyForKey('scroll-py'),
            /**
             * Scroll Padding Top
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pt': getIsAnyForKey('scroll-pt'),
            /**
             * Scroll Padding Right
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pr': getIsAnyForKey('scroll-pr'),
            /**
             * Scroll Padding Bottom
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pb': getIsAnyForKey('scroll-pb'),
            /**
             * Scroll Padding Left
             * @see https://tailwindcss.com/docs/scroll-padding
             */
            'scroll-pl': getIsAnyForKey('scroll-pl'),
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
            touch: getIsAnyForKey('touch'),
            /**
             * User Select
             * @see https://tailwindcss.com/docs/user-select
             */
            select: getIsAnyForKey('select'),
            /**
             * Will Change
             * @see https://tailwindcss.com/docs/will-change
             */
            'will-change': getIsAnyForKey('will'),
            // SVG
            /**
             * Fill
             * @see https://tailwindcss.com/docs/fill
             */
            fill: getIsAnyForKey('fill'),
            /**
             * Stroke Width
             * @see https://tailwindcss.com/docs/stroke-width
             */
            'stroke-w': [{ stroke: [isLength] }],
            /**
             * Stroke
             * @see https://tailwindcss.com/docs/stroke
             */
            stroke: getIsAnyForKey('stroke'),
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
            content: [{ content: [isArbitraryValue] }],
            /**
             * Caret Color
             * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
             */
            'caret-color': getIsAnyForKey('caret'),
        },
        conflictingClassGroups: {
            overflow: ['overflow-x', 'overflow-y'],
            overscroll: ['overscroll-x', 'overscroll-y'],
            inset: ['inset-x', 'inset-y', 'top', 'right', 'bottom', 'left'],
            'inset-x': ['right', 'left'],
            'inset-y': ['top', 'bottom'],
            flex: ['basis', 'grow', 'shrink'],
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
            'border-w-x': ['border-w-r', 'border-w-l'],
            'border-w-y': ['border-w-t', 'border-w-b'],
            'border-color': [
                'border-color-t',
                'border-color-r',
                'border-color-b',
                'border-color-l',
            ],
            'border-color-x': ['border-color-r', 'border-color-l'],
            'border-color-y': ['border-color-t', 'border-color-b'],
            'scroll-m': [
                'scroll-mx',
                'scroll-my',
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
                'scroll-pt',
                'scroll-pr',
                'scroll-pb',
                'scroll-pl',
            ],
            'scroll-px': ['scroll-pr', 'scroll-pl'],
            'scroll-py': ['scroll-pt', 'scroll-pb'],
        },
    } as const
}

function getIsAnyForKey(key: string) {
    return [{ [key]: [isAny] }]
}

function getIsAnyAndEmptyForKey(key: string) {
    return [{ [key]: ['', isAny] }]
}
