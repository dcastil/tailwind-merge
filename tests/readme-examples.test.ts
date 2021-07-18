import { twMerge } from '../src'

test('readme examples', () => {
    // # tailwind-merge
    expect(twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]')).toBe(
        'hover:bg-dark-red p-3 bg-[#B91C1C]'
    )

    // ## What is it for
    expect(twMerge('px-2 py-1', 'p-3')).toBe('p-3')

    // ## Features
    // ### Last conflicting class wins
    expect(twMerge('p-5 p-2 p-4')).toBe('p-4')

    // ### Resolves non-trivial conflicts
    expect(twMerge('inset-x-px -inset-1')).toBe('-inset-1')
    expect(twMerge('bottom-auto inset-y-6')).toBe('inset-y-6')
    expect(twMerge('inline block')).toBe('block')

    // ### Supports prefixes and stacked prefixes
    expect(twMerge('p-2 hover:p-4')).toBe('p-2 hover:p-4')
    expect(twMerge('hover:p-2 hover:p-4')).toBe('hover:p-4')
    expect(twMerge('hover:focus:p-2 focus:hover:p-4')).toBe('focus:hover:p-4')

    // ### Supports custom values
    expect(twMerge('bg-black bg-[color:var(--mystery-var)]')).toBe('bg-[color:var(--mystery-var)]')
    expect(twMerge('grid-cols-[1fr,auto] grid-cols-2')).toBe('grid-cols-2')

    // ### Supports important modifier
    expect(twMerge('!p-3 !p-4 p-5')).toBe('!p-4 p-5')
    expect(twMerge('!right-2 !-inset-x-1')).toBe('!-inset-x-1')

    // ### Preserves non-Tailwind classes
    expect(twMerge('p-5 p-2 my-non-tailwind-class p-4')).toBe('my-non-tailwind-class p-4')

    // ### Supports custom colors out of the box
    expect(twMerge('text-red text-secret-sauce')).toBe('text-secret-sauce')
})
