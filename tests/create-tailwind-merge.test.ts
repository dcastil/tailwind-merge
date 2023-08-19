import { createTailwindMerge } from '../src'

test('createTailwindMerge works with single config function', () => {
    const tailwindMerge = createTailwindMerge(() => ({
        cacheSize: 20,
        separator: ':',
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
            separator: ':',
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
