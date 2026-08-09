import { describe, expect, test } from 'vitest'

import { assertTailwindConformance, generateFixture } from './fixture-utils'

// Stress fixture: an intentionally extreme theme to see how the generated config scales — 50 custom utilities spanning every support tier with property counts from 1 to 20, and theme scales with 50–100 values mixing compressible numeric families with enumerated one-off names. The CSS is built programmatically so the variance is systematic; the emitted-module snapshot is the point, showing what an extreme real-world config would look like.

/** 50 distinct non-numeric names, so scale values enumerate instead of compressing into a validator. */
const WORDS =
    `alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu basalt cedar coral dune ember fjord garnet harbor iris jasper krypton lotus maple nectar onyx pearl quartz raven summit topaz umber wharf zenith glacier`.split(
        ' ',
    )

/** Escalating property pool: `panel-<n>` gets the first n properties, so utility sizes vary from one declaration to twenty and later panels fully cover earlier ones. */
const PANEL_PROPERTIES = [
    'padding: 1rem',
    'border-radius: 0.5rem',
    'background-color: #fff',
    'color: #111',
    'font-size: 1rem',
    'line-height: 1.5',
    'letter-spacing: 0.01em',
    'margin: 0.5rem',
    'border-width: 1px',
    'border-color: #ddd',
    'opacity: 0.98',
    'z-index: 10',
    'width: 100%',
    'height: auto',
    'gap: 0.75rem',
    'text-align: center',
    'overflow: hidden',
    'cursor: pointer',
    'box-shadow: 0 1px 2px #0002',
    'transition-duration: 150ms',
]

