import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('handles conflicts across class groups correctly', () => {
    expect(twMerge('inset-1 inset-x-1')).toBe('inset-1 inset-x-1')
    expect(twMerge('inset-x-1 inset-1')).toBe('inset-1')
    expect(twMerge('inset-x-1 left-1 inset-1')).toBe('inset-1')
    expect(twMerge('inset-x-1 inset-1 left-1')).toBe('inset-1 left-1')
    expect(twMerge('inset-x-1 right-1 inset-1')).toBe('inset-1')
    expect(twMerge('inset-x-1 right-1 inset-x-1')).toBe('inset-x-1')
    expect(twMerge('inset-x-1 right-1 inset-y-1')).toBe('inset-x-1 right-1 inset-y-1')
    expect(twMerge('right-1 inset-x-1 inset-y-1')).toBe('inset-x-1 inset-y-1')
    expect(twMerge('inset-x-1 hover:left-1 inset-1')).toBe('hover:left-1 inset-1')
})

test('ring and shadow classes do not create conflict', () => {
    expect(twMerge('ring shadow')).toBe('ring shadow')
    expect(twMerge('ring-2 shadow-md')).toBe('ring-2 shadow-md')
    expect(twMerge('shadow ring')).toBe('shadow ring')
    expect(twMerge('shadow-md ring-2')).toBe('shadow-md ring-2')
})

test('touch classes do create conflicts correctly', () => {
    expect(twMerge('touch-pan-x touch-pan-right')).toBe('touch-pan-right')
    expect(twMerge('touch-none touch-pan-x')).toBe('touch-pan-x')
    expect(twMerge('touch-pan-x touch-none')).toBe('touch-none')
    expect(twMerge('touch-pan-x touch-pan-y touch-pinch-zoom')).toBe(
        'touch-pan-x touch-pan-y touch-pinch-zoom',
    )
    expect(twMerge('touch-manipulation touch-pan-x touch-pan-y touch-pinch-zoom')).toBe(
        'touch-pan-x touch-pan-y touch-pinch-zoom',
    )
    expect(twMerge('touch-pan-x touch-pan-y touch-pinch-zoom touch-auto')).toBe('touch-auto')
})

test('line-clamp classes do create conflicts correctly', () => {
    expect(twMerge('overflow-auto inline line-clamp-1')).toBe('line-clamp-1')
    expect(twMerge('line-clamp-1 overflow-auto inline')).toBe('line-clamp-1 overflow-auto inline')
})

test('named font-size classes override leading but arbitrary ones do not', () => {
    // Named font-size utilities set a line-height in Tailwind, so they override leading
    expect(twMerge('leading-6 text-lg')).toBe('text-lg')
    expect(twMerge('leading-6 text-base')).toBe('text-base')
    expect(twMerge('text-sm leading-6 text-lg')).toBe('text-lg')

    // Arbitrary font-size values only set font-size and don't affect line-height,
    // so they must not override leading
    expect(twMerge('leading-6 text-[1.5rem]')).toBe('leading-6 text-[1.5rem]')
    expect(twMerge('leading-[1.75rem] text-[1.5rem]')).toBe('leading-[1.75rem] text-[1.5rem]')
    expect(twMerge('leading-6 text-[length:12px]')).toBe('leading-6 text-[length:12px]')
    expect(twMerge('leading-6 text-(length:--my-size)')).toBe('leading-6 text-(length:--my-size)')

    // But an arbitrary font-size with a line-height modifier does set a line-height
    // and therefore still overrides leading
    expect(twMerge('leading-6 text-[1.5rem]/6')).toBe('text-[1.5rem]/6')
    expect(twMerge('leading-6 text-[length:12px]/4')).toBe('text-[length:12px]/4')
})

test('named and arbitrary font-size classes still conflict with each other', () => {
    expect(twMerge('text-lg text-[1.5rem]')).toBe('text-[1.5rem]')
    expect(twMerge('text-[1.5rem] text-lg')).toBe('text-lg')
    expect(twMerge('text-sm text-base')).toBe('text-base')
    expect(twMerge('text-[1rem] text-[2rem]')).toBe('text-[2rem]')
    expect(twMerge('text-[length:12px] text-[length:16px]')).toBe('text-[length:16px]')
})
