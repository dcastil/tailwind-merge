import { twMerge } from '../src'

test('merges non-conflicting classes correctly', () => {
    expect(twMerge('border-t border-white/10')).toBe('border-t border-white/10')
    expect(twMerge('border-t border-white')).toBe('border-t border-white')
})
