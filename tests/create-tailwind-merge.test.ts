import { createTailwindMerge } from '../src'

test('createTailwindMerge() works with single config function', () => {
    const tailwindMerge = createTailwindMerge(() => ({
        cacheSize: 20,
        prefixes: ['my-prefix'],
        classGroups: {
            fooKey: [{ fooKey: ['bar', 'baz'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
            otherKey: ['nother', 'group'],
        },
        conflictingClassGroups: {
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
    }))

    expect(tailwindMerge('')).toBe('')
    expect(tailwindMerge('my-prefix:fooKey-bar my-prefix:fooKey-baz')).toBe('my-prefix:fooKey-baz')
    expect(tailwindMerge('other-prefix:fooKey-bar other-prefix:fooKey-baz')).toBe(
        'other-prefix:fooKey-bar other-prefix:fooKey-baz'
    )
    expect(tailwindMerge('group fooKey-bar')).toBe('fooKey-bar')
    expect(tailwindMerge('fooKey-bar group')).toBe('group')
    expect(tailwindMerge('group other-2')).toBe('group other-2')
    expect(tailwindMerge('other-2 group')).toBe('group')
})

test('createTailwindMerge() works with multiple config functions', () => {
    const tailwindMerge = createTailwindMerge(
        () => ({
            cacheSize: 20,
            prefixes: ['my-prefix'],
            classGroups: {
                fooKey: [{ fooKey: ['bar', 'baz'] }],
                fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
                otherKey: ['nother', 'group'],
            },
            conflictingClassGroups: {
                fooKey: ['otherKey'],
                otherKey: ['fooKey', 'fooKey2'],
            },
        }),
        (getConfig) => {
            const config = getConfig()
            return {
                ...config,
                prefixes: [...config.prefixes, 'second'],
                classGroups: {
                    ...config.classGroups,
                    helloFromSecondConfig: ['hello-there'],
                },
                conflictingClassGroups: {
                    ...config.conflictingClassGroups,
                    fooKey: [
                        ...(config.conflictingClassGroups.fooKey ?? []),
                        'helloFromSecondConfig',
                    ],
                },
            }
        }
    )

    expect(tailwindMerge('')).toBe('')
    expect(tailwindMerge('my-prefix:fooKey-bar my-prefix:fooKey-baz')).toBe('my-prefix:fooKey-baz')
    expect(tailwindMerge('other-prefix:fooKey-bar other-prefix:fooKey-baz')).toBe(
        'other-prefix:fooKey-bar other-prefix:fooKey-baz'
    )
    expect(tailwindMerge('group fooKey-bar')).toBe('fooKey-bar')
    expect(tailwindMerge('fooKey-bar group')).toBe('group')
    expect(tailwindMerge('group other-2')).toBe('group other-2')
    expect(tailwindMerge('other-2 group')).toBe('group')

    expect(tailwindMerge('second:group second:nother')).toBe('second:nother')
    expect(tailwindMerge('fooKey-bar hello-there')).toBe('fooKey-bar hello-there')
    expect(tailwindMerge('hello-there fooKey-bar')).toBe('fooKey-bar')
})
