import { twMerge } from '../src'

test('twMerge', () => {
    expect(twMerge('mix-blend-normal mix-blend-multiply')).toBe('mix-blend-multiply')
})
