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
