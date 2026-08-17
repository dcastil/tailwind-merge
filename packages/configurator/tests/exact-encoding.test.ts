import { describe, expect, test } from 'vitest'

import {
    assertExactClassificationParity,
    assertTailwindConformance,
    css,
    generateFixture,
} from './fixture-utils'

// Exact encoding exists because the compact overmatch premise fails for merge semantics: a class that produces no CSS still gains eviction power once it classifies into a group, so `twMerge('rounded-md', 'rounded-xs')` drops the real `rounded-md` when `xs` isn't in the theme but matches the scale's t-shirt validator (first field feedback, 2026-08-13). In exact mode a matcher only accepts what exists — theme scales enumerate, and custom functional utilities enumerate their compile-verified named values plus validators for the value kinds sentinel probes prove open-ended (see custom-utilities.ts).
describe('exact encoding', async () => {
    const fixtureCss = css`
        @import 'tailwindcss';
        @theme {
            --radius-*: initial;
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 16px;
            --radius-xl: 24px;
            --radius-2xl: 32px;
            --hit-area-sm: 4px;
            --hit-area-lg: 12px;
        }
        @utility hit-* {
            inset: --value(--hit-area-*);
        }
        @utility zz-* {
            tab-size: --value(integer);
        }
        @utility pad-* {
            padding: --value([length], --hit-area-*);
        }
        @utility vv-* {
            width: --value([*]);
        }
    `
    const exact = await generateFixture(fixtureCss, undefined, { encoding: 'exact' })
    const compact = await generateFixture(fixtureCss)
    const { twMerge, plan, designSystem } = exact

    test('conforms to Tailwind conflict semantics across the class list', () => {
        assertTailwindConformance(designSystem, twMerge, plan)
    })

    test('a name outside a theme scale never evicts a real class', () => {
        // The field repro: `xs` is not in the radius theme, compiles to nothing, and must not remove a class that renders. `w-8xl` is the same case against the (vanilla) container scale, which tops out at 7xl.
        expect(twMerge('rounded-md rounded-xs')).toBe('rounded-md rounded-xs')
        expect(twMerge('w-md w-8xl')).toBe('w-md w-8xl')
        // Real theme values and arbitrary values keep merging exactly as before.
        expect(twMerge('rounded-md rounded-lg')).toBe('rounded-lg')
        expect(twMerge('w-md w-[7rem]')).toBe('w-[7rem]')
    })

    test('compact mode trades this correctness for size, which is why both exist', () => {
        expect(compact.twMerge('rounded-md rounded-xs')).toBe('rounded-xs')
        expect(compact.twMerge('w-md w-8xl')).toBe('w-8xl')
    })

    test('functional utilities with only named values enumerate them', () => {
        expect(twMerge('hit-sm hit-lg')).toBe('hit-lg')
        expect(twMerge('hit-sm hit-bogus')).toBe('hit-sm hit-bogus')
    })

    test('functional utilities keep validators for value kinds that probe as open-ended', () => {
        // --value(integer) accepts every integer, so isInteger is exact — while a non-integer or an arbitrary value compiles to nothing and passes through.
        expect(twMerge('zz-4 zz-7')).toBe('zz-7')
        expect(twMerge('zz-4 zz-1.5')).toBe('zz-4 zz-1.5')
        expect(twMerge('zz-[13] zz-4')).toBe('zz-[13] zz-4')
        // --value([length], --hit-area-*) probes as arbitrary-accepting with named values on top.
        expect(twMerge('pad-[3px] pad-[5px]')).toBe('pad-[5px]')
        expect(twMerge('pad-sm pad-[3px]')).toBe('pad-[3px]')
        expect(twMerge('pad-bogus pad-sm')).toBe('pad-bogus pad-sm')
        // --value([*]) also accepts the arbitrary-variable shorthand.
        expect(twMerge('vv-(--a) vv-(--b)')).toBe('vv-(--b)')
    })

    // eslint-disable-next-line vitest/expect-expect -- the assertions live in assertExactClassificationParity
    test('classifies every compiling class exactly like compact mode', () => {
        // The invariant behind "exact only removes matches that don't compile": for real classes the two encodings must be indistinguishable. A probe missing an open-ended value kind would surface here as an exact-side classification gap.
        assertExactClassificationParity(designSystem, exact.config, compact.config)
    })

    test('reports the encoding mode and the exact scale strategies', () => {
        expect(plan.report.encoding).toBe('exact')
        expect(plan.report.scaleStrategies.radius).toBe('enumerated')
        // The bare --spacing multiplier genuinely makes every number compile, so its validator survives exact mode.
        expect(plan.report.scaleStrategies.spacing).toBe('multiplier')
        expect(compact.plan.report.encoding).toBe('compact')
        expect(compact.plan.report.scaleStrategies.radius).toBe('validator:isTshirtSize')
        // No scale may fall back to a validator strategy in exact mode — only enumeration, family factoring, and the spacing multiplier exist.
        for (const strategy of Object.values(plan.report.scaleStrategies)) {
            expect(strategy).not.toMatch(/validator:|mixed:/)
        }
        // The t-shirt validator only ever stands in for finite scales, so the exact module must not even import it. The emitter destructures exactly the used validators, hence the trailing comma — the name alone also appears in boilerplate comments.
        expect(exact.code).not.toContain('isTshirtSize,')
        expect(compact.code).toContain('isTshirtSize,')
    })
})

describe('exact encoding under an import prefix', async () => {
    // Compile probes must prefix their candidates (`tw:hit-sm`) while class-list names stay unprefixed; without that, every named value would look non-compiling and enumeration would come up empty.
    const { twMerge, plan } = await generateFixture(
        css`
            @import 'tailwindcss' prefix(tw);
            @theme {
                --hit-area-sm: 4px;
                --hit-area-lg: 12px;
            }
            @utility hit-* {
                inset: --value(--hit-area-*);
            }
        `,
        undefined,
        { encoding: 'exact' },
    )

    test('named values enumerate through prefixed compile probes', () => {
        expect(twMerge('tw:hit-sm tw:hit-lg')).toBe('tw:hit-lg')
        expect(twMerge('tw:hit-sm tw:hit-bogus')).toBe('tw:hit-sm tw:hit-bogus')
        expect(plan.report.customUtilityGroups).toContain('utility.hit')
    })
})
