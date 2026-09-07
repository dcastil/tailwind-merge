import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'
import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

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

describe.each(['compact', 'exact'] as const)('%s custom-property declarations', (encoding) => {
    test.each(['', 'tw'])('retains balanced blocks in declaration values (prefix: %s)', async (prefix) => {
        const values = [
            '{ready}',
            '{ ready: [one; {two}]; later: (three; four); }',
            '[ready; {set}]',
            'fn({ready; [set]})',
            String.raw`{ quoted: "}"; escaped: \}; flag: !kept; }`,
        ]
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            ${values.map((value, index) => `@utility state-${index} { color: red; --state: ${value}; }`).join('\n')}
            @utility scoped-state {
                --state: {ready};
                padding: 1rem;
                &::before { --state: [waiting; {set}]; content: '('; }
                @starting-style { --state: {initial}; opacity: 0; }
            }
        `
        const cases = Object.fromEntries([
            ...values.flatMap((_, index) => [
                [`state-${index} text-blue-500`, `state-${index} text-blue-500`],
                [`text-blue-500 state-${index}`, `state-${index}`],
                [`state-${index} state-${index}`, `state-${index}`],
            ]),
            ['scoped-state p-2', 'scoped-state p-2'],
        ].map((pair) => pair.map((list) => list!.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' '))))
        const usedClasses = [...new Set(Object.keys(cases).flatMap((input) => input.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            for (const [index, value] of values.entries()) {
                expect(declaredDeclarations(fixture.designSystem, `state-${index}`)).toEqual([
                    expect.objectContaining({ property: 'color', value: 'red' }),
                    expect.objectContaining({ property: '--state', value, important: false }),
                ])
            }
            expect(declaredDeclarations(fixture.designSystem, 'scoped-state')).toEqual([
                expect.objectContaining({ property: '--state', value: '{ready}', conditional: false }),
                expect.objectContaining({ property: 'padding', value: '1rem', conditional: false }),
                expect.objectContaining({ property: '--state', value: '[waiting; {set}]', context: '::before' }),
                expect.objectContaining({ property: 'content', value: "'('", context: '::before' }),
                expect.objectContaining({ property: '--state', value: '{initial}', conditional: true }),
                expect.objectContaining({ property: 'opacity', value: '0', conditional: true }),
            ])
            expectMerges(fixture.twMerge, cases)
            for (const format of ['ts', 'js'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, cases)
            }
        }
    })

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
