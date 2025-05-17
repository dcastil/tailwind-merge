import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('handles color opacity conflicts properly', () => {
    expect(twMerge('bg-opacity-50 bg-black/25 bg-opacity-75')).toBe('bg-black/25 bg-opacity-75')
    expect(twMerge('text-opacity-50 text-black/25 text-opacity-80')).toBe('text-black/25 text-opacity-80')

    expect(twMerge('text-black text-opacity-75')).toBe('text-black text-opacity-75')
    expect(twMerge('text-black text-opacity-75 text-opacity-80')).toBe('text-black text-opacity-80')

    expect(twMerge('bg-black bg-opacity-[12%]')).toBe('bg-black bg-opacity-[12%]')
    expect(twMerge('bg-black bg-opacity-[12%] bg-opacity-[15%]')).toBe('bg-black bg-opacity-[15%]')

    expect(twMerge('bg-black bg-opacity-(--my-opacity)')).toBe('bg-black bg-opacity-(--my-opacity)')
    expect(twMerge('bg-black bg-opacity-(--my-opacity-one) bg-opacity-(--my-opacity-two)')).toBe('bg-black bg-opacity-(--my-opacity-two)')

    expect(twMerge('text-black text-opacity-(--my-opacity)')).toBe('text-black text-opacity-(--my-opacity)')
    expect(twMerge('text-black text-opacity-(--my-opacity-one) text-opacity-(--my-opacity-two)')).toBe('text-black text-opacity-(--my-opacity-two)')
})
