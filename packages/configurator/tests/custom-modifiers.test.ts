import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'

import { css, expectMerges, generateFixture } from './fixture-utils'

describe.each(['', 'tw'])('custom modifiers (prefix: %s)', (prefix) => {
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
