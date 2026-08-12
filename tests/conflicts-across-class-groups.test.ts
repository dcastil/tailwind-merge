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

test('axis shorthands override logical sides', () => {
    // Since Tailwind CSS v4 the axis utilities compile to logical shorthand properties (px → padding-inline), which fully override their logical-side longhands (ps → padding-inline-start) in every writing mode.
    expect(twMerge('ps-2 px-4')).toBe('px-4')
    expect(twMerge('pe-2 px-4')).toBe('px-4')
    expect(twMerge('px-4 ps-2')).toBe('px-4 ps-2')
    expect(twMerge('pbs-2 py-4')).toBe('py-4')
    expect(twMerge('ms-2 mx-4')).toBe('mx-4')
    expect(twMerge('mbe-2 my-4')).toBe('my-4')
    expect(twMerge('start-2 inset-x-4')).toBe('inset-x-4')
    expect(twMerge('end-2 inset-x-4')).toBe('inset-x-4')
    expect(twMerge('inset-bs-2 inset-y-4')).toBe('inset-y-4')
    expect(twMerge('border-s-2 border-x-4')).toBe('border-x-4')
    expect(twMerge('border-be-2 border-y-4')).toBe('border-y-4')
    expect(twMerge('border-s-red-500 border-x-blue-500')).toBe('border-x-blue-500')
    expect(twMerge('border-bs-red-500 border-y-blue-500')).toBe('border-y-blue-500')
    expect(twMerge('scroll-ms-2 scroll-mx-4')).toBe('scroll-mx-4')
    expect(twMerge('scroll-mbs-2 scroll-my-4')).toBe('scroll-my-4')
    expect(twMerge('scroll-ps-2 scroll-px-4')).toBe('scroll-px-4')
    expect(twMerge('scroll-pbe-2 scroll-py-4')).toBe('scroll-py-4')
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
