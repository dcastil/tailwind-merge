import { twMerge } from '../src'

test('handles custom length conflicts correctly', () => {
    expect(twMerge('m-[2px] m-[10px]')).toBe('m-[10px]')
    expect(twMerge('my-[2px] m-[10rem]')).toBe('m-[10rem]')
    expect(twMerge('m-[2px] m-[calc(100%-var(--custom))]')).toBe('m-[calc(100%-var(--custom))]')
    expect(twMerge('m-[2px] m-[length:var(--mystery-var)]')).toBe('m-[length:var(--mystery-var)]')
})

test('handles custom length conflicts with labels and prefixes correctly', () => {
    expect(twMerge('hover:m-[2px] hover:m-[length:var(--c)]')).toBe('hover:m-[length:var(--c)]')
    expect(twMerge('hover:focus:m-[2px] focus:hover:m-[length:var(--c)]')).toBe(
        'focus:hover:m-[length:var(--c)]'
    )
})

test('handles complex custom value conflicts correctly', () => {
    expect(twMerge('grid-rows-[1fr,auto] grid-rows-2')).toBe('grid-rows-2')
    expect(twMerge('grid-rows-[repeat(20,minmax(0,1fr))] grid-rows-3')).toBe('grid-rows-3')
})
