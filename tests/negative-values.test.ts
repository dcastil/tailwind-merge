import { twMerge } from '../src'

test('handles negative value conflicts correctly', () => {
    expect(twMerge('-m-2 -m-5')).toBe('-m-5')
    expect(twMerge('-top-12 -top-2000')).toBe('-top-2000')
})

test('handles conflicts between positive and negative values correctly', () => {
    expect(twMerge('-m-2 m-auto')).toBe('m-auto')
    expect(twMerge('top-12 -top-69')).toBe('-top-69')
})

test('handles conflicts across groups with negative values correctly', () => {
    expect(twMerge('-right-1 inset-x-1')).toBe('inset-x-1')
    expect(twMerge('hover:focus:-right-1 focus:hover:inset-x-1')).toBe('focus:hover:inset-x-1')
})
