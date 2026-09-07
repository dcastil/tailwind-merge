import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'
import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

describe.each(['compact', 'exact'] as const)('%s functional utility effects', (encoding) => {
    test.each(['', 'tw'])('preserves bare modifier effects on named values (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @utility type-* {
                font-size: --value(--text-*);
                line-height: --modifier(number);
            }
            @utility type-count-* {
                font-size: --value(--text-*);
                --count: --modifier(integer);
            }
            @utility type-percent-* {
                font-size: --value(--text-*);
                --percent: --modifier(percentage);
            }
            @utility same-type-* {
                font-size: --value(--text-*);
                font-size: calc(--modifier(number) * 1rem);
            }
        `
        const cases = [
            ['type-sm/2 type-lg', 'type-sm/2 type-lg'],
            ['type-sm/1.5 type-lg', 'type-sm/1.5 type-lg'],
            ['type-lg type-sm/1.5', 'type-lg type-sm/1.5'],
            ['type-count-sm/2 type-count-lg', 'type-count-sm/2 type-count-lg'],
            ['type-percent-sm/35% type-percent-lg', 'type-percent-sm/35% type-percent-lg'],
            ['type-sm type-lg', 'type-sm type-lg'],
            ['hover:type-sm/2 hover:type-lg', 'hover:type-sm/2 hover:type-lg'],
            ['type-sm/2! type-lg!', 'type-sm/2! type-lg!'],
            ['same-type-sm/2 same-type-lg', 'same-type-lg'],
            ['same-type-lg same-type-sm/2', 'same-type-sm/2'],
        ].map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            for (const [name, properties] of [
                ['type-sm/2', ['font-size', 'line-height']],
                ['type-count-sm/2', ['font-size', '--count']],
                ['type-percent-sm/35%', ['font-size', '--percent']],
            ] as const) {
                expect(declaredDeclarations(fixture.designSystem, name)?.map((entry) => entry.property)).toEqual(properties)
            }
            expectMerges(fixture.twMerge, Object.fromEntries(cases))
            for (const format of ['js', 'ts'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, Object.fromEntries(cases))
            }
        }
    })

    test.each(['', 'tw'])('separates arbitrary image and color effects (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @utility paint-* {
                background-image: --value([image]);
                background-color: --value([color]);
            }
            @utility image-* {
                background-image: --value([image]);
            }
            @utility ratio-* {
                aspect-ratio: --value([ratio]);
                height: --modifier([length]);
            }
        `
        const cases = [
            ['paint-[url(hero.svg)] paint-[#123456]', 'paint-[url(hero.svg)] paint-[#123456]'],
            ['paint-[#123456] paint-[url(hero.svg)]', 'paint-[#123456] paint-[url(hero.svg)]'],
            ['paint-[linear-gradient(red,blue)] paint-[#123456]', 'paint-[linear-gradient(red,blue)] paint-[#123456]'],
            ['hover:paint-[url(hero.svg)] hover:paint-[#123456]', 'hover:paint-[url(hero.svg)] hover:paint-[#123456]'],
            ['paint-[url(hero.svg)]! paint-[#123456]!', 'paint-[url(hero.svg)]! paint-[#123456]!'],
            // Image-only utilities still merge normally, including under exact encoding.
            ['image-[url(hero.svg)] image-[url(other.svg)]', 'image-[url(other.svg)]'],
            ['ratio-[5/4]/[3px] ratio-[3/2]', 'ratio-[5/4]/[3px] ratio-[3/2]'],
        ].map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expect(declaredDeclarations(fixture.designSystem, 'paint-[url(hero.svg)]')?.map((entry) => entry.property)).toEqual(['background-image'])
            expect(declaredDeclarations(fixture.designSystem, 'paint-[#123456]')?.map((entry) => entry.property)).toEqual(['background-color'])
            expectMerges(fixture.twMerge, Object.fromEntries(cases))
            for (const format of ['ts', 'js'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, Object.fromEntries(cases))
            }
        }
    })

    test('separates every arbitrary base-value type from independent named effects', async () => {
        const stylesheet = css`
            @import 'tailwindcss';
            ${ARBITRARY_DATA_TYPE_CASES.map(([type], index) => `
                @utility typed-value-${index}-* {
                    --named-effect: --value('named');
                    --arbitrary-effect: --value([${type}]);
                }
                @utility uniform-value-${index}-* {
                    --uniform-effect: --value([${type}]);
                }
            `).join('\n')}
        `
        const usedClasses = ARBITRARY_DATA_TYPE_CASES.flatMap(([, value], index) => [
            `typed-value-${index}-named`,
            `typed-value-${index}-[${value}]`,
            `uniform-value-${index}-[${value}]`,
        ])
        for (const prune of [undefined, { usedClasses }]) {
            const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, { encoding, prune })
            for (const [index, [, value]] of ARBITRARY_DATA_TYPE_CASES.entries()) {
                const named = `typed-value-${index}-named`
                const arbitrary = `typed-value-${index}-[${value}]`
                const uniform = `uniform-value-${index}-[${value}]`
                expect(declaredDeclarations(designSystem, arbitrary)?.map((entry) => entry.property)).toEqual(['--arbitrary-effect'])
                expectMerges(twMerge, [
                    [`${named} ${arbitrary}`, `${named} ${arbitrary}`],
                    [`${arbitrary} ${named}`, `${arbitrary} ${named}`],
                    [`${named} ${named}`, named],
                    [`${uniform} ${uniform}`, uniform],
                ])
            }
        }
    })

    test('preserves effects across Tailwind arbitrary modifier types', async () => {
        const modifiers = ARBITRARY_DATA_TYPE_CASES
        const stylesheet = css`
            @import 'tailwindcss';
            ${modifiers.map(([type], index) => `@utility typed-modifier-${index}-* {
                width: calc(--value(number) * 1px);
                --effect: --modifier([${type}]);
            }`).join('\n')}
        `
        const usedClasses = modifiers.flatMap(([, value], index) => [`typed-modifier-${index}-2/[${value}]`, `typed-modifier-${index}-3`])
        for (const prune of [undefined, { usedClasses }]) {
            const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, { encoding, prune })
            for (const [index, [, value]] of modifiers.entries()) {
                const modified = `typed-modifier-${index}-2/[${value}]`
                expect(declaredDeclarations(designSystem, modified)?.map((entry) => entry.property)).toEqual(['width', '--effect'])
                expect(twMerge(`${modified} typed-modifier-${index}-3`)).toBe(`${modified} typed-modifier-${index}-3`)
            }
        }
    })

    test.each(['', 'tw'])('preserves arbitrary slash modifier effects (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @theme {
                --color-*: initial;
                --color-red: red;
                --color-blue: blue;
            }
            @utility pair-* {
                width: calc(--value(number, [number]) * 1px);
                height: --modifier([length]);
            }
            @utility text-label-* {
                color: --value(--color-*);
                font-size: --modifier([length]);
            }
            @utility same-* {
                width: calc(--value(number) * 1px);
                width: --modifier([length]);
            }
        `
        const cases = [
            ['pair-2/[3px] pair-3', 'pair-2/[3px] pair-3'],
            ['pair-3 pair-2/[3px]', 'pair-3 pair-2/[3px]'],
            ['pair-2/[calc(3px/2)] pair-3', 'pair-2/[calc(3px/2)] pair-3'],
            ['pair-[2]/[3px] pair-3', 'pair-[2]/[3px] pair-3'],
            ['hover:pair-2/[3px] hover:pair-3', 'hover:pair-2/[3px] hover:pair-3'],
            ['pair-2 pair-3', 'pair-2 pair-3'],
            ['text-label-red/[3px] text-label-blue', 'text-label-red/[3px] text-label-blue'],
            ['text-label-red/[3px] text-blue', 'text-label-red/[3px] text-blue'],
            ['same-2/[3px] same-3', 'same-3'],
            ['same-3 same-2/[3px]', 'same-2/[3px]'],
        ].map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, { encoding, prune })
            expect(declaredDeclarations(designSystem, 'pair-2/[3px]')?.map((entry) => entry.property)).toEqual(['width', 'height'])
            expectMerges(twMerge, Object.fromEntries(cases))
        }
    })

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

// Use different samples from the implementation's probes to verify behavior across the supported kinds rather than only the sentinel spellings.
const ARBITRARY_DATA_TYPE_CASES = [
    ['color', '#123456'],
    ['length', '4px'],
    ['percentage', '35%'],
    ['ratio', '5/4'],
    ['number', '2.5'],
    ['integer', '3'],
    ['url', 'url(icon.svg)'],
    ['position', 'right_bottom'],
    ['bg-size', 'contain'],
    ['line-width', 'thin'],
    ['image', 'linear-gradient(red,blue)'],
    ['family-name', 'Example,serif'],
    ['generic-name', 'monospace'],
    ['absolute-size', 'x-large'],
    ['relative-size', 'smaller'],
    ['angle', '23deg'],
    ['vector', '4_5_6'],
]
