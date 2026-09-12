import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'
import { emitModule } from '../src/emit'
import { materializeConfig } from '../src/materialize'
import { prunePlan } from '../src/prune'

import {
    assertExactClassificationParity,
    assertPruningEquivalence,
    assertTailwindConformance,
    css,
    expectMerges,
    generateFixture,
    importEmittedModule,
    mergeTable,
    sampleUsedClasses,
} from './fixture-utils'

describe.each(['compact', 'exact'] as const)('%s new combined-effect names', (encoding) => {
    test.each(['', 'tw'])('neutralizes names absent from vanilla suggestions (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @theme {
                --color-x-13: red;
                --color-x-17: blue;
                --color-y-13: green;
                --color-x-hairline: black;
                --border-width-hairline: 1px;
            }
        `
        const cases = {
            'border-x-13 border-blue-500': 'border-x-13 border-blue-500',
            'border-blue-500 border-x-13': 'border-blue-500 border-x-13',
            'border-x-13 border-x-2': 'border-x-13 border-x-2',
            'border-x-2 border-x-13': 'border-x-2 border-x-13',
            'border-x-13 border-x-17': 'border-x-13 border-x-17',
            'border-y-13 border-blue-500': 'border-y-13 border-blue-500',
            'divide-x-13 divide-blue-500': 'divide-x-13 divide-blue-500',
            'divide-blue-500 divide-x-13': 'divide-blue-500 divide-x-13',
            'divide-x-13 divide-x-2': 'divide-x-13 divide-x-2',
            'divide-x-2 divide-x-13': 'divide-x-2 divide-x-13',
            'divide-x-13 divide-x-17': 'divide-x-13 divide-x-17',
            'divide-y-13 divide-blue-500': 'divide-y-13 divide-blue-500',
            'border-x-hairline border-blue-500': 'border-x-hairline border-blue-500',
            'border-x-hairline border-x-2': 'border-x-hairline border-x-2',
            'divide-x-hairline divide-blue-500': 'divide-x-hairline divide-blue-500',
            'divide-x-hairline divide-x-2': 'divide-x-hairline divide-x-2',
            'hover:border-x-13 hover:border-blue-500': 'hover:border-x-13 hover:border-blue-500',
            'divide-x-13! divide-blue-500!': 'divide-x-13! divide-blue-500!',
            'bg-x-13 bg-blue-500': 'bg-blue-500',
            'text-x-13 text-x-17': 'text-x-17',
            'border-hairline border-2': 'border-2',
        }
        const prefixedCases = Object.fromEntries(Object.entries(cases).map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' '))))
        const usedClasses = [...new Set(Object.keys(prefixedCases).flatMap((input) => input.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expect(declaredDeclarations(fixture.designSystem, 'border-x-13')?.map((entry) => entry.property)).toEqual(['border-inline-style', 'border-inline-width', 'border-color'])
            expectMerges(fixture.twMerge, prefixedCases)
            expect(fixture.plan.report.resolvedCollisions).toEqual(expect.arrayContaining([
                expect.objectContaining({ className: 'border-x-13', keptGroupId: null }),
                expect.objectContaining({ className: 'divide-x-13', keptGroupId: null }),
                expect.objectContaining({ className: 'border-x-hairline', keptGroupId: null }),
            ]))
            for (const format of ['js', 'ts'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, prefixedCases)
            }
        }
    })
})

// Themes that are unusual but entirely possible to write in Tailwind CSS, chosen to stress the one thing a hand-written config gets wrong first: class names that look alike but mean different things. Every fixture runs the conformance sweep (Tailwind's compiled CSS is the authority) and pins the specific merges that matter with `expectMerges`; the `mergeTable` snapshots document behavior where seeing it is the point.

// A numeric color token: `--color-4` turns `border-4`, `ring-4`, `stroke-4`, `text-4`, … into colors, while the same number stays a width for `decoration-4` and `ring-offset-4` and a plain number for `opacity-4`, `p-4`, `z-4`. The same `-4` tail must therefore land in different class groups per utility — exactly the "one prefix, one validator, two groups" situation a `isNumber` matcher alone cannot express. Tailwind decides per utility which interpretation wins; the generated config follows its compiled output class by class.
describe('numeric color tokens next to bare-number values', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --color-4: #abc;
            --color-0: #555;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('Tailwind resolves the number as a color for some utilities and as a number for others', () => {
        const compiledProperties = (className: string) =>
            declaredDeclarations(designSystem, className)
                ?.map((entry) => entry.property)
                .join(', ')
        expect(compiledProperties('border-4')).toBe('border-color')
        expect(compiledProperties('stroke-4')).toBe('stroke')
        expect(compiledProperties('text-4')).toBe('color')
        expect(compiledProperties('decoration-4')).toBe('text-decoration-thickness')
        expect(compiledProperties('ring-offset-4')).toBe(
            '--tw-ring-offset-width, --tw-ring-offset-shadow',
        )
        expect(compiledProperties('p-4')).toBe('padding')
    })

    test('utilities where the number became a color stop merging with their widths and merge with colors', () => {
        expectMerges(twMerge, {
            'border-4 border-2': 'border-4 border-2',
            'border-2 border-4': 'border-2 border-4',
            'border-4 border-red-500': 'border-red-500',
            'border-red-500 border-4': 'border-4',
            'border-0 border-2': 'border-0 border-2',
            'border-x-4 border-x-2': 'border-x-4 border-x-2',
            'border-t-4 border-t-red-500': 'border-t-red-500',
            'stroke-4 stroke-2': 'stroke-4 stroke-2',
            'stroke-4 stroke-red-500': 'stroke-red-500',
            'ring-4 ring-2': 'ring-4 ring-2',
            'ring-4 ring-red-500': 'ring-red-500',
            'ring-0 ring-2': 'ring-0 ring-2',
            'outline-4 outline-2': 'outline-4 outline-2',
            'outline-4 outline-red-500': 'outline-red-500',
            'inset-ring-4 inset-ring-2': 'inset-ring-4 inset-ring-2',
            'divide-4 divide-2': 'divide-4 divide-2',
            'divide-4 divide-red-500': 'divide-red-500',
            'text-4 text-lg': 'text-4 text-lg',
            'text-4 text-red-500': 'text-red-500',
            'bg-4 bg-red-500': 'bg-red-500',
            'shadow-4 shadow-lg': 'shadow-4 shadow-lg',
            'shadow-4 shadow-red-500': 'shadow-red-500',
            'from-4 from-red-500': 'from-red-500',
            'from-4 from-10%': 'from-4 from-10%',
            'mask-b-from-4 mask-b-from-red-500': 'mask-b-from-red-500',
            'mask-b-from-4 mask-b-from-50%': 'mask-b-from-4 mask-b-from-50%',
        })
    })

    test('utilities where the number stayed a number keep merging as before', () => {
        expectMerges(twMerge, {
            'decoration-4 decoration-2': 'decoration-2',
            'decoration-2 decoration-4': 'decoration-4',
            'decoration-4 decoration-red-500': 'decoration-4 decoration-red-500',
            'ring-offset-4 ring-offset-2': 'ring-offset-2',
            'underline-offset-4 underline-offset-2': 'underline-offset-2',
            'opacity-4 opacity-50': 'opacity-50',
            'p-4 p-2': 'p-2',
            'p-0 p-2': 'p-2',
            'z-4 z-10': 'z-10',
            'gap-4 gap-2': 'gap-2',
            // No utility makes `rounded-4` exist, so it stays a non-Tailwind class.
            'rounded-4 rounded-lg': 'rounded-4 rounded-lg',
        })
    })

    test('reports the classes it had to take back from the color groups', () => {
        expect(plan.report.resolvedCollisions).toEqual(
            expect.arrayContaining([
                {
                    className: 'decoration-4',
                    keptGroupId: 'text-decoration-thickness',
                    removedFromGroupIds: ['text-decoration-color'],
                },
                {
                    className: 'ring-offset-4',
                    keptGroupId: 'ring-offset-w',
                    removedFromGroupIds: ['ring-offset-color'],
                },
            ]),
        )
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// The same value name defined in two namespaces that one utility reads: Tailwind picks one interpretation per utility (color before width for `border-*`, the shadow before the color for `shadow-*`, the family before the weight for `font-*`, color before size for `text-*`), and the generated config must land the class in exactly that group — while the other namespace's scale still claims the same name for its own group.
describe('one value name in two namespaces read by the same utility', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --border-width-thin: 0.5px;
            --color-thin: #123;
            --shadow-brand: 0 0 1px blue;
            --color-brand: #f00;
            --font-weight-display: 550;
            --font-display: 'Display', sans-serif;
            --text-7: 7rem;
            --color-7: #777;
            --text-brand: 1.25rem;
            --tracking-brand: 0.2em;
            --radius-brand: 4px;
            --leading-brand: 1.7;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('each class lands in the group of the interpretation Tailwind picked', () => {
        expectMerges(twMerge, {
            // border-thin is the color, not the width.
            'border-thin border-2': 'border-thin border-2',
            'border-2 border-thin': 'border-2 border-thin',
            'border-thin border-red-500': 'border-red-500',
            // shadow-brand is the box shadow, not the shadow color — even though the color scale's `brand` would claim it for shadow-color.
            'shadow-brand shadow-lg': 'shadow-lg',
            'shadow-lg shadow-brand': 'shadow-brand',
            'shadow-brand shadow-red-500': 'shadow-brand shadow-red-500',
            'bg-brand bg-red-500': 'bg-red-500',
            // font-display is the family, not the weight.
            'font-display font-sans': 'font-sans',
            'font-display font-bold': 'font-display font-bold',
            'font-bold font-display': 'font-bold font-display',
            // text-7 and text-brand are colors, not sizes.
            'text-7 text-lg': 'text-7 text-lg',
            'text-7 text-red-500': 'text-red-500',
            'text-brand text-lg': 'text-brand text-lg',
            'text-brand text-red-500': 'text-red-500',
            'text-brand/7 text-lg': 'text-brand/7 text-lg',
            // Namespaces only one utility reads stay plain scale values.
            'tracking-brand tracking-wide': 'tracking-wide',
            'rounded-brand rounded-lg': 'rounded-lg',
            'leading-brand leading-7': 'leading-7',
        })
    })

    test('reports the claims it took away from the other namespace', () => {
        expect(plan.report.resolvedCollisions).toEqual(
            expect.arrayContaining([
                { className: 'shadow-brand', keptGroupId: 'shadow', removedFromGroupIds: ['shadow-color'] },
            ]),
        )
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Spacing is the one scale where numbers normally come from a multiplier. Named numeric spacing values are allowed and take precedence over the multiplied value, and once the multiplier is gone only the listed numbers exist.
describe('numeric spacing names next to the bare multiplier', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --spacing-4: 2rem;
            --spacing-big: 30rem;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('the named value wins over the multiplied one and merges like any spacing value', () => {
        expect(declaredDeclarations(designSystem, 'p-4')?.[0]?.value).toBe('var(--spacing-4)')
        expect(declaredDeclarations(designSystem, 'p-3')?.[0]?.value).toBe(
            'calc(var(--spacing) * 3)',
        )
        expectMerges(twMerge, {
            'p-4 p-2': 'p-2',
            'p-2 p-4': 'p-4',
            'p-4 p-big': 'p-big',
            'm-4 m-3': 'm-3',
        })
        expect(plan.report.scaleStrategies['spacing']).toBe('multiplier+enumerated')
    })
})

describe('numeric spacing names without the multiplier', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --spacing-*: initial;
            --spacing-4: 2rem;
            --spacing-8: 4rem;
            --spacing-xs: 4px;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('only the listed numbers exist, other numbers pass through as non-Tailwind classes', () => {
        expect(declaredDeclarations(designSystem, 'p-3')).toBeNull()
        expectMerges(twMerge, {
            'p-4 p-8': 'p-8',
            'p-xs p-4': 'p-4',
            'p-px p-4': 'p-4',
            'p-3 p-4': 'p-3 p-4',
            'p-4 p-3': 'p-4 p-3',
            'w-4 w-8': 'w-8',
            'w-3 w-4': 'w-3 w-4',
            'gap-4 gap-3': 'gap-4 gap-3',
            'inset-4 inset-3': 'inset-4 inset-3',
        })
        expect(plan.report.scaleStrategies['spacing']).toBe('enumerated')
    })
})

// Color tokens whose family tails are words, not shades (`brand-500-hover`), mixed with numeric shades of the same family — the state-variant naming design systems use.
describe('color families with word tails next to numeric shades', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --color-brand-500: #33f;
            --color-brand-500-hover: #22e;
            --color-brand-500-active: #11d;
            --color-brand-light: #ccf;
            --color-brand-900: #003;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('every spelling merges within its utility', () => {
        expectMerges(twMerge, {
            'bg-brand-500 bg-brand-500-hover': 'bg-brand-500-hover',
            'bg-brand-500-hover bg-brand-900': 'bg-brand-900',
            'bg-brand-500-hover bg-red-500': 'bg-red-500',
            'text-brand-500-hover text-brand-light': 'text-brand-light',
            'border-brand-light border-2': 'border-brand-light border-2',
        })
        expect(plan.report.scaleStrategies['color']).toBe('families')
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Color names that coincide with static utility values: `--color-none` gives every color utility a `-none` value while `bg-none`, `border-none`, `shadow-none`, … already exist as static utilities. Tailwind then compiles some of them as both utilities in one rule (`bg-none` sets background-image AND background-color), others as the static utility only (`shadow-none`), others as the color only (`text-none`). Classes that became two utilities at once must not merge with anything — removing them in either direction would lose half their effect.
describe('color names shadowing static utility values', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --color-none: #000;
            --color-center: #111;
            --color-full: #222;
            --color-px: #444;
            --color-auto: #333;
            --color-current: red;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('classes that became two utilities at once pass through unmerged, the others merge within the group Tailwind picked', () => {
        expectMerges(twMerge, {
            // Both a background image reset and a background color.
            'bg-none bg-red-500': 'bg-none bg-red-500',
            'bg-red-500 bg-none': 'bg-red-500 bg-none',
            // Both a border style and a border color; `border-dashed` only overrides the style part.
            'border-none border-red-500': 'border-none border-red-500',
            'border-none border-dashed': 'border-none border-dashed',
            'bg-center bg-top': 'bg-center bg-top',
            'text-center text-left': 'text-center text-left',
            'outline-none outline-dashed': 'outline-none outline-dashed',
            // Pure colors.
            'text-none text-red-500': 'text-red-500',
            'text-px text-red-500': 'text-red-500',
            'text-px text-lg': 'text-px text-lg',
            'bg-full bg-red-500': 'bg-red-500',
            'bg-current bg-red-500': 'bg-red-500',
            'ring-none ring-red-500': 'ring-red-500',
            // Still the static utilities.
            'shadow-none shadow-lg': 'shadow-lg',
            'shadow-none shadow-red-500': 'shadow-none shadow-red-500',
            'rounded-full rounded-lg': 'rounded-lg',
            'w-full w-4': 'w-4',
            'z-auto z-10': 'z-10',
        })
    })

    test('what each shadowed static utility became', () => {
        expect(
            mergeTable(twMerge, [
                'bg-none bg-linear-to-r',
                'via-none via-red-500',
                'from-none from-red-500',
                'fill-none fill-red-500',
                'stroke-none stroke-red-500',
                'divide-none divide-red-500',
                'decoration-none decoration-red-500',
                'inset-ring-none inset-ring-red-500',
                'text-auto text-red-500',
                'bg-auto bg-cover',
                'decoration-auto decoration-2',
            ]),
        ).toMatchInlineSnapshot(`
          "bg-none bg-linear-to-r  →  bg-none bg-linear-to-r
          via-none via-red-500  →  via-red-500
          from-none from-red-500  →  from-red-500
          fill-none fill-red-500  →  fill-red-500
          stroke-none stroke-red-500  →  stroke-red-500
          divide-none divide-red-500  →  divide-none divide-red-500
          decoration-none decoration-red-500  →  decoration-red-500
          inset-ring-none inset-ring-red-500  →  inset-ring-red-500
          text-auto text-red-500  →  text-red-500
          bg-auto bg-cover  →  bg-auto bg-cover
          decoration-auto decoration-2  →  decoration-auto decoration-2"
        `)
    })

    test('reports the neutralized and restored classes and leaves nothing unassigned', () => {
        expect(plan.report.resolvedCollisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ className: 'bg-none', keptGroupId: null }),
                expect.objectContaining({ className: 'border-none', keptGroupId: null }),
                expect.objectContaining({ className: 'drop-shadow-none', keptGroupId: null }),
                expect.objectContaining({ className: 'shadow-none', keptGroupId: 'shadow' }),
            ]),
        )
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// A color family named like an axis: `--color-x-2`/`--color-x-4` make `border-x-2` compile as an inline border width AND an `x-2` border color in one rule. The color scale's claim is a removable literal, but the width group claims the same class through its number validator, which cannot be removed — so the class needs a group of its own to stay out of every merge.
describe('a color family named like an axis', async () => {
    const { twMerge, plan, config, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --color-x-2: #222;
            --color-x-4: #444;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('the two-utilities-at-once classes never merge away, plain color uses merge normally', () => {
        expect(declaredDeclarations(designSystem, 'border-x-2')?.map((entry) => entry.property)).toEqual([
            'border-inline-style',
            'border-inline-width',
            'border-color',
        ])
        expectMerges(twMerge, {
            'border-x-2 border-2': 'border-x-2 border-2',
            'border-x-2 border-x-red-500': 'border-x-2 border-x-red-500',
            'border-x-2 border-x-4': 'border-x-2 border-x-4',
            'divide-x-2 divide-x-4': 'divide-x-2 divide-x-4',
            'bg-x-2 bg-red-500': 'bg-red-500',
            'bg-x-2 bg-x-4': 'bg-x-4',
            'text-x-2 text-x-4': 'text-x-4',
        })
    })

    test('neutralization through a dedicated group shows up in the config and the report', () => {
        expect(config.classGroups).toHaveProperty('collision.border-x-2', ['border-x-2'])
        expect(config.classGroups).toHaveProperty('collision.divide-x-4', ['divide-x-4'])
        expect(plan.report.resolvedCollisions).toEqual(
            expect.arrayContaining([
                { className: 'border-x-2', keptGroupId: null, removedFromGroupIds: ['border-color'] },
                { className: 'divide-x-4', keptGroupId: null, removedFromGroupIds: ['divide-color'] },
            ]),
        )
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// Custom utilities whose names sit under a built-in prefix: a functional `bg-pattern-*` next to `bg-*`, a static `text-glow` next to `text-*` — and custom roots that shadow built-in functional roots outright, which Tailwind compiles alongside the built-in.
describe('custom utilities under built-in prefixes', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --pattern-dots: url(dots.svg);
            --pattern-grid: url(grid.svg);
        }
        @utility bg-pattern-* {
            background-image: --value(--pattern-*);
        }
        @utility text-stroke-* {
            -webkit-text-stroke-width: --value(integer);
        }
        @utility text-glow {
            text-shadow: 0 0 4px currentColor;
        }
        @utility p-safe {
            padding: env(safe-area-inset-top);
        }
        @utility z-* {
            z-index: calc(--value(integer) * 10);
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('custom roots get their own groups under the shared prefix, aliases join the built-in group they match', () => {
        expect(plan.report.customUtilityGroups.sort()).toEqual([
            'utility.bg-pattern',
            'utility.text-stroke',
        ])
        expect(plan.report.aliasedUtilityClasses).toEqual({
            'text-glow': 'text-shadow',
            'p-safe': 'p',
        })
        expectMerges(twMerge, {
            'bg-pattern-dots bg-pattern-grid': 'bg-pattern-grid',
            'bg-pattern-dots bg-red-500': 'bg-pattern-dots bg-red-500',
            'bg-red-500 bg-pattern-dots': 'bg-red-500 bg-pattern-dots',
            'bg-pattern-dots bg-none': 'bg-pattern-dots bg-none',
            'text-stroke-2 text-stroke-4': 'text-stroke-4',
            'text-stroke-2 text-lg': 'text-stroke-2 text-lg',
            'text-stroke-2 text-red-500': 'text-stroke-2 text-red-500',
            'text-glow text-shadow-lg': 'text-shadow-lg',
            'text-shadow-lg text-glow': 'text-glow',
            'text-glow text-red-500': 'text-glow text-red-500',
            'p-safe p-4': 'p-4',
            'p-4 p-safe': 'p-safe',
        })
    })

    test('a custom root shadowing a built-in one compiles next to it and merges like it', () => {
        // Tailwind emits both the built-in and the custom declaration for `z-2`; since both set z-index, the built-in group's conflict semantics still hold.
        expect(declaredDeclarations(designSystem, 'z-2')?.map((entry) => entry.value)).toEqual([
            '2',
            'calc(2 * 10)',
        ])
        expectMerges(twMerge, { 'z-2 z-3': 'z-3', 'z-2 z-auto': 'z-auto' })
        // The extension itself is not planned; the report says so even where, as here, the built-in matcher accepts its values.
        expect(plan.report.unassignedClasses).toEqual([
            { className: 'z-*', reason: expect.stringContaining('extends a built-in root') },
        ])
    })
})

// These names sort with demo-child before demo-z. A plain startsWith lookup must not use the child utility as the exemplar for the parent's padding behavior.
describe.each(['', 'tw'] as const)('overlapping custom utility roots (prefix: %s)', (prefix) => {
    test.each(['compact', 'exact'] as const)(
        "keeps each root's own conflict semantics with %s encoding",
        async (encoding) => {
            const { twMerge, config, plan, designSystem } = await generateFixture(
                css`
                    @import 'tailwindcss' ${prefix ? `prefix(${prefix})` : ''};
                    @theme {
                        --demo-z: 1rem;
                        --demo-leaf-z: 2rem;
                    }
                    @utility demo-* {
                        padding: --value(--demo-*);
                    }
                    @utility demo-child-* {
                        margin: --value(--demo-*);
                    }
                    @utility demo-child {
                        border-radius: 1rem;
                    }
                    @utility demo-leaf {
                        opacity: 0.5;
                    }
                    @utility demo {
                        padding: 1rem;
                    }
                `,
                undefined,
                { encoding },
            )

            const qualify = (classes: string) =>
                classes.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')
            const cases = {
                'p-4 demo-z': 'demo-z',
                'm-4 demo-z': 'm-4 demo-z',
                'rounded-lg demo-z': 'rounded-lg demo-z',
                'demo demo-z': 'demo-z',
                'demo-z demo': 'demo',
                'm-4 demo-child-z': 'demo-child-z',
                'p-4 demo-child-z': 'p-4 demo-child-z',
                'demo-child demo-child-z': 'demo-child demo-child-z',
                'demo-z demo-child': 'demo-z demo-child',
                // A longer static name owns only itself; demo-leaf-z remains a functional value of demo-*.
                'demo-z demo-leaf-z': 'demo-leaf-z',
                'demo-leaf-z demo-z': 'demo-z',
                'demo-z demo-leaf': 'demo-z demo-leaf',
            }
            expectMerges(
                twMerge,
                Object.entries(cases).map(([input, output]): [string, string] => [
                    qualify(input),
                    qualify(output),
                ]),
            )
            expect(plan.report.customUtilityGroups).not.toContain('utility.demo.static')
            expect(
                declaredDeclarations(designSystem, 'demo-z')?.map((entry) => entry.property),
            ).toEqual(['padding'])

            const usedClasses = [
                ...new Set(Object.keys(cases).flatMap((input) => qualify(input).split(' '))),
            ]
            assertPruningEquivalence(config, materializeConfig(prunePlan(plan, usedClasses)), usedClasses)
        },
    )
})

// The same collisions under an import prefix: every declaration probe behind the collision corrections compiles prefixed candidates (`tw:border-4`), a path that once silently no-oped for prefixed themes.
describe('numeric color tokens and two-namespace names under an import prefix', async () => {
    const { twMerge, plan } = await generateFixture(css`
        @import 'tailwindcss' prefix(tw);
        @theme {
            --color-4: #abc;
            --shadow-brand: 0 0 1px blue;
            --color-brand: #f00;
        }
    `)

    test('the corrections apply to prefixed classes', () => {
        expectMerges(twMerge, {
            'tw:border-4 tw:border-2': 'tw:border-4 tw:border-2',
            'tw:border-4 tw:border-red-500': 'tw:border-red-500',
            'tw:decoration-4 tw:decoration-2': 'tw:decoration-2',
            'tw:shadow-brand tw:shadow-lg': 'tw:shadow-lg',
            'tw:shadow-brand tw:shadow-red-500': 'tw:shadow-brand tw:shadow-red-500',
            'tw:text-4 tw:text-lg': 'tw:text-4 tw:text-lg',
        })
        expect(plan.report.resolvedCollisions.map(({ className }) => className).sort()).toEqual([
            'decoration-4',
            'ring-offset-4',
            'shadow-brand',
        ])
        expect(plan.report.unassignedClasses).toEqual([])
    })
})

// The collision corrections under exact encoding and under pruning: exact mode enumerates where compact uses validators, so the claims it removes differ, and the dedicated collision groups must survive pruning like any other group.
describe('collision corrections under exact encoding and pruning', async () => {
    const themeCss = css`
        @import 'tailwindcss';
        @theme {
            --color-4: #abc;
            --color-0: #555;
            --color-x-2: #222;
            --color-x-4: #444;
        }
    `
    const exact = await generateFixture(themeCss, undefined, { encoding: 'exact' })
    const compact = await generateFixture(themeCss)

    test('exact mode conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(exact.designSystem, exact.twMerge, exact.plan)
    })

    test('exact mode classifies every compiling class exactly like compact mode', () => {
        assertExactClassificationParity(exact.designSystem, exact.config, compact.config)
    })

    test('exact mode resolves the same collisions', () => {
        expectMerges(exact.twMerge, {
            'border-x-2 border-2': 'border-x-2 border-2',
            'border-4 border-2': 'border-4 border-2',
            'decoration-4 decoration-2': 'decoration-2',
        })
        expect(exact.plan.report.resolvedCollisions.map(({ className }) => className).sort()).toEqual(
            compact.plan.report.resolvedCollisions.map(({ className }) => className).sort(),
        )
    })

    test('pruning keeps the dedicated collision groups for used classes and merges like the full config', () => {
        const usedClasses = [
            ...sampleUsedClasses(compact.designSystem, 13),
            'border-x-2',
            'border-x-4',
            'divide-x-2',
            'border-4',
            'decoration-4',
            'bg-x-2',
        ]
        const pruned = prunePlan(compact.plan, usedClasses)

        assertPruningEquivalence(compact.config, materializeConfig(pruned), usedClasses)
        expect(pruned.classGroups.has('collision.border-x-2')).toBe(true)
        expect(pruned.report.pruning!.unprunedClassGroups).toEqual([])
    })
})

// A custom utility named like a class the theme already creates: Tailwind compiles `bg-brand` as the color utility AND the custom utility in one rule, so the class sets more than the color. It becomes its own group — overriding the groups it fully covers when it comes later, never evicted by a class that only sets part of what it sets.
describe('custom utilities shadowing theme-derived classes', async () => {
    const { twMerge, plan, designSystem } = await generateFixture(css`
        @import 'tailwindcss';
        @theme {
            --color-brand: #f00;
        }
        @utility bg-brand {
            background: url(brand.svg) center / cover;
        }
        @utility text-brand {
            color: #f00;
            text-transform: uppercase;
        }
    `)

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('both utilities compile into one rule, which gets its own group with override edges', () => {
        expect(declaredDeclarations(designSystem, 'bg-brand')?.map((entry) => entry.property)).toEqual([
            'background-color',
            'background',
        ])
        expect(plan.report.customUtilityGroups.sort()).toEqual(['utility.bg-brand', 'utility.text-brand'])
        expect(plan.report.customUtilityConflicts['utility.bg-brand']).toEqual(
            expect.arrayContaining(['bg-color', 'bg-size', 'bg-position']),
        )
        expect(plan.report.customUtilityConflicts['utility.text-brand']).toEqual(
            expect.arrayContaining(['text-transform', 'text-color']),
        )
        expectMerges(twMerge, {
            'bg-brand bg-red-500': 'bg-brand bg-red-500',
            'bg-red-500 bg-brand': 'bg-brand',
            'bg-brand bg-brand': 'bg-brand',
            'text-brand text-red-500': 'text-brand text-red-500',
            'text-red-500 text-brand': 'text-brand',
            'uppercase text-brand': 'text-brand',
            'text-brand uppercase': 'text-brand uppercase',
        })
        expect(plan.report.unassignedClasses).toEqual([])
    })
})
