import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('merges array values correctly', () => {
    expect(twMerge(['text-white', 'bg-black'])).toBe('text-white bg-black')
})

test('merges readonly array values correctly', () => {
    const readonlyArray = ['text-white', 'bg-black'] as const
    expect(twMerge(readonlyArray)).toBe('text-white bg-black')
})
