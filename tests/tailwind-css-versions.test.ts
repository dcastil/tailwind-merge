import { twMerge } from '../src'

test('supports Tailwind CSS v3.3 features', () => {
    expect(
        twMerge('list-image-none list-image-[url(./my-image.png)] list-image-[var(--value)]'),
    ).toBe('list-image-[var(--value)]')
    expect(twMerge('caption-top caption-bottom')).toBe('caption-bottom')
    expect(twMerge('line-clamp-2 line-clamp-none line-clamp-[10]')).toBe('line-clamp-[10]')
    expect(twMerge('delay-150 delay-0 duration-150 duration-0')).toBe('delay-0 duration-0')
    expect(twMerge('justify-normal justify-center justify-stretch')).toBe('justify-stretch')
    expect(twMerge('content-normal content-center content-stretch')).toBe('content-stretch')
    expect(twMerge('whitespace-nowrap whitespace-break-spaces')).toBe('whitespace-break-spaces')
})
