import { expect, test } from 'vitest'

import { extendTailwindMerge } from '../src'

test('default case', () => {
    const twMerge = extendTailwindMerge({
        experimentalParseClassName({ className, parseClassName }) {
            return parseClassName(className)
        },
    })

    expect(twMerge('px-2 py-1 p-3')).toBe('p-3')
})

test('removing first three characters from class', () => {
    const twMerge = extendTailwindMerge({
        experimentalParseClassName({ className, parseClassName }) {
            return parseClassName(className.slice(3))
        },
    })

    expect(twMerge('barpx-2 foopy-1 lolp-3')).toBe('lolp-3')
})

test('ignoring breakpoint modifiers', () => {
    const breakpoints = new Set(['sm', 'md', 'lg', 'xl', '2xl'])
    const twMerge = extendTailwindMerge({
        experimentalParseClassName({ className, parseClassName }) {
            const parsed = parseClassName(className)

            return {
                ...parsed,
                modifiers: parsed.modifiers.filter((modifier) => !breakpoints.has(modifier)),
            }
        },
    })

    expect(twMerge('md:px-2 hover:py-4 py-1 lg:p-3')).toBe('hover:py-4 lg:p-3')
})
