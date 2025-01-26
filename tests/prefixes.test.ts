import { expect, test } from 'vitest'

import { extendTailwindMerge } from '../src'

test('prefix working correctly', () => {
    const twMerge = extendTailwindMerge({
        prefix: 'tw',
    })
    expect(twMerge('tw:block tw:hidden')).toBe('tw:hidden')
    expect(twMerge('block hidden')).toBe('block hidden')

    expect(twMerge('tw:p-3 tw:p-2')).toBe('tw:p-2')
    expect(twMerge('p-3 p-2')).toBe('p-3 p-2')

    expect(twMerge('tw:right-0! tw:inset-0!')).toBe('tw:inset-0!')

    expect(twMerge('tw:hover:focus:right-0! tw:focus:hover:inset-0!')).toBe(
        'tw:focus:hover:inset-0!',
    )
})
