import { twMerge } from '../src'

test('merges classes with per-side border colors correctly', () => {
    expect(twMerge('border-t-some-blue border-t-other-blue')).toBe('border-t-other-blue')
    expect(twMerge('border-t-some-blue border-some-blue')).toBe('border-some-blue')
})
