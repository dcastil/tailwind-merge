import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'

import { css, generateFixture } from './fixture-utils'

const values = [
    "'('",
    "')'",
    "'{'",
    "'}'",
    "';'",
    `'"('`,
    `"'("`,
    String.raw`'\'('`,
    String.raw`"\"({;"`,
    String.raw`'\\'`,
]
const stylesheet = css`
    @import 'tailwindcss';
    ${values
        .map(
            (value, index) => `@utility quoted-${index} {
        color: red;
        &::before { content: ${value}; width: 1px; }
    }`,
        )
        .join('\n')}
`

describe.each(['compact', 'exact'] as const)('%s quoted declarations', (encoding) => {
    test.each([false, true])('preserves pseudo-element effects (pruned: %s)', async (prune) => {
        const usedClasses = ['text-blue-500', ...values.map((_, index) => `quoted-${index}`)]
        const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, {
            encoding,
            prune: prune ? { usedClasses } : undefined,
        })
        for (const [index, value] of values.entries()) {
            const name = `quoted-${index}`
            expect(declaredDeclarations(designSystem, name)).toEqual([
                expect.objectContaining({ context: '', property: 'color', value: 'red' }),
                expect.objectContaining({ context: '::before', property: 'content', value }),
                expect.objectContaining({ context: '::before', property: 'width', value: '1px' }),
            ])
            expect(twMerge(`${name} text-blue-500`)).toBe(`${name} text-blue-500`)
            expect(twMerge(`text-blue-500 ${name}`)).toBe(name)
        }
    })
})
