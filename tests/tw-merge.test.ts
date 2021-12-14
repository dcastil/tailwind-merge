import { twMerge } from '../src'

test('twMerge', () => {
    expect(twMerge('mix-blend-normal mix-blend-multiply')).toBe('mix-blend-multiply')
    expect(twMerge('stroke-black stroke-1')).toBe('stroke-black stroke-1')
})
