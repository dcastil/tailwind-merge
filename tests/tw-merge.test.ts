import { twMerge } from '../src'

test('twMerge', () => {
    expect(twMerge('mix-blend-normal mix-blend-multiply')).toBe('mix-blend-multiply')
    expect(twMerge('h-10 h-min')).toBe('h-min')
    expect(twMerge('stroke-black stroke-1')).toBe('stroke-black stroke-1')
    expect(twMerge('stroke-2 stroke-[3]')).toBe('stroke-[3]')
    expect(twMerge('outline-black outline-1')).toBe('outline-black outline-1')
    expect(twMerge('grayscale-0 grayscale-[50%]')).toBe('grayscale-[50%]')
    expect(twMerge('grow grow-[2]')).toBe('grow-[2]')
    expect(twMerge('grow', [null, false, [['grow-[2]']]])).toBe('grow-[2]')
})
