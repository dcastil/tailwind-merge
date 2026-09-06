import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'

import { css, generateFixture } from './fixture-utils'

const properties = [
    '--_size',
    '--2xl',
    '--échelle',
    '--サイズ',
    '--📐',
    String.raw`--\_size`,
    String.raw`--\32 xl`,
    String.raw`--size\:wide`,
    String.raw`--size\;wide`,
]
const stylesheet = css`
    @import 'tailwindcss';
    ${properties.map((property, index) => `
        @utility sized-${index} { color: red; ${property}: 2rem; }
        @utility read-${index} { width: var(${property}); }
    `).join('\n')}
`

describe.each(['compact', 'exact'] as const)('%s custom-property identifiers', (encoding) => {
    test.each([false, true])('preserves state used by another utility (pruned: %s)', async (prune) => {
        const usedClasses = ['text-blue-500', 'w-(--_size)', ...properties.flatMap((_, index) => [`sized-${index}`, `read-${index}`])]
        const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, {
            encoding,
            prune: prune ? { usedClasses } : undefined,
        })
        for (const [index, property] of properties.entries()) {
            expect(declaredDeclarations(designSystem, `sized-${index}`)).toEqual([
                expect.objectContaining({ property: 'color', value: 'red' }),
                expect.objectContaining({ property, value: '2rem' }),
            ])
            expect(twMerge(`sized-${index} text-blue-500 read-${index}`)).toBe(`sized-${index} text-blue-500 read-${index}`)
            expect(twMerge(`text-blue-500 sized-${index}`)).toBe(`sized-${index}`)
        }
        expect(twMerge('sized-0 text-blue-500 w-(--_size)')).toBe('sized-0 text-blue-500 w-(--_size)')
    })
})
