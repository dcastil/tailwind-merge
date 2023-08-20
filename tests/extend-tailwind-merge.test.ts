import { extendTailwindMerge } from '../src'

test('extendTailwindMerge works correctly with single config', () => {
    const tailwindMerge = extendTailwindMerge<string>({
        cacheSize: 20,
        extend: {
            classGroups: {
                fooKey: [{ fooKey: ['bar', 'baz'] }],
                fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
                otherKey: ['nother', 'group'],
            },
            conflictingClassGroups: {
                fooKey: ['otherKey'],
                otherKey: ['fooKey', 'fooKey2'],
            },
        },
    })

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

    expect(tailwindMerge('p-10 p-20')).toBe('p-20')
    expect(tailwindMerge('hover:focus:p-10 focus:hover:p-20')).toBe('focus:hover:p-20')
})

test('extendTailwindMerge works corectly with multiple configs', () => {
    const tailwindMerge = extendTailwindMerge<string>(
        {
            cacheSize: 20,
            extend: {
                classGroups: {
                    fooKey: [{ fooKey: ['bar', 'baz'] }],
                    fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
                    otherKey: ['nother', 'group'],
                },
                conflictingClassGroups: {
                    fooKey: ['otherKey'],
                    otherKey: ['fooKey', 'fooKey2'],
                },
            },
        },
        (config) => ({
            ...config,
            classGroups: {
                ...config.classGroups,
                secondConfigKey: ['hi-there', 'hello'],
            },
        }),
    )

    expect(tailwindMerge('')).toBe('')
    expect(tailwindMerge('my-modifier:fooKey-bar my-modifier:fooKey-baz')).toBe(
        'my-modifier:fooKey-baz',
    )
    expect(tailwindMerge('other-modifier:hi-there other-modifier:hello')).toBe(
        'other-modifier:hello',
    )
    expect(tailwindMerge('group fooKey-bar')).toBe('fooKey-bar')
    expect(tailwindMerge('fooKey-bar group')).toBe('group')
    expect(tailwindMerge('group other-2')).toBe('group other-2')
    expect(tailwindMerge('other-2 group')).toBe('group')

    expect(tailwindMerge('p-10 p-20')).toBe('p-20')
    expect(tailwindMerge('hover:focus:p-10 focus:hover:p-20')).toBe('focus:hover:p-20')
})

test('extendTailwindMerge works correctly with function config', () => {
    const tailwindMerge = extendTailwindMerge((config) => ({
        ...config,
        cacheSize: 20,
        classGroups: {
            ...config.classGroups,
            fooKey: [{ fooKey: ['bar', 'baz'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }, 'other-2'],
            otherKey: ['nother', 'group'],
        },
        conflictingClassGroups: {
            ...config.conflictingClassGroups,
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
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

    expect(tailwindMerge('p-10 p-20')).toBe('p-20')
    expect(tailwindMerge('hover:focus:p-10 focus:hover:p-20')).toBe('focus:hover:p-20')
})

test('extendTailwindMerge overrides and extends correctly', () => {
    const tailwindMerge = extendTailwindMerge<string>({
        cacheSize: 20,
        override: {
            classGroups: {
                shadow: ['shadow-100', 'shadow-200'],
                customKey: ['custom-100'],
            },
            conflictingClassGroups: {
                p: ['px'],
            },
        },
        extend: {
            classGroups: {
                shadow: ['shadow-300'],
                customKey: ['custom-200'],
                'font-size': ['text-foo'],
            },
            conflictingClassGroups: {
                m: ['h'],
            },
        },
    })

    expect(tailwindMerge('shadow-lg shadow-100 shadow-200')).toBe('shadow-lg shadow-200')
    expect(tailwindMerge('custom-100 custom-200')).toBe('custom-200')
    expect(tailwindMerge('text-lg text-foo')).toBe('text-foo')
    expect(tailwindMerge('px-3 py-3 p-3')).toBe('py-3 p-3')
    expect(tailwindMerge('p-3 px-3 py-3')).toBe('p-3 px-3 py-3')
    expect(tailwindMerge('mx-2 my-2 h-2 m-2')).toBe('m-2')
    expect(tailwindMerge('m-2 mx-2 my-2 h-2')).toBe('m-2 mx-2 my-2 h-2')
})
