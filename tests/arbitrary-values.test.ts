import { twMerge } from '../src'

test('handles simple conflicts with arbitrary values correctly', () => {
    expect(twMerge('m-[2px] m-[10px]')).toBe('m-[10px]')
    expect(
        twMerge(
            'm-[2px] m-[11svmin] m-[12in] m-[13lvi] m-[14vb] m-[15vmax] m-[16mm] m-[17%] m-[18em] m-[19px] m-[10dvh]',
        ),
    ).toBe('m-[10dvh]')
    expect(twMerge('z-20 z-[99]')).toBe('z-[99]')
    expect(twMerge('my-[2px] m-[10rem]')).toBe('m-[10rem]')
    expect(twMerge('cursor-pointer cursor-[grab]')).toBe('cursor-[grab]')
    expect(twMerge('m-[2px] m-[calc(100%-var(--arbitrary))]')).toBe(
        'm-[calc(100%-var(--arbitrary))]',
    )
    expect(twMerge('m-[2px] m-[length:var(--mystery-var)]')).toBe('m-[length:var(--mystery-var)]')
})

test('handles arbitrary length conflicts with labels and modifiers correctly', () => {
    expect(twMerge('hover:m-[2px] hover:m-[length:var(--c)]')).toBe('hover:m-[length:var(--c)]')
    expect(twMerge('hover:focus:m-[2px] focus:hover:m-[length:var(--c)]')).toBe(
        'focus:hover:m-[length:var(--c)]',
    )
    expect(twMerge('border-b border-[color:rgb(var(--color-gray-500-rgb)/50%))]')).toBe(
        'border-b border-[color:rgb(var(--color-gray-500-rgb)/50%))]',
    )
    expect(twMerge('border-[color:rgb(var(--color-gray-500-rgb)/50%))] border-b')).toBe(
        'border-[color:rgb(var(--color-gray-500-rgb)/50%))] border-b',
    )
    expect(
        twMerge('border-b border-[color:rgb(var(--color-gray-500-rgb)/50%))] border-some-coloooor'),
    ).toBe('border-b border-some-coloooor')
})

test('handles complex arbitrary value conflicts correctly', () => {
    expect(twMerge('grid-rows-[1fr,auto] grid-rows-2')).toBe('grid-rows-2')
    expect(twMerge('grid-rows-[repeat(20,minmax(0,1fr))] grid-rows-3')).toBe('grid-rows-3')
})