function buildStressCss(): string {
    const lines: string[] = ["@import 'tailwindcss';", '@theme {']

    // ~100 color values: two numeric families (compressible to a validator) plus 50 enumerated names.
    for (const [index, step] of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].entries()) {
        lines.push(`    --color-brand-${step}: oklch(${95 - index * 8}% 0.12 260);`)
        lines.push(`    --color-accent-${step}: oklch(${95 - index * 8}% 0.15 20);`)
    }
    for (const [index, word] of WORDS.entries()) {
        lines.push(`    --color-tone-${word}: oklch(${30 + index}% 0.08 ${(index * 7) % 360});`)
    }

    // 25 named spacing values alongside the kept numeric multiplier.
    for (const [index, word] of WORDS.slice(0, 25).entries()) {
        lines.push(`    --spacing-gap-${word}: ${4 + index * 2}px;`)
    }

    // 20 z-index values — a namespace without a tailwind-merge theme key, classified by the augmentation pass.
    for (const [index, word] of WORDS.slice(0, 20).entries()) {
        lines.push(`    --z-index-layer-${word}: ${(index + 1) * 10};`)
    }

    // Compound font sizes and a numeric shadow family.
    for (const [index, name] of ['display', 'headline', 'title', 'body', 'caption'].entries()) {
        lines.push(`    --text-${name}: ${3.5 - index * 0.6}rem;`)
        lines.push(`    --text-${name}--line-height: ${1.1 + index * 0.1};`)
    }
    for (let depth = 1; depth <= 10; depth += 1) {
        lines.push(`    --shadow-depth-${depth}: 0 ${depth}px ${depth * 2}px rgb(0 0 0 / 0.2);`)
    }
    lines.push('}')

    // Tier 1 candidates — single-property utilities aliasing distinct built-in groups.
    lines.push(
        '@utility ink { color: #123; }',
        '@utility paper { background-color: #fefefe; }',
        '@utility edge-line { border-color: #345; }',
        '@utility pad-hug { padding: 2rem; }',
        '@utility push-out { margin: 1.5rem; }',
        '@utility round-soft { border-radius: 1rem; }',
        '@utility lift { z-index: 30; }',
        '@utility pin-top { position: sticky; }',
    )

    // Tier 2 at scale: panel-1 … panel-20 with 1 … 20 properties. panel-1 is another alias; every later panel fully covers all earlier ones plus a growing set of built-in groups.
    for (let size = 1; size <= PANEL_PROPERTIES.length; size += 1) {
        lines.push(`@utility panel-${size} {`)
        for (const property of PANEL_PROPERTIES.slice(0, size)) {
            lines.push(`    ${property};`)
        }
        lines.push('}')
    }

    // Irregular multi-property utilities that don't nest into each other.
    lines.push(
        '@utility chip { display: inline-flex; align-items: center; gap: 0.25rem; padding-inline: 0.5rem; border-radius: 999px; }',
        '@utility sheet { position: fixed; inset-inline: 0; bottom: 0; border-start-start-radius: 1rem; border-start-end-radius: 1rem; }',
        '@utility hero { min-height: 60vh; display: grid; place-items: center; text-wrap: balance; }',
    )

    // Functional roots — every value of a root sets the same declarations.
    lines.push(
        '@utility elev-* { z-index: --value(integer); }',
        '@utility squish-* { padding: --spacing(--value(number)); }',
        '@utility flow-* { gap: --spacing(--value(number)); }',
        '@utility fade-* { opacity: calc(--value(integer) * 1%); }',
    )

    // A state-carrying family sharing ::before scaffolding (the supabase hit-area shape): the full value subsumes the scaffold and the per-axis values, never the reverse.
    const reachScaffold = [
        '    position: relative;',
        '    &::before {',
        "        content: '';",
        '        position: absolute;',
        '        inset: var(--reach-y, 0px) var(--reach-x, 0px);',
        '    }',
    ]
    lines.push('@utility reach {', ...reachScaffold, '}')
    lines.push(
        '@utility reach-* {',
        '    --reach-x: --spacing(--value(number));',
        '    --reach-y: --spacing(--value(number));',
        ...reachScaffold,
        '}',
    )
    for (const axis of ['x', 'y']) {
        lines.push(
            `@utility reach-${axis}-* {`,
            `    --reach-${axis}: --spacing(--value(number));`,
            ...reachScaffold,
            '}',
        )
    }

    // A bare static + functional pair with identical effect shape — mutual cover joins them into one group. Requires the functional root to surface value suggestions (here via --spacing), because mutual cover is proven against a suggested exemplar.
    lines.push(
        '@utility nudge { translate: 0px; }',
        '@utility nudge-* { translate: --spacing(--value(number)); }',
    )
    // The same pair shape without suggestions: --value(number) alone surfaces no class-list values, so no exemplar exists to prove mutual cover and the bare form conservatively stays its own group.
    lines.push(
        '@utility pulse { animation-delay: 0s; }',
        '@utility pulse-* { animation-delay: calc(--value(number) * 1s); }',
    )

    // Pseudo-element and other-element utilities — never merge with element-level groups.
    lines.push(
        "@utility veil { position: relative; &::after { content: ''; position: absolute; inset: 0; background-color: #0006; } }",
        "@utility glint { &::before { content: ''; display: inline-block; width: 0.5em; } }",
        '@utility scroll-ghost { &::-webkit-scrollbar { display: none; } }',
        '@utility split-flow { & > * + * { margin-top: 1rem; } }',
    )

    // Conditional utilities — declarations behind media queries justify no overrides at all.
    lines.push(
        '@utility touch-grow { @media (pointer: coarse) { padding: 1.25rem; } }',
        '@utility wide-pad { @media (width >= 64rem) { padding-inline: 4rem; } }',
        '@utility calm-motion { @media (prefers-reduced-motion: reduce) { transition-duration: 0s; } }',
        '@utility print-hide { @media print { display: none; } }',
    )

    // Custom-property-only utilities — pure state, conflicting with nothing.
    lines.push(
        '@utility knob { --knob-size: 2rem; }',
        '@utility dial { --dial-angle: 45deg; }',
    )

    return `${lines.join('\n')}\n`
}

