import { twMerge } from '../src'

test('handles arbitrary property conflicts correctly', () => {
    expect(twMerge('[paint-order:markers] [paint-order:normal]')).toBe('[paint-order:normal]')
    expect(
        twMerge('[paint-order:markers] [--my-var:2rem] [paint-order:normal] [--my-var:4px]'),
    ).toBe('[paint-order:normal] [--my-var:4px]')
})

test('handles arbitrary property conflicts with modifiers correctly', () => {
    expect(twMerge('[paint-order:markers] hover:[paint-order:normal]')).toBe(
        '[paint-order:markers] hover:[paint-order:normal]',
    )
    expect(twMerge('hover:[paint-order:markers] hover:[paint-order:normal]')).toBe(
        'hover:[paint-order:normal]',
    )
    expect(twMerge('hover:focus:[paint-order:markers] focus:hover:[paint-order:normal]')).toBe(
        'focus:hover:[paint-order:normal]',
    )
    expect(
        twMerge('[paint-order:markers] [paint-order:normal] [--my-var:2rem] lg:[--my-var:4px]'),
    ).toBe('[paint-order:normal] [--my-var:2rem] lg:[--my-var:4px]')
})

test('handles complex arbitrary property conflicts correctly', () => {
    expect(twMerge('[-unknown-prop:::123:::] [-unknown-prop:url(https://hi.com)]')).toBe(
        '[-unknown-prop:url(https://hi.com)]',
    )
})

test('handles important modifier correctly', () => {
    expect(twMerge('![some:prop] [some:other]')).toBe('![some:prop] [some:other]')
    expect(twMerge('![some:prop] [some:other] [some:one] ![some:another]')).toBe(
        '[some:one] ![some:another]',
    )
})
