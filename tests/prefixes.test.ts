import { twMerge } from '../src'

test('conflicts across prefixes', () => {
    expect(twMerge('hover:block hover:inline')).toBe('hover:inline')
    expect(twMerge('hover:block hover:focus:inline')).toBe('hover:block hover:focus:inline')
    expect(twMerge('hover:block hover:focus:inline focus:hover:inline')).toBe(
        'hover:block focus:hover:inline'
    )
})
