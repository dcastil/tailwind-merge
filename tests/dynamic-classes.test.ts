import { twMerge } from '../src'

test('merges dynamic classes from same group correctly', () => {
    expect(twMerge('overflow-x-auto overflow-x-hidden')).toBe('overflow-x-hidden')
    expect(twMerge('overflow-x-auto overflow-x-hidden overflow-x-scroll')).toBe('overflow-x-scroll')
    expect(twMerge('overflow-x-auto hover:overflow-x-hidden overflow-x-scroll')).toBe(
        'hover:overflow-x-hidden overflow-x-scroll'
    )
    expect(
        twMerge('overflow-x-auto hover:overflow-x-hidden hover:overflow-x-auto overflow-x-scroll')
    ).toBe('hover:overflow-x-auto overflow-x-scroll')
})
