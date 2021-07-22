import { createTailwindMerge } from '../src'

test('lazy initialization', () => {
    const initMock = jest.fn((c) => c())
    const twMerge = createTailwindMerge(initMock)

    expect(initMock).not.toHaveBeenCalled()

    twMerge()

    expect(initMock).toHaveBeenCalledTimes(1)

    twMerge()
    twMerge('')
    twMerge('px-2 p-3 p-4')

    expect(initMock).toHaveBeenCalledTimes(1)
})
