import { describe, expect, test } from 'vitest'

import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

describe.each(['compact', 'exact'] as const)('%s negative custom utilities', (encoding) => {
    test.each(['', 'tw'])('preserves positive static claims with different effects (prefix: %s)', async (prefix) => {
        expect.hasAssertions()
        const utilities = css`
            @utility shift-small { padding: 1rem; }
            @utility shift-large { padding: 2rem; border-radius: 1rem; }
            @utility shift-7 { color: red; }
        `
        const cases = {
            'shift-small -shift-small': 'shift-small -shift-small',
            '-shift-small shift-small': '-shift-small shift-small',
            'shift-large -shift-large': 'shift-large -shift-large',
            '-shift-large shift-large': '-shift-large shift-large',
            'shift-small -shift-large': 'shift-small -shift-large',
            'shift-7 -shift-7': 'shift-7 -shift-7',
            '-shift-7 shift-7': '-shift-7 shift-7',
            'hover:shift-small hover:-shift-small': 'hover:shift-small hover:-shift-small',
            'shift-small! -shift-small!': 'shift-small! -shift-small!',
            'p-2 -shift-small': 'p-2 -shift-small',
            'text-blue-500 -shift-7': 'text-blue-500 -shift-7',
        }
        for (const functional of ['', '@utility shift-* { margin-right: calc(--value(integer) * 1px); }']) {
            await checkUtilities(prefix, `${utilities}\n${functional}`, cases)
        }
    })

    test.each(['', 'tw'])('retains compatible positive static claims (prefix: %s)', async (prefix) => {
        expect.hasAssertions()
        await checkUtilities(prefix, '@utility shift-small { margin-right: 1px; }', {
            'shift-small -shift-small': '-shift-small',
            '-shift-small shift-small': 'shift-small',
            '-shift-small -shift-large': '-shift-large',
            'mr-2 -shift-small': '-shift-small',
        })
    })

    test.each(['', 'tw'])('normalizes negative-only roots (prefix: %s)', async (prefix) => {
        expect.hasAssertions()
        await checkUtilities(prefix, '', {
            '-shift-2 -shift-3': '-shift-3',
            '-shift-9713 -shift-8231': '-shift-8231',
            '-shift-small -shift-large': '-shift-large',
            'hover:-shift-2 hover:-shift-3': 'hover:-shift-3',
            '-shift-2! -shift-3!': '-shift-3!',
            'mr-2 -shift-3': '-shift-3',
        })
    })

    test.each(['', 'tw'])('preserves opposite roots with different effects (prefix: %s)', async (prefix) => {
        expect.hasAssertions()
        await checkUtilities(prefix, '@utility shift-* { margin-left: calc(--value(integer) * 1px); }', {
            'shift-2 -shift-3': 'shift-2 -shift-3',
            'shift-2 -shift-small': 'shift-2 -shift-small',
            '-shift-3 shift-2': '-shift-3 shift-2',
            'hover:shift-2 hover:-shift-3': 'hover:shift-2 hover:-shift-3',
            'shift-2! -shift-3!': 'shift-2! -shift-3!',
            'ml-2 -shift-3': 'ml-2 -shift-3',
            'mr-2 shift-3': 'mr-2 shift-3',
        })
    })

    test.each(['', 'tw'])('combines opposite roots with the same effects (prefix: %s)', async (prefix) => {
        expect.hasAssertions()
        await checkUtilities(prefix, '@utility shift-* { margin-right: calc(--value(integer) * 1px); }', {
            'shift-2 -shift-3': '-shift-3',
            '-shift-3 shift-2': 'shift-2',
            '-shift-2 -shift-3': '-shift-3',
            '-shift-small shift-2': 'shift-2',
            'shift-2 shift-3': 'shift-3',
        })
    })

    /** Exercise the public runtime in every output form, including the lookup paths retained by pruning. */
    async function checkUtilities(prefix: string, positiveUtility: string, cases: Record<string, string>) {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @theme {
                --shift-small: 1;
                --shift-large: 2;
            }
            @utility -shift-* {
                margin-right: calc(--value(integer, --shift-*) * -1px);
            }
            ${positiveUtility}
        `
        const prefixedCases = Object.fromEntries(Object.entries(cases).map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' '))))
        const usedClasses = [...new Set(Object.keys(prefixedCases).flatMap((input) => input.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expectMerges(fixture.twMerge, prefixedCases)
            for (const format of ['js', 'ts'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, prefixedCases)
            }
        }
    }
})
