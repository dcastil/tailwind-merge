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
