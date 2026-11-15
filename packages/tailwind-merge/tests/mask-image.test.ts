import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('mask axis positions override earlier positions on both edges', () => {
    expect(twMerge('mask-t-from-50% mask-y-from-20%')).toBe('mask-y-from-20%')
    expect(twMerge('mask-l-from-10% mask-r-from-30% mask-x-from-20%')).toBe('mask-x-from-20%')
    expect(twMerge('mask-l-to-70% mask-r-to-90% mask-x-to-80%')).toBe('mask-x-to-80%')
    expect(twMerge('mask-t-from-10% mask-b-from-30% mask-y-from-20%')).toBe('mask-y-from-20%')
    expect(twMerge('mask-t-to-70% mask-b-to-90% mask-y-to-80%')).toBe('mask-y-to-80%')
})

test('mask axis colors override earlier colors on both edges', () => {
    expect(twMerge('mask-r-to-red-500 mask-x-to-blue-500')).toBe('mask-x-to-blue-500')
    expect(twMerge('mask-l-from-red-500 mask-r-from-green-500 mask-x-from-blue-500')).toBe(
        'mask-x-from-blue-500',
    )
    expect(twMerge('mask-l-to-red-500 mask-r-to-green-500 mask-x-to-blue-500')).toBe(
        'mask-x-to-blue-500',
    )
    expect(twMerge('mask-t-from-red-500 mask-b-from-green-500 mask-y-from-blue-500')).toBe(
        'mask-y-from-blue-500',
    )
    expect(twMerge('mask-t-to-red-500 mask-b-to-green-500 mask-y-to-blue-500')).toBe(
        'mask-y-to-blue-500',
    )
})

test('mask edge positions refine earlier axis positions', () => {
    expect(twMerge('mask-x-from-20% mask-l-from-10% mask-r-from-30%')).toBe(
        'mask-x-from-20% mask-l-from-10% mask-r-from-30%',
    )
    expect(twMerge('mask-x-to-80% mask-l-to-70% mask-r-to-90%')).toBe(
        'mask-x-to-80% mask-l-to-70% mask-r-to-90%',
    )
    expect(twMerge('mask-y-from-20% mask-t-from-10% mask-b-from-30%')).toBe(
        'mask-y-from-20% mask-t-from-10% mask-b-from-30%',
    )
    expect(twMerge('mask-y-to-80% mask-t-to-70% mask-b-to-90%')).toBe(
        'mask-y-to-80% mask-t-to-70% mask-b-to-90%',
    )
})

test('mask edge colors refine earlier axis colors', () => {
    expect(twMerge('mask-x-from-blue-500 mask-l-from-red-500 mask-r-from-green-500')).toBe(
        'mask-x-from-blue-500 mask-l-from-red-500 mask-r-from-green-500',
    )
    expect(twMerge('mask-x-to-blue-500 mask-l-to-red-500 mask-r-to-green-500')).toBe(
        'mask-x-to-blue-500 mask-l-to-red-500 mask-r-to-green-500',
    )
    expect(twMerge('mask-y-from-blue-500 mask-t-from-red-500 mask-b-from-green-500')).toBe(
        'mask-y-from-blue-500 mask-t-from-red-500 mask-b-from-green-500',
    )
    expect(twMerge('mask-y-to-blue-500 mask-t-to-red-500 mask-b-to-green-500')).toBe(
        'mask-y-to-blue-500 mask-t-to-red-500 mask-b-to-green-500',
    )
})

test('mask axis conflicts keep independent edges, stops, and value types', () => {
    expect(twMerge('mask-t-to-red-500 mask-b-to-green-500 mask-x-to-blue-500')).toBe(
        'mask-t-to-red-500 mask-b-to-green-500 mask-x-to-blue-500',
    )
    expect(twMerge('mask-l-from-10% mask-r-from-30% mask-y-from-20%')).toBe(
        'mask-l-from-10% mask-r-from-30% mask-y-from-20%',
    )
    expect(twMerge('mask-x-to-red-500 mask-y-to-blue-500')).toBe(
        'mask-x-to-red-500 mask-y-to-blue-500',
    )
    expect(twMerge('mask-l-from-10% mask-x-to-80%')).toBe('mask-l-from-10% mask-x-to-80%')
    expect(twMerge('mask-b-to-red-500 mask-y-from-blue-500')).toBe(
        'mask-b-to-red-500 mask-y-from-blue-500',
    )
    expect(twMerge('mask-r-to-50% mask-x-to-blue-500')).toBe('mask-r-to-50% mask-x-to-blue-500')
    expect(twMerge('mask-t-from-red-500 mask-y-from-20%')).toBe(
        'mask-t-from-red-500 mask-y-from-20%',
    )
})

