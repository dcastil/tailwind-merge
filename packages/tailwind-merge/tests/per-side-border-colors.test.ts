import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('merges classes with per-side border colors correctly', () => {
    expect(twMerge('border-t-some-blue border-t-other-blue')).toBe('border-t-other-blue')
    expect(twMerge('border-t-some-blue border-some-blue')).toBe('border-some-blue')
    expect(twMerge('border-some-blue border-s-some-blue')).toBe('border-some-blue border-s-some-blue')
    expect(twMerge('border-e-some-blue border-some-blue')).toBe('border-some-blue')
})
