import assert from 'assert'

// Not ideal, but there seems to be no way to point the import resolver to the package.json file if this isn't a npm package.
import { getDefaultConfig, twMerge } from '../dist/bundle-mjs.mjs'
import { twMerge as twMergeEs5 } from '../dist/es5/bundle-mjs.mjs'
import { createClassGroupUtils, createClassGroupLookup, createParseClassName } from '../dist/unstable-mjs.mjs'

assertBuiltTwMerge(twMerge)
assertBuiltTwMerge(twMergeEs5)
assert(createClassGroupUtils(getDefaultConfig()).getClassGroupId('bg-red-500') === 'bg-color')
assert(createParseClassName(getDefaultConfig())('hover:p-4').baseClassName === 'p-4')
assert.deepStrictEqual(createClassGroupLookup(getDefaultConfig())('hover:p-4!'), [
    { className: 'p-4', classGroupId: 'p' },
])

console.log('[tailwind-merge] Tests for built ESM package exports and ES5 bundle passed.')

/**
 * Applies the same smoke tests to each generated ESM bundle so build-tool changes cannot leave the ES5 entry point broken while the default entry point still works.
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
