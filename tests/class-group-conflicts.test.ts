import { twMerge } from '../src'

test('merges classes from same group correctly', () => {
    expect(twMerge('overflow-x-auto overflow-x-hidden')).toBe('overflow-x-hidden')
    expect(twMerge('w-full w-fit')).toBe('w-fit')
    expect(twMerge('overflow-x-auto overflow-x-hidden overflow-x-scroll')).toBe('overflow-x-scroll')
    expect(twMerge('overflow-x-auto hover:overflow-x-hidden overflow-x-scroll')).toBe(
        'hover:overflow-x-hidden overflow-x-scroll',
    )
    expect(
        twMerge('overflow-x-auto hover:overflow-x-hidden hover:overflow-x-auto overflow-x-scroll'),
    ).toBe('hover:overflow-x-auto overflow-x-scroll')
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
