import { extendTailwindMerge, fromTheme, getDefaultConfig, mergeConfigs } from '../src'
import { GenericConfig } from '../src/lib/types'

test('extendTailwindMerge type generics work correctly', () => {
    const tailwindMerge1 = extendTailwindMerge({
        extend: {
            theme: {
                spacing: ['my-space'],
                // @ts-expect-error
                plll: ['something'],
            },
            classGroups: {
                px: ['px-foo'],
                // @ts-expect-error
                pxx: ['pxx-foo'],
            },
            conflictingClassGroups: {
                px: ['p'],
                // @ts-expect-error
                pxx: ['p'],
            },
            conflictingClassGroupModifiers: {
                p: [
                    'px',
                    // @ts-expect-error
                    'prr',
                ],
            },
        },
    })

    expect(tailwindMerge1('')).toBe('')

    const tailwindMerge2 = extendTailwindMerge<'test1' | 'test2', 'test3'>({
        extend: {
            theme: {
                spacing: ['my-space'],
                // @ts-expect-error
                plll: ['something'],
                test3: ['bar'],
            },
            classGroups: {
                px: ['px-foo'],
                // @ts-expect-error
                pxx: ['pxx-foo'],
                test1: ['foo'],
                test2: ['bar'],
            },
            conflictingClassGroups: {
                px: ['p'],
                // @ts-expect-error
                pxx: ['p'],
                test1: ['test2'],
            },
            conflictingClassGroupModifiers: {
                p: [
                    'px',
                    // @ts-expect-error
                    'prr',
                    'test2',
                    'test1',
                ],
                test1: ['test2'],
            },
        },
    })

    expect(tailwindMerge2('')).toBe('')

    const tailwindMerge3 = extendTailwindMerge((v: GenericConfig) => v, getDefaultConfig)

    expect(tailwindMerge3('')).toBe('')
})

test('fromTheme type generics work correctly', () => {
    expect(fromTheme<'test4'>('test4')).toEqual(expect.any(Function))

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        fromTheme('spacing')
        fromTheme<'test5' | 'test6'>('test6')
        fromTheme<string>('anything')
        fromTheme<never, 'only-this'>('only-this')
        fromTheme<'or-this', 'only-this'>('or-this' as 'only-this' | 'or-this')

        // @ts-expect-error
        fromTheme('test5')
        // @ts-expect-error
        fromTheme('test5' | 'spacing')
        // @ts-expect-error
        fromTheme<never, 'only-this'>('something-else')
        // @ts-expect-error
        fromTheme<never, 'only-this'>('something-else' | 'only-this')
    }
})

test('mergeConfigs type generics work correctly', () => {
    const config1 = mergeConfigs<'foo' | 'bar', 'baz'>(
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
                    baz: [],
                    // @ts-expect-error
                    nope: [],
                },
                classGroups: {
                    foo: [],
                    bar: [],
                    // @ts-expect-error
                    hiii: [],
                },
                conflictingClassGroups: {
                    foo: [
                        'bar',
                        // @ts-expect-error
                        'lol',
                    ],
                },
                conflictingClassGroupModifiers: {
                    bar: ['foo'],
                    // @ts-expect-error
                    lel: ['foo'],
                },
            },
            extend: {
                classGroups: {
                    foo: [],
                    bar: [],
                    // @ts-expect-error
                    hiii: [],
                },
                conflictingClassGroups: {
                    foo: [
                        'bar',
                        // @ts-expect-error
                        'lol',
                    ],
                },
                conflictingClassGroupModifiers: {
                    bar: ['foo'],
                    // @ts-expect-error
                    lel: ['foo'],
                },
            },
        },
    )

    expect(config1).toEqual(expect.any(Object))

    const config2 = mergeConfigs<'very', 'strict'>(getDefaultConfig(), {})

    expect(config2).toEqual(expect.any(Object))

    const config3 = mergeConfigs<'single-arg'>(getDefaultConfig(), {})

    expect(config3).toEqual(expect.any(Object))
})
