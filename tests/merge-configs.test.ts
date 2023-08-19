import { mergeConfigs } from '../src'

test('mergeConfigs has correct behavior', () => {
    expect(
        mergeConfigs(
            {
                cacheSize: 50,
                separator: ':',
                theme: {
                    hi: ['ho'],
                },
                classGroups: {
                    fooKey: [{ fooKey: ['one', 'two'] }],
                    bla: [{ bli: ['blub', 'blublub'] }],
                },
                conflictingClassGroups: {},
                conflictingClassGroupModifiers: {
                    hello: ['world'],
                },
            },
            {
                classGroups: {
                    fooKey: [{ fooKey: ['bar', 'baz'] }],
                    fooKey2: [{ fooKey: ['qux', 'quux'] }],
                    otherKey: ['nother', 'group'],
                },
                conflictingClassGroups: {
                    fooKey: ['otherKey'],
                    otherKey: ['fooKey', 'fooKey2'],
                },
                conflictingClassGroupModifiers: {
                    hello: ['world2'],
                },
            },
        ),
    ).toEqual({
        cacheSize: 50,
        separator: ':',
        theme: {
            hi: ['ho'],
        },
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
        conflictingClassGroupModifiers: {
            hello: ['world', 'world2'],
        },
    })
})
