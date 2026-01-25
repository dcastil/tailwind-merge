import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('merges classes from same group correctly', () => {
    expect(twMerge('overflow-x-auto overflow-x-hidden')).toBe('overflow-x-hidden')
    expect(twMerge('basis-full basis-auto')).toBe('basis-auto')
    expect(twMerge('w-full w-fit')).toBe('w-fit')
    expect(twMerge('overflow-x-auto overflow-x-hidden overflow-x-scroll')).toBe('overflow-x-scroll')
    expect(twMerge('overflow-x-auto hover:overflow-x-hidden overflow-x-scroll')).toBe(
        'hover:overflow-x-hidden overflow-x-scroll',
    )
    expect(
        twMerge('overflow-x-auto hover:overflow-x-hidden hover:overflow-x-auto overflow-x-scroll'),
    ).toBe('hover:overflow-x-auto overflow-x-scroll')
    expect(twMerge('col-span-1 col-span-full')).toBe('col-span-full')
    expect(twMerge('gap-2 gap-px basis-px basis-3')).toBe('gap-px basis-3')
    expect(twMerge('gap-2xs gap-3')).toBe('gap-3')
    expect(twMerge('p-2xs p-3')).toBe('p-3')
    expect(twMerge('m-2xs m-3')).toBe('m-3')
    expect(twMerge('w-2xs w-3')).toBe('w-3')
})

test('merges classes from Font Variant Numeric section correctly', () => {
    expect(twMerge('lining-nums tabular-nums diagonal-fractions')).toBe(
        'lining-nums tabular-nums diagonal-fractions',
    )
    expect(twMerge('normal-nums tabular-nums diagonal-fractions')).toBe(
        'tabular-nums diagonal-fractions',
    )
    expect(twMerge('tabular-nums diagonal-fractions normal-nums')).toBe('normal-nums')
    expect(twMerge('tabular-nums proportional-nums')).toBe('proportional-nums')
})