test('mask axis conflicts support arbitrary values and variables', () => {
    expect(twMerge('mask-r-from-[length:12px] mask-x-from-[length:24px]')).toBe(
        'mask-x-from-[length:24px]',
    )
    expect(twMerge('mask-b-to-(color:--edge) mask-y-to-(color:--axis)')).toBe(
        'mask-y-to-(color:--axis)',
    )
})

test('mask arbitrary positions remain independent from colors', () => {
    for (const position of [
        '[20px]',
        '[20%]',
        '[length:20px]',
        '[number:20]',
        '[0]',
        '[.25turn]',
        '[angle:45deg]',
        '[var(--position)]',
        '[calc(100%-1rem)]',
        '(--position)',
        '(length:--position)',
        '(number:--position)',
        '(angle:--position)',
    ]) {
        expect(twMerge(`mask-r-from-red-500 mask-x-from-${position}`)).toBe(
            `mask-r-from-red-500 mask-x-from-${position}`,
        )
        expect(twMerge(`mask-b-to-${position} mask-y-to-blue-500`)).toBe(
            `mask-b-to-${position} mask-y-to-blue-500`,
        )
        expect(twMerge(`mask-l-from-10% mask-x-from-${position}`)).toBe(`mask-x-from-${position}`)
        expect(twMerge(`mask-t-to-${position} mask-y-to-80%`)).toBe('mask-y-to-80%')
        expect(twMerge(`mask-x-from-10% mask-r-from-${position}`)).toBe(
            `mask-x-from-10% mask-r-from-${position}`,
        )
    }
})

test('mask color functions with percentages remain independent from positions', () => {
    expect(twMerge('mask-r-from-50% mask-x-from-[hsl(0_0%_0%)]')).toBe(
        'mask-r-from-50% mask-x-from-[hsl(0_0%_0%)]',
    )
    expect(twMerge('mask-b-to-red-500 mask-y-to-[color(srgb_100%_0%_0%)]')).toBe(
        'mask-y-to-[color(srgb_100%_0%_0%)]',
    )
    expect(twMerge('mask-r-from-50% mask-x-from-[--alpha(red/50%)]')).toBe(
        'mask-r-from-50% mask-x-from-[--alpha(red/50%)]',
    )
})

test('linear, radial, and conic mask stops keep arbitrary positions separate from colors', () => {
    for (const shape of ['linear', 'radial', 'conic']) {
        expect(twMerge(`mask-${shape}-from-red-500 mask-${shape}-from-(--position)`)).toBe(
            `mask-${shape}-from-red-500 mask-${shape}-from-(--position)`,
        )
        expect(twMerge(`mask-${shape}-to-50% mask-${shape}-to-[20%]`)).toBe(
            `mask-${shape}-to-[20%]`,
        )
    }
})

test('mask axis conflicts respect modifiers and important classes', () => {
    expect(twMerge('hover:mask-r-to-red-500 hover:mask-x-to-blue-500')).toBe(
        'hover:mask-x-to-blue-500',
    )
    expect(twMerge('hover:mask-r-to-red-500 focus:mask-x-to-blue-500')).toBe(
        'hover:mask-r-to-red-500 focus:mask-x-to-blue-500',
    )
    expect(twMerge('mask-t-from-50%! mask-y-from-20%!')).toBe('mask-y-from-20%!')
    expect(twMerge('mask-t-from-50%! mask-y-from-20%')).toBe('mask-t-from-50%! mask-y-from-20%')
})
