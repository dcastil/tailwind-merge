import { expect, test, vi } from 'vitest'

import { createTailwindMerge, getDefaultConfig } from '../src'

test('lazy initialization', () => {
    const initMock = vi.fn(getDefaultConfig)
    const twMerge = createTailwindMerge(initMock)

    expect(initMock).not.toHaveBeenCalled()

    twMerge()

    expect(initMock).toHaveBeenCalledTimes(1)

    twMerge()
    twMerge('')
    twMerge('px-2 p-3 p-4')

    expect(initMock).toHaveBeenCalledTimes(1)
})
