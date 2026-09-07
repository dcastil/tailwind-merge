import { describe, test } from 'vitest'

import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

// These independent CSS longhands provide a small, explicit oracle: a later class can replace an earlier one only when it sets all of the earlier class's properties. Do not use production coverage helpers to derive the expected results.
const properties = ['width', 'height', 'color']
const utilities = Array.from({ length: 7 }, (_, index) => index + 1).flatMap((mask) =>
    ['a', 'b'].map((value) => ({ name: `effect-${mask}-${value}`, mask, value })),
)
const rows = utilities.flatMap((first) => utilities.flatMap((second) => {
    const third = utilities[(first.mask + second.mask) % utilities.length]!
    return [[first, second], [first, second, third]].map((list): [string, string] => [
        list.map(({ name }) => name).join(' '),
        list.filter((item, index) => !list.slice(index + 1).some((later) =>
            (later.mask & item.mask) === item.mask,
        )).map(({ name }) => name).join(' '),
    ])
}))

describe.each(['compact', 'exact'] as const)('%s effect combinations', (encoding) => {
    test.each(['', 'tw'])('keeps coverage and lookup decisions across representations (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @custom-variant children (& > *);
            @theme { --color-x-13: red; }
            ${utilities.map(({ name, mask, value }) => `@utility ${name} {
                ${properties.flatMap((property, index) => mask & (1 << index)
                    ? [`${property}: ${property === 'color' ? (value === 'a' ? 'red' : 'blue') : (value === 'a' ? '1px' : '2px')};`]
                    : []).join('\n')}
            }`).join('\n')}
            @utility thing-* { opacity: --value(number); }
            @utility thing-width-* {
                width: calc(--value(integer) * 1px);
                height: --modifier([length]);
            }
            @utility badge { padding: 1rem; }
            @utility badge/icon { color: red; }
            @utility pull { margin-left: 1rem; }
            @utility -pull { margin-right: -1rem; }
        `
        const preserved = [
            'thing-width-2/[3px] thing-0.5 effect-4-a',
            'thing-0.5 thing-width-2/[3px] effect-4-a',
            'badge/icon badge',
            'pull -pull',
            '-pull pull',
            'border-x-13 border-blue-500',
            'hover:children:effect-7-a children:hover:effect-7-b',
            'effect-7-a! effect-7-b',
        ]
        const cases = [
            ...rows.flatMap((row) => ['', 'hover:', '!'].map((modifier) => mapCase(row,
                (name) => modifier === '!' ? `${name}!` : `${modifier}${name}`,
            ))),
            ...preserved.map((input): [string, string] => [input, input]),
        ].map((row) => mapCase(row, (name) => prefix ? `${prefix}:${name}` : name))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expectMerges(fixture.twMerge, cases)
            for (const format of ['ts', 'js'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, cases)
            }
        }
    })
})

/** Decorate both sides of an independently specified case without deriving its expected merge result from runtime behavior. */
function mapCase([input, expected]: [string, string], decorate: (name: string) => string): [string, string] {
    const apply = (list: string) => list.split(' ').map(decorate).join(' ')
    return [apply(input), apply(expected)]
}
