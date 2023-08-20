import { mergeConfigs } from '../src'

test('mergeConfigs has correct behavior', () => {
    expect(
        mergeConfigs(
            {
                cacheSize: 50,
                prefix: 'tw-',
                separator: ':',
                theme: {
                    hi: ['ho'],
                    themeToOverride: ['to-override'],
                },
                classGroups: {
                    fooKey: [{ fooKey: ['one', 'two'] }],
                    bla: [{ bli: ['blub', 'blublub'] }],
                    groupToOverride: ['this', 'will', 'be', 'overridden'],
                    groupToOverride2: ['this', 'will', 'not', 'be', 'overridden'],
                },
                conflictingClassGroups: {
                    toOverride: ['groupToOverride'],
                },
                conflictingClassGroupModifiers: {
                    hello: ['world'],
                    toOverride: ['groupToOverride-2'],
                },
            },
            {
                separator: '-',
                prefix: undefined,
                override: {
                    theme: {
                        themeToOverride: ['overridden'],
                    },
                    classGroups: {
                        groupToOverride: ['I', 'overrode', 'you'],
                        groupToOverride2: undefined!,
                    },
                    conflictingClassGroups: {
                        toOverride: ['groupOverridden'],
                    },
                    conflictingClassGroupModifiers: {
                        toOverride: ['overridden-2'],
                    },
                },
                extend: {
                    classGroups: {
                        fooKey: [{ fooKey: ['bar', 'baz'] }],
                        fooKey2: [{ fooKey: ['qux', 'quux'] }],
                        otherKey: ['nother', 'group'],
                        groupToOverride: ['extended'],
                    },
                    conflictingClassGroups: {
                        fooKey: ['otherKey'],
                        otherKey: ['fooKey', 'fooKey2'],
                    },
                    conflictingClassGroupModifiers: {
                        hello: ['world2'],
                    },
                },
            },
        ),
    ).toEqual({
        cacheSize: 50,
        prefix: 'tw-',
        separator: '-',
        theme: {
            hi: ['ho'],
            themeToOverride: ['overridden'],
        },
        classGroups: {
            fooKey: [{ fooKey: ['one', 'two'] }, { fooKey: ['bar', 'baz'] }],
            bla: [{ bli: ['blub', 'blublub'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }],
            otherKey: ['nother', 'group'],
            groupToOverride: ['I', 'overrode', 'you', 'extended'],
            groupToOverride2: ['this', 'will', 'not', 'be', 'overridden'],
        },
        conflictingClassGroups: {
            toOverride: ['groupOverridden'],
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
        conflictingClassGroupModifiers: {
            hello: ['world', 'world2'],
            toOverride: ['overridden-2'],
        },
    })
})
