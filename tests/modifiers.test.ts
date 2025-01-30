import { expect, test } from 'vitest'

import { createTailwindMerge, twMerge } from '../src'

test('conflicts across prefix modifiers', () => {
    expect(twMerge('hover:block hover:inline')).toBe('hover:inline')
    expect(twMerge('hover:block hover:focus:inline')).toBe('hover:block hover:focus:inline')
    expect(twMerge('hover:block hover:focus:inline focus:hover:inline')).toBe(
        'hover:block focus:hover:inline',
    )
    expect(twMerge('focus-within:inline focus-within:block')).toBe('focus-within:block')
})

test('conflicts across postfix modifiers', () => {
    expect(twMerge('text-lg/7 text-lg/8')).toBe('text-lg/8')
    expect(twMerge('text-lg/none leading-9')).toBe('text-lg/none leading-9')
    expect(twMerge('leading-9 text-lg/none')).toBe('text-lg/none')
    expect(twMerge('w-full w-1/2')).toBe('w-1/2')

    const customTwMerge = createTailwindMerge(() => ({
        cacheSize: 10,
        theme: {},
        classGroups: {
            foo: ['foo-1/2', 'foo-2/3'],
            bar: ['bar-1', 'bar-2'],
            baz: ['baz-1', 'baz-2'],
        },
        conflictingClassGroups: {},
        conflictingClassGroupModifiers: {
            baz: ['bar'],
        },
        orderSensitiveModifiers: [],
    }))

    expect(customTwMerge('foo-1/2 foo-2/3')).toBe('foo-2/3')
    expect(customTwMerge('bar-1 bar-2')).toBe('bar-2')
    expect(customTwMerge('bar-1 baz-1')).toBe('bar-1 baz-1')
    expect(customTwMerge('bar-1/2 bar-2')).toBe('bar-2')
    expect(customTwMerge('bar-2 bar-1/2')).toBe('bar-1/2')
    expect(customTwMerge('bar-1 baz-1/2')).toBe('baz-1/2')
})

test('sorts modifiers correctly', () => {
    expect(twMerge('c:d:e:block d:c:e:inline')).toBe('d:c:e:inline')
    expect(twMerge('*:before:block *:before:inline')).toBe('*:before:inline')
    expect(twMerge('*:before:block before:*:inline')).toBe('*:before:block before:*:inline')
    expect(twMerge('x:y:*:z:block y:x:*:z:inline')).toBe('y:x:*:z:inline')
})

test('sorts modifiers correctly according to orderSensitiveModifiers', () => {
    const customTwMerge = createTailwindMerge(() => ({
        cacheSize: 10,
        theme: {},
        classGroups: {
            foo: ['foo-1', 'foo-2'],
        },
        conflictingClassGroups: {},
        conflictingClassGroupModifiers: {},
        orderSensitiveModifiers: ['a', 'b'],
    }))

    expect(customTwMerge('c:d:e:foo-1 d:c:e:foo-2')).toBe('d:c:e:foo-2')
    expect(customTwMerge('a:b:foo-1 a:b:foo-2')).toBe('a:b:foo-2')
    expect(customTwMerge('a:b:foo-1 b:a:foo-2')).toBe('a:b:foo-1 b:a:foo-2')
    expect(customTwMerge('x:y:a:z:foo-1 y:x:a:z:foo-2')).toBe('y:x:a:z:foo-2')
})
