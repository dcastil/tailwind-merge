import { twMerge } from '../src'

test('handles color conflicts properly', () => {
    expect(twMerge('bg-grey-5 bg-hotpink')).toBe('bg-hotpink')
    expect(twMerge('hover:bg-grey-5 hover:bg-hotpink')).toBe('hover:bg-hotpink')
    expect(twMerge('stroke-[hsl(350_80%_0%)] stroke-[10px]')).toBe(
        'stroke-[hsl(350_80%_0%)] stroke-[10px]',
    )
})
