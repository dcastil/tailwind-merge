import { extendTailwindMerge } from '../src'

test('single character separator working correctly', () => {
    const twMerge = extendTailwindMerge({
        separator: '_',
    })

    expect(twMerge('block hidden')).toBe('hidden')

    expect(twMerge('p-3 p-2')).toBe('p-2')

    expect(twMerge('!right-0 !inset-0')).toBe('!inset-0')

    expect(twMerge('hover_focus_!right-0 focus_hover_!inset-0')).toBe('focus_hover_!inset-0')
    expect(twMerge('hover:focus:!right-0 focus:hover:!inset-0')).toBe(
        'hover:focus:!right-0 focus:hover:!inset-0',
    )
})

test('multiple character separator working correctly', () => {
    const twMerge = extendTailwindMerge({
        separator: '__',
    })

    expect(twMerge('block hidden')).toBe('hidden')

    expect(twMerge('p-3 p-2')).toBe('p-2')

    expect(twMerge('!right-0 !inset-0')).toBe('!inset-0')

    expect(twMerge('hover__focus__!right-0 focus__hover__!inset-0')).toBe('focus__hover__!inset-0')
    expect(twMerge('hover:focus:!right-0 focus:hover:!inset-0')).toBe(
        'hover:focus:!right-0 focus:hover:!inset-0',
    )
})
