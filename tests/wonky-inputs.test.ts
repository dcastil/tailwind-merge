import { twMerge } from '../src'

test('handles wonky inputs', () => {
    expect(twMerge(' block')).toBe('block')
    expect(twMerge('block ')).toBe('block')
    expect(twMerge(' block ')).toBe('block')
    expect(twMerge('  block  px-2     py-4  ')).toBe('block px-2 py-4')
    expect(twMerge('  block  px-2', ' ', '     py-4  ')).toBe('block px-2 py-4')
})
