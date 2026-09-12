import { test } from 'vitest'

import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

test.each(['compact', 'exact'] as const)('%s border shorthands preserve corner radii', async (encoding) => {
    const stylesheet = css`
        @import 'tailwindcss';
        @utility border-boxed {
            border: 1px solid red;
        }
        @utility border-top-boxed {
            border-top: 1px solid red;
        }
        @utility round-boxed {
            border-radius: 1rem;
        }
    `
    const corners = ['rounded-lg', 'rounded-tl-lg', 'rounded-tr-lg', 'rounded-br-lg', 'rounded-bl-lg', 'rounded-ss-lg', 'rounded-se-lg', 'rounded-es-lg', 'rounded-ee-lg']
    const cases = Object.fromEntries([
        ...corners.flatMap((corner) => [
            [`${corner} border-boxed`, `${corner} border-boxed`],
            [`border-boxed ${corner}`, `border-boxed ${corner}`],
            [`${corner} border-top-boxed`, `${corner} border-top-boxed`],
            [`${corner} round-boxed`, 'round-boxed'],
        ]),
        // The exception must retain real shorthand coverage for widths, colors, and corner radii.
        ['border-2 border-boxed', 'border-boxed'],
        ['border-red-500 border-boxed', 'border-boxed'],
        ['border-t-2 border-top-boxed', 'border-top-boxed'],
        ['rounded-tl-lg rounded-xl', 'rounded-xl'],
    ])
    const usedClasses = [...new Set(Object.keys(cases).flatMap((input) => input.split(' ')))]
    for (const prune of [undefined, { usedClasses }]) {
        const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
        expectMerges(fixture.twMerge, cases)
        for (const format of ['js', 'ts'] as const) {
            const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
            expectMerges(emitted.twMerge, cases)
        }
    }
})
