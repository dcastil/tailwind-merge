const assert = require('assert')

const { twMerge } = require('..')
const { twMerge: twMergeEs5 } = require('../dist/es5/bundle-cjs.js')

assertBuiltTwMerge(twMerge)
assertBuiltTwMerge(twMergeEs5)

console.log('[tailwind-merge] Tests for built CJS package exports and ES5 bundle passed.')

/**
 * Applies the same smoke tests to each generated CJS bundle so build-tool changes cannot leave the ES5 entry point broken while the default entry point still works.
 *
 * @param {typeof twMerge} builtTwMerge
 */
function assertBuiltTwMerge(builtTwMerge) {
    assert(builtTwMerge() === '')
    assert(
        builtTwMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]') ===
            'hover:bg-dark-red p-3 bg-[#B91C1C]',
    )
}
