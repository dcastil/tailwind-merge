import { describe, expect, test } from 'vitest'

import { css, expectMerges, generateFixture } from './fixture-utils'

describe.each(['compact', 'exact'] as const)('%s functional utility effects', (encoding) => {
    test.each(['', 'tw'])(
        'preserves independent effects from suggested slash modifiers (prefix: %s)',
        async (prefix) => {
            const stylesheet = css`
                @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
                @theme {
                    --color-*: initial;
                    --color-red-500: red;
                    --color-blue-500: blue;
                    --text-*: initial;
                    --text-xl: 1.25rem;
                    --text-2xl: 1.5rem;
                }
                @utility label-* {
                    color: --value(--color-*);
                    font-size: --modifier(--text-*);
                }
            `
            const cases = [
                ['label-red-500/xl label-blue-500', 'label-red-500/xl label-blue-500'],
                ['label-blue-500 label-red-500/xl', 'label-red-500/xl'],
                ['label-red-500/xl label-blue-500/2xl', 'label-blue-500/2xl'],
                ['label-red-500 label-blue-500', 'label-blue-500'],
                ['label-red-500/xl text-blue-500', 'label-red-500/xl text-blue-500'],
                ['text-blue-500 label-red-500/xl', 'label-red-500/xl'],
            ].map((pair) =>
                pair.map((list) =>
                    list
                        .split(' ')
                        .map((name) => (prefix ? `${prefix}:${name}` : name))
                        .join(' '),
                ),
            )
            const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
            for (const prune of [undefined, { usedClasses }]) {
                const { twMerge } = await generateFixture(stylesheet, undefined, {
                    encoding,
                    prune,
                })
                expectMerges(twMerge, Object.fromEntries(cases))
            }
        },
    )

    test.each(['', 'tw'])(
        'separates width and color values, including a static default (prefix: %s)',
        async (prefix) => {
            const stylesheet = css`
                @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
                @theme {
                    --color-*: initial;
                    --color-red-500: red;
                    --color-blue-500: blue;
                    --color-2: purple;
                }
                @utility text-stroke {
                    -webkit-text-stroke-width: 1px;
                }
                @utility text-stroke-* {
                    -webkit-text-stroke-width: --value(integer) px;
                    -webkit-text-stroke-width: --value([length]);
                    -webkit-text-stroke-color: --value(--color-*, [color]);
                }
                @utility stroke-open-* {
                    -webkit-text-stroke-width: --value(integer) px;
                    -webkit-text-stroke-color: --value([color]);
                }
                @utility split-number-* {
                    width: --value(number) px;
                    height: --value(integer) px;
                }
                @utility backdrop-* {
                    width: --value(integer) px;
                }
            `
            const cases = [
                ['text-stroke-1 text-stroke-red-500', 'text-stroke-1 text-stroke-red-500'],
                ['text-stroke-red-500 text-stroke-1', 'text-stroke-red-500 text-stroke-1'],
                ['text-stroke-1 text-stroke-3', 'text-stroke-3'],
                ['text-stroke-red-500 text-stroke-blue-500', 'text-stroke-blue-500'],
                ['text-stroke text-stroke-red-500', 'text-stroke text-stroke-red-500'],
                // The numeric color token makes this value set both properties; width alone cannot replace it.
                ['text-stroke-2 text-stroke-3', 'text-stroke-2 text-stroke-3'],
                ['text-stroke-3 text-stroke-2', 'text-stroke-2'],
                ['text-stroke-2 text-stroke-red-500', 'text-stroke-2 text-stroke-red-500'],
                // Unenumerated and arbitrary values must keep their effects when a root has mixed shapes.
                ['text-stroke-9719 text-stroke-red-500', 'text-stroke-9719 text-stroke-red-500'],
                [
                    'text-stroke-[3px] text-stroke-[#123456]',
                    'text-stroke-[3px] text-stroke-[#123456]',
                ],
                ['stroke-open-2 stroke-open-[#123456]', 'stroke-open-2 stroke-open-[#123456]'],
                // Integers set both dimensions, while fractional numbers set width only.
                ['split-number-9721 split-number-2.5', 'split-number-9721 split-number-2.5'],
                ['split-number-2.5 split-number-9721', 'split-number-9721'],
                ['backdrop-3 backdrop-blur-sm', 'backdrop-3 backdrop-blur-sm'],
                ['backdrop-3 backdrop-5', 'backdrop-5'],
            ].map((pair) =>
                pair.map((list) =>
                    list
                        .split(' ')
                        .map((name) => (prefix ? `${prefix}:${name}` : name))
                        .join(' '),
                ),
            )
            const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
            for (const prune of [undefined, { usedClasses }]) {
                const { twMerge, plan } = await generateFixture(stylesheet, undefined, {
                    encoding,
                    prune,
                })
                // More-specific built-in roots keep their suggested classes; they must not split backdrop-* into unrelated effect groups.
                expect(
                    plan.report.customUtilityGroups.filter((id) =>
                        id.startsWith('utility.backdrop'),
                    ),
                ).toEqual(['utility.backdrop'])
                expectMerges(twMerge, Object.fromEntries(cases))
            }
        },
    )
})
