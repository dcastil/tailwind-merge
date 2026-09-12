import { expect, test } from 'vitest'

import { parseDeclarations } from '../src/declarations'

// The scope and selector rules are exercised against literal CSS here; the design-system tests cover what Tailwind actually emits.

test('a selector list inside :where() is one selector, not a list', () => {
    // shadcn-style dark mode: `@custom-variant dark (&:where(.dark, .dark *))`. Splitting at the inner comma left `(.dark` as a render context and made every dark variant order-sensitive.
    const [entry] = parseDeclarations('.dark\\:block:where(.dark, .dark *) { display: block }')

    expect(entry).toMatchObject({ context: '', conditional: true, property: 'display' })
    expect(entry!.scope).toEqual(['&:where(.dark, .dark *)'])
})

test('an ancestor variant anchors on the candidate, not on the ancestor class', () => {
    // `in-dark:block` compiles to `:where(:where(.dark, .dark *)) .in-dark\:block`; anchoring on the first class (`.dark`) would make the utility's own element a combinator target.
    const [entry] = parseDeclarations(
        ':where(:where(.dark, .dark *)) .in-dark\\:block { display: block }',
        'in-dark:block',
    )

    expect(entry).toMatchObject({ context: '', conditional: true })
    expect(entry!.scope).toEqual([':where(:where(.dark, .dark *)) &'])
})

test('a top-level selector list stays conditional with the first selector as subject', () => {
    const [entry] = parseDeclarations('.x::after, .x::before { color: red }')

    expect(entry).toMatchObject({ context: '::after', conditional: true })
})

test('pseudo-elements and combinators change the render target, pseudo-classes only add conditions', () => {
    const entries = parseDeclarations(
        '.x:hover { color: red } .x::after { color: blue } .x > :not(:last-child) { color: green !important }',
    )

    expect(entries.map((entry) => [entry.context, entry.conditional, entry.important])).toEqual([
        ['', true, false],
        ['::after', false, false],
        ['> :not(:last-child)', false, true],
    ])
})

test('registrations and keyframes are not element styles', () => {
    const entries = parseDeclarations(
        '@property --x { syntax: "*"; inherits: false } @keyframes spin { to { rotate: 1turn } } .x { --x: 1 }',
    )

    expect(entries.map((entry) => entry.property)).toEqual(['--x'])
})
