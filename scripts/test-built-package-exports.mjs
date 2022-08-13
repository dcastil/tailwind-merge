import assert from 'assert'

import { twMerge } from '../dist/tailwind-merge.mjs'

assert(twMerge() === '')
assert(
    twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]') ===
        'hover:bg-dark-red p-3 bg-[#B91C1C]'
)

console.log('[tailwind-merge] Tests for built ESM package exports passed.')
