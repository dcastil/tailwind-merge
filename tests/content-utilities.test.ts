import { twMerge } from '../src'

test('merges content utilities correctly', () => {
    expect(twMerge("content-['hello'] content-[attr(data-content)]")).toBe(
        'content-[attr(data-content)]',
    )
})
