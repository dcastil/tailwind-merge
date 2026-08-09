import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('handles wonky inputs', () => {
    expect(twMerge(' block')).toBe('block')
    expect(twMerge('block ')).toBe('block')
    expect(twMerge(' block ')).toBe('block')
    expect(twMerge('  block  px-2     py-4  ')).toBe('block px-2 py-4')
    expect(twMerge('  block  px-2', ' ', '     py-4  ')).toBe('block px-2 py-4')
    expect(twMerge('block\npx-2')).toBe('block px-2')
    expect(twMerge('\nblock\npx-2\n')).toBe('block px-2')
    expect(twMerge('  block\n        \n        px-2   \n          py-4  ')).toBe('block px-2 py-4')
    expect(twMerge('\r  block\n\r        \n        px-2   \n          py-4  ')).toBe(
        'block px-2 py-4',
    )
})
