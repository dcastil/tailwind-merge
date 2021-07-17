import { twMerge } from '../src'

test('merges standalone classes from same group correctly', () => {
    expect(twMerge('inline block')).toBe('block')
    expect(twMerge('hover:block hover:inline')).toBe('hover:inline')
    expect(twMerge('hover:block hover:block')).toBe('hover:block')
    expect(twMerge('inline hover:inline focus:inline hover:block hover:focus:block')).toBe(
        'inline focus:inline hover:block hover:focus:block'
    )
})