describe('stress: 50 custom utilities and 100-value scales', async () => {
    const { code, twMerge, plan, designSystem } = await generateFixture(buildStressCss())

    test('emitted module matches its file snapshot', async () => {
        await expect(code).toMatchFileSnapshot('./__snapshots__/stress.snap.ts')
    })

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('leaves nothing unassigned', () => {
        expect(plan.report.unassignedClasses).toEqual([])
    })

    test('single-property utilities alias into their built-in groups', () => {
        expect(plan.report.aliasedUtilityClasses).toMatchObject({
            ink: 'text-color',
            paper: 'bg-color',
            'edge-line': 'border-color',
            'pad-hug': 'p',
            'push-out': 'm',
            'round-soft': 'rounded',
            lift: 'z',
            'pin-top': 'position',
            'panel-1': 'p',
        })
        expect(twMerge('ink text-tone-ember')).toBe('text-tone-ember')
        expect(twMerge('text-tone-ember ink')).toBe('ink')
    })

    test('escalating panels cover all smaller panels and a growing set of built-in groups', () => {
        const panelConflicts = plan.report.customUtilityConflicts['utility.panel-20']!
        for (let size = 2; size < 20; size += 1) {
            expect(panelConflicts).toContain(`utility.panel-${size}`)
        }
        expect(panelConflicts).toEqual(expect.arrayContaining(['p', 'rounded', 'bg-color', 'z']))
        expect(twMerge('panel-5 panel-20')).toBe('panel-20')
        expect(twMerge('panel-20 panel-5')).toBe('panel-20 panel-5')
        expect(twMerge('p-4 bg-brand-500 panel-3')).toBe('panel-3')
    })

    test('large enumerated and numeric scales merge', () => {
        expect(twMerge('bg-tone-alpha bg-tone-zenith')).toBe('bg-tone-zenith')
        expect(twMerge('bg-brand-500 bg-tone-coral')).toBe('bg-tone-coral')
        expect(twMerge('p-gap-alpha p-gap-yankee')).toBe('p-gap-yankee')
        expect(twMerge('z-layer-alpha z-layer-tango')).toBe('z-layer-tango')
        expect(twMerge('shadow-depth-3 shadow-depth-9')).toBe('shadow-depth-9')
        expect(twMerge('text-display text-caption')).toBe('text-caption')
    })

    test('the state-carrying family keeps its directional subsumption at scale', () => {
        expect(twMerge('reach reach-4')).toBe('reach-4')
        expect(twMerge('reach-x-2 reach-4')).toBe('reach-4')
        expect(twMerge('reach-4 reach-x-2')).toBe('reach-4 reach-x-2')
        expect(twMerge('reach-x-2 reach-y-2')).toBe('reach-x-2 reach-y-2')
    })

    test('mutual-cover static and functional forms share one group', () => {
        expect(twMerge('nudge nudge-4')).toBe('nudge-4')
        expect(twMerge('nudge-4 nudge')).toBe('nudge')
    })

    test('without value suggestions, mutual cover cannot be proven and the pair conservatively stays apart', () => {
        expect(plan.report.customUtilityGroups).toContain('utility.pulse.static')
        expect(twMerge('pulse pulse-3')).toBe('pulse pulse-3')
    })

    test('dash-prefix naming exceptions produce no false overrides', () => {
        // panel-20 sets `color` and `overflow`, which look like shorthand prefixes of `color-scheme` and `overflow-wrap` but control neither — the stress fixture originally exposed exactly these two false edges.
        const panelConflicts = plan.report.customUtilityConflicts['utility.panel-20']!
        expect(panelConflicts).not.toContain('color-scheme')
        expect(panelConflicts).not.toContain('wrap')
        expect(twMerge('scheme-light panel-20')).toBe('scheme-light panel-20')
        expect(twMerge('wrap-anywhere panel-20')).toBe('wrap-anywhere panel-20')
    })

    test('pseudo-element, conditional, and custom-property utilities override nothing', () => {
        expect(twMerge('bg-tone-iris veil')).toBe('bg-tone-iris veil')
        expect(twMerge('p-4 touch-grow')).toBe('p-4 touch-grow')
        expect(twMerge('hidden print-hide')).toBe('hidden print-hide')
        expect(twMerge('knob dial')).toBe('knob dial')
    })
})
