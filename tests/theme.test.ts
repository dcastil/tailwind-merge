import { expect, test } from 'vitest'

import { extendTailwindMerge, fromTheme } from '../src'

test('theme scale can be extended', () => {
    const tailwindMerge = extendTailwindMerge({
        extend: {
            theme: {
                spacing: ['my-space'],
                leading: ['my-leading'],
            },
        },
    })

    expect(tailwindMerge('p-3 p-my-space p-my-margin')).toBe('p-my-space p-my-margin')
    expect(tailwindMerge('leading-3 leading-my-space leading-my-leading')).toBe(
        'leading-my-leading',
    )
})

test('theme object can be extended', () => {
    const tailwindMerge = extendTailwindMerge<never, string>({
        extend: {
            theme: {
                'my-theme': ['hallo', 'hello'],
            },
            classGroups: {
                px: [{ px: [fromTheme<string>('my-theme')] }],
            },
        },
    })

    expect(tailwindMerge('p-3 p-hello p-hallo')).toBe('p-3 p-hello p-hallo')
    expect(tailwindMerge('px-3 px-hello px-hallo')).toBe('px-hallo')
})

test('leading-none keeps merging when the leading theme scale is overridden', () => {
    // `leading-none` is a static Tailwind v4 utility (`line-height: 1`) that does
    // not come from the `--leading-*` theme namespace, so overriding `theme.leading`
    // must not stop it from conflicting with other line-height utilities — same as
    // `rounded-none` / `shadow-none` survive `theme.radius` / `theme.shadow` overrides.
    const tailwindMerge = extendTailwindMerge({
        override: {
            theme: {
                leading: ['tight'],
            },
        },
    })

    expect(tailwindMerge('leading-tight leading-none')).toBe('leading-none')
    expect(tailwindMerge('leading-none leading-tight')).toBe('leading-tight')
    expect(tailwindMerge('leading-4 leading-none')).toBe('leading-none')
})

test('z-index theme scale merges like other theme scales', () => {
    // Tailwind CSS resolves `z-<name>` from the `--z-index-*` theme namespace,
    // so declared values must conflict with `z-<number>` classes.
    const tailwindMerge = extendTailwindMerge({
        extend: {
            theme: {
                'z-index': ['button'],
            },
        },
    })

    expect(tailwindMerge('z-button z-0')).toBe('z-0')
    expect(tailwindMerge('z-0 z-button')).toBe('z-button')
    // values not declared in the theme must not merge
    expect(tailwindMerge('z-unknown z-0')).toBe('z-unknown z-0')
})
