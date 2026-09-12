/**
 * Whether setting one property fully controls another, using only known CSS shorthand relationships. Name resemblance is insufficient: `font` excludes `font-synthesis`, and `border-width` excludes `border-image-width`. Unknown relationships preserve classes conservatively.
 * Logical axis coverage follows the default config's horizontal-tb policy (`padding-inline` covers left/right). Single logical sides remain unrelated to physical sides because their mapping also depends on text direction.
 */
export function propertyCovers(property: string, target: string): boolean {
    if (property === target) {
        return true
    }
    const longhands = SHORTHAND_LONGHANDS.get(property)
    if (!longhands) {
        return false
    }
    const targetLonghands = SHORTHAND_LONGHANDS.get(target)
    return targetLonghands
        ? [...targetLonghands].every((longhand) => longhands.has(longhand))
        : longhands.has(target)
}

/** Expands the known shorthand graph once, including reset-only longhands. This also handles overlapping shorthands, such as border-inline covering border-left under the horizontal-tb policy, without guessing from property names. */
function buildShorthandLonghands(): Map<string, Set<string>> {
    const shorthands = new Map<string, string[]>(Object.entries({
        animation: [
            'animation-name', 'animation-duration', 'animation-timing-function',
            'animation-delay', 'animation-iteration-count', 'animation-direction',
            'animation-fill-mode', 'animation-play-state',
        ],
        background: [
            'background-image', 'background-position', 'background-size', 'background-repeat',
            'background-origin', 'background-clip', 'background-attachment', 'background-color',
        ],
        'background-position': ['background-position-x', 'background-position-y'],
        border: ['border-width', 'border-style', 'border-color', 'border-image'],
        'border-image': [
            'border-image-source', 'border-image-slice', 'border-image-width',
            'border-image-outset', 'border-image-repeat',
        ],
        'border-radius': [
            'border-top-left-radius', 'border-top-right-radius',
            'border-bottom-left-radius', 'border-bottom-right-radius',
            'border-start-start-radius', 'border-start-end-radius',
            'border-end-start-radius', 'border-end-end-radius',
        ],
        'column-rule': ['column-rule-width', 'column-rule-style', 'column-rule-color'],
        columns: ['column-width', 'column-count'],
        container: ['container-name', 'container-type'],
        flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
        'flex-flow': ['flex-direction', 'flex-wrap'],
        // CSS Fonts Level 4 defines these longhands, including reset-only ones. Synthesis and palette remain independent: https://www.w3.org/TR/css-fonts-4/#font-prop
        font: [
            'font-family', 'font-size', 'font-width', 'font-stretch', 'font-style',
            'font-weight', 'line-height', 'font-variant', 'font-feature-settings',
            'font-kerning', 'font-language-override', 'font-optical-sizing',
            'font-size-adjust', 'font-variation-settings',
        ],
        'font-variant': [
            'font-variant-alternates', 'font-variant-caps', 'font-variant-east-asian',
            'font-variant-emoji', 'font-variant-ligatures', 'font-variant-numeric',
            'font-variant-position',
        ],
        'font-synthesis': [
            'font-synthesis-weight', 'font-synthesis-style',
            'font-synthesis-small-caps', 'font-synthesis-position',
        ],
        gap: ['row-gap', 'column-gap'],
        grid: ['grid-template', 'grid-auto-flow', 'grid-auto-rows', 'grid-auto-columns'],
        'grid-template': ['grid-template-rows', 'grid-template-columns', 'grid-template-areas'],
        'grid-area': ['grid-row', 'grid-column'],
        'grid-row': ['grid-row-start', 'grid-row-end'],
        'grid-column': ['grid-column-start', 'grid-column-end'],
        'list-style': ['list-style-image', 'list-style-position', 'list-style-type'],
        mask: [
            'mask-image', 'mask-mode', 'mask-position', 'mask-size', 'mask-repeat',
            'mask-origin', 'mask-clip', 'mask-composite',
        ],
        'mask-border': [
            'mask-border-source', 'mask-border-slice', 'mask-border-width',
            'mask-border-outset', 'mask-border-repeat', 'mask-border-mode',
        ],
        offset: ['offset-position', 'offset-path', 'offset-distance', 'offset-rotate', 'offset-anchor'],
        outline: ['outline-width', 'outline-style', 'outline-color'],
        overflow: ['overflow-x', 'overflow-y'],
        'overscroll-behavior': ['overscroll-behavior-x', 'overscroll-behavior-y'],
        'place-content': ['align-content', 'justify-content'],
        'place-items': ['align-items', 'justify-items'],
        'place-self': ['align-self', 'justify-self'],
        'text-decoration': [
            'text-decoration-line', 'text-decoration-style',
            'text-decoration-color', 'text-decoration-thickness',
        ],
        'text-emphasis': ['text-emphasis-style', 'text-emphasis-color'],
        transition: [
            'transition-property', 'transition-duration', 'transition-timing-function',
            'transition-delay', 'transition-behavior',
        ],
        '-webkit-text-stroke': ['-webkit-text-stroke-width', '-webkit-text-stroke-color'],
    }))

    for (const name of ['margin', 'padding', 'scroll-margin', 'scroll-padding']) {
        addBoxShorthand(shorthands, name, (side) => `${name}-${side}`)
    }
    addBoxShorthand(shorthands, 'inset', (side) =>
        side.startsWith('inline') || side.startsWith('block') ? `inset-${side}` : side,
    )
    // Border side shorthands set width/style/color; only the whole border also resets border-image. None cover radii: https://www.w3.org/TR/css-backgrounds-3/#border-shorthands
    const borderComponents = ['width', 'style', 'color']
    for (const component of borderComponents) {
        addBoxShorthand(shorthands, `border-${component}`, (side) => `border-${side}-${component}`)
    }
    for (const side of [
        'top', 'right', 'bottom', 'left', 'inline', 'block',
        'inline-start', 'inline-end', 'block-start', 'block-end',
    ]) {
        shorthands.set(`border-${side}`, borderComponents.map((part) => `border-${side}-${part}`))
    }

    const expanded = new Map<string, Set<string>>()
    const expand = (property: string): Set<string> => {
        const cached = expanded.get(property)
        if (cached) {
            return cached
        }
        const longhands = new Set<string>()
        for (const child of shorthands.get(property)!) {
            for (const longhand of shorthands.has(child) ? expand(child) : [child]) {
                longhands.add(longhand)
            }
        }
        expanded.set(property, longhands)
        return longhands
    }
    for (const property of shorthands.keys()) {
        expand(property)
    }
    return expanded
}

/** Registers a known four-sided shorthand and its logical axes, retaining the library's horizontal-tb axis policy without equating individual logical and physical sides. */
function addBoxShorthand(
    shorthands: Map<string, string[]>,
    name: string,
    sideProperty: (side: string) => string,
): void {
    shorthands.set(name, ['top', 'right', 'bottom', 'left', 'inline', 'block'].map(sideProperty))
    for (const [axis, sides] of [
        ['inline', ['left', 'right']],
        ['block', ['top', 'bottom']],
    ] as const) {
        shorthands.set(
            sideProperty(axis),
            [`${axis}-start`, `${axis}-end`, ...sides].map(sideProperty),
        )
    }
}

const SHORTHAND_LONGHANDS = buildShorthandLonghands()
