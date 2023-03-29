import { twMerge } from '../src'

test('supports Tailwind CSS v3.3 features', () => {
    expect(
        twMerge(
            'start-0 start-1',
            'end-0 end-1',
            'ps-0 ps-1 pe-0 pe-1',
            'ms-0 ms-1 me-0 me-1',
            'rounded-s-sm rounded-s-md rounded-e-sm rounded-e-md',
            'rounded-ss-sm rounded-ss-md rounded-ee-sm rounded-ee-md',
        ),
    ).toBe(
        'start-1 end-1 ps-1 pe-1 ms-1 me-1 rounded-s-md rounded-e-md rounded-ss-md rounded-ee-md',
    )
    expect(
        twMerge(
            'start-0 end-0 inset-0 ps-0 pe-0 p-0 ms-0 me-0 m-0 rounded-ss rounded-es rounded-s',
        ),
    ).toBe('inset-0 p-0 m-0 rounded-s')
    expect(twMerge('hyphens-auto hyphens-manual')).toBe('hyphens-manual')
    expect(
        twMerge('from-0% from-10% from-[12.5%] via-0% via-10% via-[12.5%] to-0% to-10% to-[12.5%]'),
    ).toBe('from-[12.5%] via-[12.5%] to-[12.5%]')
    expect(twMerge('from-0% from-red')).toBe('from-0% from-red')
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
