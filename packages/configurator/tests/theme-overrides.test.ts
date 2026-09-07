import { describe, expect, test } from 'vitest'

import { declaredDeclarations } from '../src/design-system'
import { emitModule } from '../src/emit'

import { css, expectMerges, generateFixture, importEmittedModule } from './fixture-utils'

describe.each(['compact', 'exact'] as const)('%s overrides of existing theme classes', (encoding) => {
    test.each(['', 'tw'])('rechecks effects when the original group still claims the class (prefix: %s)', async (prefix) => {
        const stylesheet = css`
            @import 'tailwindcss' ${prefix ? 'prefix(tw)' : ''};
            @theme {
                --text-color-base: red;
                --background-color-fixed: blue;
            }
            @utility text-lg {
                text-transform: uppercase;
            }
        `
        const cases = [
            ['text-base text-sm', 'text-base text-sm'],
            ['text-sm text-base', 'text-sm text-base'],
            ['text-base text-red-500', 'text-red-500'],
            ['text-red-500 text-base', 'text-base'],
            ['hover:text-base hover:text-sm', 'hover:text-base hover:text-sm'],
            ['text-base! text-red-500!', 'text-red-500!'],
            ['bg-fixed bg-red-500', 'bg-fixed bg-red-500'],
            ['bg-fixed bg-scroll', 'bg-fixed bg-scroll'],
            ['bg-scroll bg-fixed', 'bg-scroll bg-fixed'],
            // Existing class names owned by custom-utility inference retain their directional conflicts.
            ['uppercase text-lg', 'text-lg'],
            ['text-lg uppercase', 'text-lg uppercase'],
        ].map((pair) => pair.map((list) => list.split(' ').map((name) => prefix ? `${prefix}:${name}` : name).join(' ')))
        const usedClasses = [...new Set(cases.flatMap(([input]) => input!.split(' ')))]
        for (const prune of [undefined, { usedClasses }]) {
            const fixture = await generateFixture(stylesheet, undefined, { encoding, prune })
            expect(declaredDeclarations(fixture.designSystem, 'text-base')?.map((entry) => entry.property)).toEqual(['color'])
            expect(declaredDeclarations(fixture.designSystem, 'bg-fixed')?.map((entry) => entry.property).sort()).toEqual(['background-attachment', 'background-color'])
            expectMerges(fixture.twMerge, Object.fromEntries(cases))
            for (const format of ['ts', 'js'] as const) {
                const emitted = await importEmittedModule(emitModule(fixture.plan, { format }), format)
                expectMerges(emitted.twMerge, Object.fromEntries(cases))
            }
            expect(fixture.plan.report.resolvedCollisions).toEqual(expect.arrayContaining([
                expect.objectContaining({ className: 'text-base', keptGroupId: 'text-color' }),
                expect.objectContaining({ className: 'bg-fixed', keptGroupId: null }),
            ]))
        }
    })
})
