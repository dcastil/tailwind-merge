import { expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'

import { css, expectMerges, generateFixture } from './fixture-utils'
import { mergeVerdict } from './oracle'

test.each(['compact', 'exact'] as const)(
    '%s coverage respects inline declaration importance',
    async (encoding) => {
        const stylesheet = css`
            @import 'tailwindcss';
            @utility important-red {
                color: red !important;
            }
            @utility important-blue {
                color: blue !important;
            }
            @utility important-pad {
                padding: 1rem !important;
            }
            @utility normal-card {
                padding: 2rem;
                border-radius: 1rem;
            }
            @utility important-state {
                --ink: red !important;
                color: var(--ink);
            }
            @utility normal-state {
                --ink: blue;
                color: var(--ink);
            }
            @utility important-hover {
                &:hover {
                    color: red !important;
                }
            }
            @utility normal-hover {
                &:hover {
                    color: red;
                }
            }
        `
        const cases = [
            ['important-red text-blue-500', 'important-red text-blue-500'],
            ['text-blue-500 important-red', 'important-red'],
            ['important-red important-blue', 'important-blue'],
            ['important-pad normal-card', 'important-pad normal-card'],
            ['important-state normal-state', 'important-state normal-state'],
            ['normal-state important-state', 'important-state'],
            ['important-hover normal-hover', 'important-hover normal-hover'],
        ] as const
        const usedClasses = [...new Set(cases.flatMap(([input]) => input.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const { twMerge, plan, designSystem } = await generateFixture(stylesheet, undefined, {
                encoding,
                prune,
            })
            expect(plan.report.aliasedUtilityClasses).not.toHaveProperty('important-red')
            expectMerges(twMerge, Object.fromEntries(cases))
            expect(
                mergeVerdict(
                    declaredDeclarations(designSystem, 'important-red')!,
                    declaredDeclarations(designSystem, 'text-blue-500')!,
                ),
            ).toBe('keep')
        }
    },
)

test.each(['compact', 'exact'] as const)(
    "%s aliasing survives the entrypoint's `important` import option",
    async (encoding) => {
        // With `@import 'tailwindcss' important` every declaration is important, the project's and the built-in exemplars' alike; the baseline must carry the option too, or the importance comparison rejects every alias.
        const stylesheet = css`
            @import 'tailwindcss' important;
            @utility text-special {
                color: red;
            }
        `
        const { twMerge, plan, designSystem } = await generateFixture(stylesheet, undefined, { encoding })
        expect(designSystem.important).toBe(true)
        expect(plan.report.aliasedUtilityClasses).toMatchObject({ 'text-special': 'text-color' })
        expectMerges(twMerge, {
            'text-special text-red-500': 'text-red-500',
            'text-red-500 text-special': 'text-special',
        })
    },
)
