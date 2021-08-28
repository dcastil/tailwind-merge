import { twMerge } from '../src'

test('merges tailwind classes with important modifier correctly', () => {
    expect(twMerge('!font-medium !font-bold')).toBe('!font-bold')
    expect(twMerge('!font-medium !font-bold font-thin')).toBe('!font-bold font-thin')
    expect(twMerge('!right-2 !-inset-x-px')).toBe('!-inset-x-px')
    expect(twMerge('focus:!inline focus:!block')).toBe('focus:!block')
})
