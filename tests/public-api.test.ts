import { expect, test } from 'vitest'

import {
    ClassNameValue,
    ClassValidator,
    Config,
    ConfigExtension,
    DefaultClassGroupIds,
    DefaultThemeGroupIds,
    createTailwindMerge,
    extendTailwindMerge,
    fromTheme,
    getDefaultConfig,
    mergeConfigs,
    twJoin,
    twMerge,
    validators,
} from '../src'

test('has correct export types', () => {
    expect(twMerge).toStrictEqual(expect.any(Function))
    expect(createTailwindMerge).toStrictEqual(expect.any(Function))
    expect(getDefaultConfig).toStrictEqual(expect.any(Function))
    expect(validators).toMatchObject({
        isAny: expect.any(Function),
        isAnyNonArbitrary: expect.any(Function),
        isArbitraryImage: expect.any(Function),
        isArbitraryLength: expect.any(Function),
        isArbitraryNumber: expect.any(Function),
        isArbitraryPosition: expect.any(Function),
        isArbitraryShadow: expect.any(Function),
        isArbitrarySize: expect.any(Function),
        isArbitraryValue: expect.any(Function),
        isArbitraryVariable: expect.any(Function),
        isArbitraryVariableFamilyName: expect.any(Function),
        isArbitraryVariableImage: expect.any(Function),
        isArbitraryVariableLength: expect.any(Function),
        isArbitraryVariablePosition: expect.any(Function),
        isArbitraryVariableShadow: expect.any(Function),
        isArbitraryVariableSize: expect.any(Function),
        isFraction: expect.any(Function),
        isInteger: expect.any(Function),
        isNumber: expect.any(Function),
        isPercent: expect.any(Function),
        isTshirtSize: expect.any(Function),
    })
    expect(Object.keys(validators)).toHaveLength(21)
    expect(mergeConfigs).toStrictEqual(expect.any(Function))
    expect(extendTailwindMerge).toStrictEqual(expect.any(Function))
    expect(twJoin).toStrictEqual(expect.any(Function))

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        const config: Config<DefaultClassGroupIds, DefaultThemeGroupIds> = getDefaultConfig()
        const classNameValue: ClassNameValue = 'some-class'
        const classValidator: ClassValidator = (value: string) => false

        twMerge(classNameValue, classNameValue, classNameValue)
        twJoin(classNameValue, classNameValue, classNameValue)

        return {
            config,
            classValidator,
        }
    }
})

test('twMerge() has correct inputs and outputs', () => {
    expect(twMerge('')).toStrictEqual(expect.any(String))
    expect(twMerge('hello world')).toStrictEqual(expect.any(String))
    expect(twMerge('-:-:-:::---h-')).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', '-:-:-:::---h-')).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', '-:-:-:::---h-', '', 'something')).toStrictEqual(
        expect.any(String),
    )
    expect(twMerge('hello world', undefined)).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', undefined, null)).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', undefined, null, false)).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', [undefined], [null, false])).toStrictEqual(expect.any(String))
    expect(twMerge('hello world', [undefined], [null, [false, 'some-class'], []])).toStrictEqual(
        expect.any(String),
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        // @ts-expect-error
        twMerge(123)
        // @ts-expect-error
        twMerge(true)
        // @ts-expect-error
        twMerge({})
        // @ts-expect-error
        twMerge(new Date())
        // @ts-expect-error
        twMerge(() => {})
    }
})

test('createTailwindMerge() has correct inputs and outputs', () => {
    expect(createTailwindMerge(getDefaultConfig)).toStrictEqual(expect.any(Function))
    expect(
        createTailwindMerge(() => ({
            cacheSize: 0,
            theme: {},
            classGroups: {},
            conflictingClassGroups: {},
            conflictingClassGroupModifiers: {},
            orderSensitiveModifiers: [],
        })),
    ).toStrictEqual(expect.any(Function))

    const tailwindMerge = createTailwindMerge(() => ({
        cacheSize: 20,
        theme: {},
        classGroups: {
            fooKey: [{ fooKey: ['bar', 'baz'] }],
            fooKey2: [{ fooKey: ['qux', 'quux'] }],
            otherKey: ['nother', 'group'],
        },
        conflictingClassGroups: {
            fooKey: ['otherKey'],
            otherKey: ['fooKey', 'fooKey2'],
        },
        conflictingClassGroupModifiers: {},
        orderSensitiveModifiers: [],
    }))

    expect(tailwindMerge).toStrictEqual(expect.any(Function))
    expect(tailwindMerge('')).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world')).toStrictEqual(expect.any(String))
    expect(tailwindMerge('-:-:-:::---h-')).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world', '-:-:-:::---h-')).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world', '-:-:-:::---h-', '', 'something')).toStrictEqual(
        expect.any(String),
    )
    expect(tailwindMerge('hello world', undefined)).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world', undefined, null)).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world', undefined, null, false)).toStrictEqual(expect.any(String))
    expect(tailwindMerge('hello world', [undefined], [null, false])).toStrictEqual(
        expect.any(String),
    )
    expect(
        tailwindMerge('hello world', [undefined], [null, [false, 'some-class'], []]),
    ).toStrictEqual(expect.any(String))

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        // @ts-expect-error
        tailwindMerge(123)
        // @ts-expect-error
        tailwindMerge(true)
        // @ts-expect-error
        tailwindMerge({})
        // @ts-expect-error
        tailwindMerge(new Date())
        // @ts-expect-error
        tailwindMerge(() => {})
    }
})

test('validators have correct inputs and outputs', () => {
    expect(validators.isFraction('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryLength('')).toEqual(expect.any(Boolean))
    expect(validators.isInteger('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryValue('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryVariable('')).toEqual(expect.any(Boolean))
    expect(validators.isAny()).toEqual(expect.any(Boolean))
    expect(validators.isTshirtSize('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitrarySize('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryPosition('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryImage('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryNumber('')).toEqual(expect.any(Boolean))
    expect(validators.isArbitraryShadow('')).toEqual(expect.any(Boolean))
})

test('mergeConfigs has correct inputs and outputs', () => {
    expect(
        mergeConfigs(
            {
                cacheSize: 50,
                theme: {},
                classGroups: {
                    fooKey: [{ fooKey: ['one', 'two'] }],
                    bla: [{ bli: ['blub', 'blublub'] }],
                },
                conflictingClassGroups: {},
                conflictingClassGroupModifiers: {},
                orderSensitiveModifiers: [],
            },
            {},
        ),
    ).toStrictEqual(expect.any(Object))
})

test('extendTailwindMerge has correct inputs and outputs', () => {
    expect(extendTailwindMerge({} satisfies ConfigExtension<string, string>)).toStrictEqual(
        expect.any(Function),
    )
})

test('fromTheme has correct inputs and outputs', () => {
    expect(fromTheme('spacing')).toStrictEqual(expect.any(Function))
    expect(fromTheme<string>('foo')).toStrictEqual(expect.any(Function))
    expect(fromTheme<string>('foo').isThemeGetter).toBe(true)
    expect(fromTheme<string>('foo')({ foo: ['hello'] })).toStrictEqual(['hello'])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noRun = () => {
        // @ts-expect-error
        fromTheme('custom-key')
        fromTheme<'custom-key'>('custom-key')
    }
})

test('twJoin has correct inputs and outputs', () => {
    expect(twJoin()).toStrictEqual(expect.any(String))
    expect(twJoin('')).toStrictEqual(expect.any(String))
    expect(twJoin('', [false, null, undefined, 0, [], [false, [''], '']])).toStrictEqual(
        expect.any(String),
    )
})
