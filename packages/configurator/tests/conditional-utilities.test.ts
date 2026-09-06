import { describe, expect, test } from 'vitest'

import { css, generateFixture } from './fixture-utils'

const stylesheet = css`
    @import 'tailwindcss';
    @utility special {
        color: red;
        &:hover {
            color: blue;
        }
    }
    @utility text-special {
        color: red;
        &:hover {
            color: blue;
        }
    }
    @utility text-with-overlay {
        &,
        &::before {
            color: red;
        }
    }
    @utility wide-red {
        @media (min-width: 800px) {
            color: red;
        }
    }
    @utility dark-red {
        @media (prefers-color-scheme: dark) {
            color: red;
        }
    }
    @utility wide-red-copy {
        @media (min-width: 800px) {
            color: red;
        }
    }
    @utility hover-red {
        &:hover {
            color: red;
        }
    }
    @utility focus-red {
        &:focus {
            color: red;
        }
    }
    @utility wide-hover-red {
        @media (min-width: 800px) {
            &:hover {
                color: red;
            }
        }
    }
    @utility dark-hover-red {
        @media (prefers-color-scheme: dark) {
            &:hover {
                color: red;
            }
        }
    }
    @utility hover-or-focus-red {
        &:hover,
        &:focus {
            color: red;
        }
    }
    @utility supports-grid-red {
        @supports (display: grid) {
            color: red;
        }
    }
    @utility supports-flex-red {
        @supports (display: flex) {
            color: red;
        }
    }
    @utility wide-card-red {
        @container card (min-width: 800px) {
            color: red;
        }
    }
    @utility wide-panel-red {
        @container panel (min-width: 800px) {
            color: red;
        }
    }
    @utility ancestor-dark-red {
        .dark & {
            color: red;
        }
    }
    @utility ancestor-light-red {
        .light & {
            color: red;
        }
    }
`

const usedClasses = [
    'special',
    'text-special',
    'text-with-overlay',
    'text-green-500',
    'wide-red',
    'dark-red',
    'wide-red-copy',
    'hover-red',
    'focus-red',
    'wide-hover-red',
    'dark-hover-red',
    'hover-or-focus-red',
    'supports-grid-red',
    'supports-flex-red',
    'wide-card-red',
    'wide-panel-red',
    'ancestor-dark-red',
    'ancestor-light-red',
]

describe.each(['compact', 'exact'] as const)('%s conditional utility coverage', (encoding) => {
    test.each([false, true])('preserves independent conditions (pruned: %s)', async (prune) => {
        const { twMerge, plan } = await generateFixture(stylesheet, undefined, {
            encoding,
            prune: prune ? { usedClasses } : undefined,
        })

        // A later base color cannot replace the custom utility's independent hover color.
        expect(plan.report.aliasedUtilityClasses).not.toHaveProperty('special')
        expect(twMerge('special text-green-500')).toBe('special text-green-500')
        expect(twMerge('text-green-500 special')).toBe('special')
        expect(twMerge('text-special text-green-500')).toBe('text-special text-green-500')
        expect(twMerge('text-green-500 text-special')).toBe('text-special')

        for (const [first, second] of [
            ['wide-red', 'dark-red'],
            ['hover-red', 'focus-red'],
            ['wide-hover-red', 'dark-hover-red'],
            ['wide-hover-red', 'hover-red'],
            ['hover-or-focus-red', 'hover-red'],
            ['supports-grid-red', 'supports-flex-red'],
            ['wide-card-red', 'wide-panel-red'],
            ['ancestor-dark-red', 'ancestor-light-red'],
            ['text-with-overlay', 'text-green-500'],
        ]) {
            expect(twMerge(`${first} ${second}`)).toBe(`${first} ${second}`)
            expect(twMerge(`${second} ${first}`)).toBe(`${second} ${first}`)
        }

        // Shared conditional scaffolding is still redundant when its surrounding conditions agree.
        expect(twMerge('wide-red wide-red-copy')).toBe('wide-red-copy')
        expect(twMerge('wide-red-copy wide-red')).toBe('wide-red')
    })
})
