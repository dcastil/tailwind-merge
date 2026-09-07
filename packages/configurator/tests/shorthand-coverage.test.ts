import { expect, test } from 'vitest'

import { emitModule } from '../src/emit'
import { propertyCovers } from '../src/property-coverage'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

test.each(['compact', 'exact'] as const)('%s shorthand coverage preserves unrelated properties', async (encoding) => {
    const stylesheet = css`
        @import 'tailwindcss';
        @utility no-synthesis { font-synthesis: none; }
        @utility no-synthetic-weight { font-synthesis-weight: none; }
        @utility branded-font { font: 16px sans-serif; }
        @utility tall-lines { line-height: 2; }
        @utility border-art { border-image-width: 5px; }
        @utility width-box { border-width: 1px; }
        @utility side-width { border-left-width: 2px; }
        @utility full-border { border: 1px solid red; }
        @utility image-border { border-image: url(border.svg) 10; }
    `
    const cases = {
        'no-synthesis branded-font': 'no-synthesis branded-font',
        'no-synthetic-weight branded-font': 'no-synthetic-weight branded-font',
        'border-art width-box': 'border-art width-box',
        'width-box border-art': 'width-box border-art',
        'border-art side-width': 'border-art side-width',
        // Keep legitimate reset behavior while removing name-based guesses.
        'no-synthetic-weight no-synthesis': 'no-synthesis',
        'text-lg branded-font': 'branded-font',
        'tall-lines branded-font': 'branded-font',
        'border-art full-border': 'full-border',
        'border-art image-border': 'image-border',
        'side-width width-box': 'width-box',
    }
    const usedClasses = [...new Set(Object.keys(cases).flatMap((input) => input.split(' ')))]
    for (const prune of [undefined, { usedClasses }]) {
        const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
        expectMerges(fixture.twMerge, cases)
        for (const format of ['js', 'ts'] as const) {
            const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
            expectMerges(emitted.twMerge, cases)
        }
    }
})

test('property coverage follows known shorthands and the logical-axis policy', () => {
    const covered = [
        ['font', 'font-size'],
        ['font', 'line-height'],
        ['font', 'font-variant'],
        ['font', 'font-variant-numeric'],
        ['font', 'font-feature-settings'],
        ['font-synthesis', 'font-synthesis-weight'],
        ['border', 'border-image-width'],
        ['border-image', 'border-image-width'],
        ['border-width', 'border-top-width'],
        ['border', 'border-inline'],
        ['border-inline', 'border-left'],
        ['border-inline', 'border-inline-start-width'],
        ['border-inline-color', 'border-right-color'],
        ['border-top', 'border-top-color'],
        ['border-radius', 'border-top-left-radius'],
        ['border-radius', 'border-end-start-radius'],
        ['padding', 'padding-block'],
        ['padding-inline', 'padding-left'],
        ['padding-inline', 'padding-inline-end'],
        ['scroll-margin-block', 'scroll-margin-top'],
        ['inset', 'inset-inline'],
        ['inset-block', 'top'],
        ['inset-inline', 'inset-inline-start'],
        ['background', 'background-position-x'],
        ['grid', 'grid-template-columns'],
        ['grid-area', 'grid-column-end'],
        ['flex', 'flex-basis'],
        ['flex-flow', 'flex-wrap'],
        ['gap', 'row-gap'],
        ['place-items', 'justify-items'],
        ['unknown-property', 'unknown-property'],
    ]
    const independent = [
        ['font', 'font-synthesis'],
        ['font', 'font-synthesis-weight'],
        ['font', 'font-palette'],
        ['font', 'font-made-up'],
        ['border-width', 'border-image-width'],
        ['border-top', 'border-image'],
        ['border', 'border-radius'],
        ['border', 'border-top-left-radius'],
        ['border-top', 'border-top-left-radius'],
        ['border', 'border-collapse'],
        ['border', 'border-spacing'],
        ['border-radius', 'border-made-up-radius'],
        ['border-inline-start', 'border-left'],
        ['border-bottom-color', 'border-block-end-color'],
        ['padding-inline-start', 'padding-left'],
        ['padding-inline', 'padding-top'],
        ['color', 'color-scheme'],
        ['overflow', 'overflow-wrap'],
        ['overflow', 'overflow-clip-margin'],
        ['outline', 'outline-offset'],
        ['flex', 'flex-flow'],
        ['flex', 'flex-direction'],
        ['stroke', 'stroke-width'],
        ['fill', 'fill-opacity'],
        ['transform', 'transform-origin'],
        ['background', 'background-blend-mode'],
        ['unknown-property', 'unknown-property-child'],
        ['constructor', 'anything'],
        ['__proto__', 'anything'],
    ]
    for (const [property, target] of covered) {
        expect(propertyCovers(property!, target!), `${property} covers ${target}`).toBe(true)
    }
    for (const [property, target] of covered.filter(([property, target]) => property !== target)) {
        expect(propertyCovers(target!, property!), `${target} only partially covers ${property}`).toBe(false)
    }
    for (const [property, target] of independent) {
        expect(propertyCovers(property!, target!), `${property} is independent of ${target}`).toBe(false)
    }
})
