import { expect, test } from 'vitest'

import { createTailwindMerge, getDefaultConfig } from '../src'

test('class lists too short to contain two classes are returned as-is without parsing or caching', () => {
    let parseCount = 0
    const tailwindMerge = createTailwindMerge(() => ({
        ...getDefaultConfig(),
        cacheSize: 10,
        experimentalParseClassName: ({ className, parseClassName }) => {
            parseCount++
            return parseClassName(className)
        },
    }))

    // Short single-class calls are returned as-is without parsing
    expect(tailwindMerge('m-1')).toBe('m-1')
    expect(tailwindMerge('m-1')).toBe('m-1')
    expect(parseCount).toBe(0)

    // Whitespace is normalized via the merge, but not cached
    expect(tailwindMerge(' m-1 ')).toBe('m-1')
    expect(tailwindMerge(' m-1 ')).toBe('m-1')
    expect(parseCount).toBe(2)

    // Multi-class lists are parsed once, then served from cache
    const parseCountBeforeMultiClassCall = parseCount
    tailwindMerge('m-1 m-2')
    expect(parseCount).toBe(parseCountBeforeMultiClassCall + 2)
    tailwindMerge('m-1 m-2')
    expect(parseCount).toBe(parseCountBeforeMultiClassCall + 2)

    // Longer single-class lists are still parsed and cached
    const parseCountBeforeLongSingleClassCall = parseCount
    tailwindMerge('bg-red-500')
    expect(parseCount).toBe(parseCountBeforeLongSingleClassCall + 1)
    tailwindMerge('bg-red-500')
    expect(parseCount).toBe(parseCountBeforeLongSingleClassCall + 1)
})

test('createTailwindMerge works with single config function', () => {
    const tailwindMerge = createTailwindMerge(() => ({
        cacheSize: 20,
        theme: {},
        classGroups: {
            fooKey: [{ fooKey: ['bar', 'baz'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
            otherKey: ['nother', 'group'],
        },
        conflictingClassGroups: {
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
        conflictingClassGroupModifiers: {},
        orderSensitiveModifiers: [],
    }))

    expect(tailwindMerge('')).toBe('')
    expect(tailwindMerge('my-modifier:fooKey-bar my-modifier:fooKey-baz')).toBe(
        'my-modifier:fooKey-baz',
    )
    expect(tailwindMerge('other-modifier:fooKey-bar other-modifier:fooKey-baz')).toBe(
        'other-modifier:fooKey-baz',
    )
    expect(tailwindMerge('group fooKey-bar')).toBe('fooKey-bar')
    expect(tailwindMerge('fooKey-bar group')).toBe('group')
    expect(tailwindMerge('group other-2')).toBe('group other-2')
    expect(tailwindMerge('other-2 group')).toBe('group')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        createTailwindMerge(
            // @ts-expect-error
            (config: any) => {
                return config
            },
        )
    }
})

test('createTailwindMerge works with multiple config functions', () => {
    const tailwindMerge = createTailwindMerge(
        () => ({
            cacheSize: 20,
            theme: {},
            classGroups: {
                fooKey: [{ fooKey: ['bar', 'baz'] }],
                fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
                otherKey: ['nother', 'group'],
            },
            conflictingClassGroups: {
                fooKey: ['otherKey'],
                otherKey: ['fooKey', 'fooKey2'],
            },
            conflictingClassGroupModifiers: {},
            orderSensitiveModifiers: [],
        }),
        (config) => ({
            ...config,
            classGroups: {
                ...config.classGroups,
                helloFromSecondConfig: ['hello-there'],
            },
            conflictingClassGroups: {
                ...config.conflictingClassGroups,
                fooKey: [...(config.conflictingClassGroups.fooKey ?? []), 'helloFromSecondConfig'],
            },
        }),
    )

    expect(tailwindMerge('')).toBe('')
    expect(tailwindMerge('my-modifier:fooKey-bar my-modifier:fooKey-baz')).toBe(
        'my-modifier:fooKey-baz',
    )
    expect(tailwindMerge('other-modifier:fooKey-bar other-modifier:fooKey-baz')).toBe(
        'other-modifier:fooKey-baz',
    )
    expect(tailwindMerge('group fooKey-bar')).toBe('fooKey-bar')
    expect(tailwindMerge('fooKey-bar group')).toBe('group')
    expect(tailwindMerge('group other-2')).toBe('group other-2')
    expect(tailwindMerge('other-2 group')).toBe('group')

    expect(tailwindMerge('second:group second:nother')).toBe('second:nother')
    expect(tailwindMerge('fooKey-bar hello-there')).toBe('fooKey-bar hello-there')
    expect(tailwindMerge('hello-there fooKey-bar')).toBe('fooKey-bar')
})
