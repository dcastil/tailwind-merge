import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'

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
    test.each([false, true])(
        'preserves declarations in style grouping blocks (pruned: %s)',
        async (prune) => {
            const stylesheet = css`
                @import 'tailwindcss';
                @utility entrance {
                    color: red;
                    @starting-style {
                        opacity: 0;
                    }
                }
                @utility entrance-copy {
                    color: blue;
                    @starting-style {
                        opacity: 0;
                    }
                }
                @utility scoped {
                    color: red;
                    @scope (.card) {
                        opacity: 0;
                    }
                }
                @utility layered {
                    color: red;
                    @layer components {
                        opacity: 0;
                    }
                }
                @utility registered-red {
                    color: red;
                    @property --entrance-opacity {
                        syntax: '<number>';
                        inherits: false;
                        initial-value: 0;
                    }
                    @keyframes entrance-fade {
                        from {
                            opacity: 0;
                        }
                        to {
                            opacity: 1;
                        }
                    }
                }
            `
            const usedClasses = [
                'entrance',
                'entrance-copy',
                'scoped',
                'layered',
                'registered-red',
                'text-blue-500',
                'opacity-100',
            ]
            const { twMerge, designSystem } = await generateFixture(stylesheet, undefined, {
                encoding,
                prune: prune ? { usedClasses } : undefined,
            })

            for (const [name, scope] of [
                ['entrance', '@starting-style'],
                ['scoped', '@scope (.card)'],
                ['layered', '@layer components'],
            ]) {
                expect(
                    declaredDeclarations(designSystem, name!)?.filter(
                        (entry) => entry.property === 'opacity',
                    ),
                ).toEqual([
                    expect.objectContaining({ conditional: true, scope: ['&', scope], value: '0' }),
                ])
                expect(twMerge(`${name} text-blue-500 opacity-100`)).toBe(
                    `${name} text-blue-500 opacity-100`,
                )
                expect(twMerge(`text-blue-500 ${name}`)).toBe(name)
            }
            expect(twMerge('entrance entrance-copy')).toBe('entrance-copy')
            expect(twMerge('entrance scoped layered')).toBe('entrance scoped layered')
            // Registrations and animation frames describe global resources, not the utility's element styles.
            expect(declaredDeclarations(designSystem, 'registered-red')).toHaveLength(1)
            expect(twMerge('registered-red text-blue-500')).toBe('text-blue-500')
        },
    )

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
