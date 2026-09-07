import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'
import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

describe.each(['', 'tw'])('custom modifiers (prefix: %s)', (prefix) => {
    test.each(['compact', 'exact'] as const)('%s classifies static slash utilities by their complete names', async (encoding) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @theme { --z-index-popup: 10; }
            @utility badge { padding: 1rem; }
            @utility badge/icon { color: red; }
            @utility badge/tone { color: blue; }
            @utility badge/compact { padding: 2rem; }
            @utility panel { padding: 1rem; border-radius: 1rem; }
            @utility panel/icon { color: red; --panel: 1; }
            @utility standalone/icon { color: red; }
            @utility w-4/icon { color: red; }
            @utility z-popup/icon { color: red; }
            @utility type-badge { font-size: 1rem; line-height: 1.5; }
            @utility type-badge/icon { color: red; }
        `
        const cases = [
            ['badge/icon badge', 'badge/icon badge'],
            ['badge badge/icon', 'badge badge/icon'],
            ['badge/icon badge/tone', 'badge/tone'],
            ['badge/icon text-blue-500', 'text-blue-500'],
            ['text-blue-500 badge/icon', 'badge/icon'],
            ['badge badge/compact', 'badge/compact'],
            ['hover:badge/icon hover:badge', 'hover:badge/icon hover:badge'],
            ['badge/icon! badge!', 'badge/icon! badge!'],
            ['panel/icon panel', 'panel/icon panel'],
            ['panel panel/icon', 'panel panel/icon'],
            ['panel/icon text-blue-500', 'panel/icon text-blue-500'],
            ['standalone/icon text-blue-500', 'text-blue-500'],
            ['w-4/icon w-8', 'w-4/icon w-8'],
            ['z-popup/icon z-20', 'z-popup/icon z-20'],
            ['type-badge/icon type-badge', 'type-badge/icon type-badge'],
            // Enabling lookup on aliased built-in groups must preserve their ordinary modifier behavior.
            ['text-sm/6 text-blue-500', 'text-sm/6 text-blue-500'],
            ['leading-8 text-sm/6', 'text-sm/6'],
            ['text-red-500/50 text-blue-500', 'text-blue-500'],
            ['w-1/2 w-2/3', 'w-2/3'],
        ].map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expect(fixture.plan.report.aliasedUtilityClasses).toMatchObject({ badge: 'p', 'badge/icon': 'text-color', 'type-badge': 'font-size' })
            expect(declaredDeclarations(fixture.designSystem, 'badge/icon')?.map((entry) => entry.property)).toEqual(['color'])
            expectMerges(fixture.twMerge, Object.fromEntries(cases))
            for (const format of ['ts', 'js'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, Object.fromEntries(cases))
            }
        }
    })

    test.each(['compact', 'exact'] as const)(
        '%s preserves custom variant order and postfix effects',
        async (encoding) => {
            const stylesheet = css`
                @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
                @custom-variant children (& > *);
                @custom-variant active (& > a);
                @custom-variant handheld (@media (max-width: 600px));
                @theme {
                    --breakpoint-3xl: 120rem;
                }
                @utility pair-* {
                    width: calc(--value(integer) * 1px);
                    height: calc(--modifier(integer) * 1px);
                }
            `
            const cases = {
                'children:hover:text-red-500 hover:children:text-blue-500':
                    'children:hover:text-red-500 hover:children:text-blue-500',
                'children:hover:text-red-500 children:hover:text-blue-500':
                    'children:hover:text-blue-500',
                'active:focus:block focus:active:hidden': 'active:focus:block focus:active:hidden',
                'handheld:hover:block hover:handheld:hidden': 'hover:handheld:hidden',
                '3xl:hover:block hover:3xl:hidden': 'hover:3xl:hidden',
                'pair-2/3 pair-4': 'pair-2/3 pair-4',
                'pair-4 pair-2/3': 'pair-2/3',
                'pair-2/3 pair-4/5': 'pair-4/5',
                'hover:pair-2/3 hover:pair-4': 'hover:pair-2/3 hover:pair-4',
            }
            const withPrefix = (list: string) =>
                list
                    .split(' ')
                    .map((name) => (prefix ? `${prefix}:${name}` : name))
                    .join(' ')
            const expectedMerges = Object.fromEntries(
                Object.entries(cases).map(([input, expected]) => [
                    withPrefix(input),
                    withPrefix(expected),
                ]),
            )
            const usedClasses = Object.keys(expectedMerges).flatMap((input) => input.split(' '))
            for (const prune of [undefined, { usedClasses }]) {
                const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, {
                    encoding,
                    prune,
                })
                // Tailwind itself establishes the two different targets and the extra postfix declaration.
                expect(
                    declaredDeclarations(designSystem, 'children:hover:text-red-500')?.[0]?.scope,
                ).not.toEqual(
                    declaredDeclarations(designSystem, 'hover:children:text-blue-500')?.[0]?.scope,
                )
                expect(
                    declaredDeclarations(designSystem, 'pair-2/3')?.map((entry) => entry.property),
                ).toEqual(['width', 'height'])
                expectMerges(twMerge, expectedMerges)
            }
        },
    )
})
