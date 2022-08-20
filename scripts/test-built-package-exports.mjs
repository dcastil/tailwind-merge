import assert from 'assert'

// Not ideal, but there seems to be no way to point the import resolver to the package.json file if this isn't a npm package.
import { twMerge } from '../dist/tailwind-merge.mjs'

assert(twMerge() === '')
assert(
    twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]') ===
        'hover:bg-dark-red p-3 bg-[#B91C1C]',
)

console.log('[tailwind-merge] Tests for built ESM package exports passed.')
