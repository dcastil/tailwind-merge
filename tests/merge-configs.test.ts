import { mergeConfigs } from '../src'

test('mergeConfigs has correct behavior', () => {
    expect(
        mergeConfigs(
            {
                cacheSize: 50,
                prefixes: ['my-prefix'],
                classGroups: {
                    fooKey: [{ fooKey: ['one', 'two'] }],
                    bla: [{ bli: ['blub', 'blublub'] }],
                },
                conflictingClassGroups: {},
            },
            {
                prefixes: ['my-prefix-2'],
                classGroups: {
                    fooKey: [{ fooKey: ['bar', 'baz'] }],
                    fooKey2: [{ fooKey: ['qux', 'quux'] }],
                    otherKey: ['nother', 'group'],
                },
                conflictingClassGroups: {
                    fooKey: ['otherKey'],
                    otherKey: ['fooKey', 'fooKey2'],
                },
            }
        )
    ).toEqual({
        cacheSize: 50,
        prefixes: ['my-prefix', 'my-prefix-2'],
        classGroups: {
            fooKey: [{ fooKey: ['one', 'two'] }, { fooKey: ['bar', 'baz'] }],
            bla: [{ bli: ['blub', 'blublub'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }],
            otherKey: ['nother', 'group'],
        },
        conflictingClassGroups: {
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
    })
})
