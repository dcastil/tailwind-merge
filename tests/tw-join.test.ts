/**
 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
 *
 * Specifically:
 * - Tests from https://github.com/lukeed/clsx/blob/v1.2.1/test/index.js
 *
 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
 */

import { join } from '../src'

test('strings', () => {
    expect(join('')).toBe('')
    expect(join('foo')).toBe('foo')
    expect(join(true && 'foo')).toBe('foo')
    expect(join(false && 'foo')).toBe('')
})

test('strings (variadic)', () => {
    expect(join('')).toBe('')
    expect(join('foo', 'bar')).toBe('foo bar')
    expect(join(true && 'foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(join(false && 'foo', 'bar', 'baz', '')).toBe('bar baz')
})

test('arrays', () => {
    expect(join([])).toBe('')
    expect(join(['foo'])).toBe('foo')
    expect(join(['foo', 'bar'])).toBe('foo bar')
    expect(join(['foo', 0 && 'bar', 1 && 'baz'])).toBe('foo baz')
})

test('arrays (nested)', () => {
    expect(join([[[]]])).toBe('')
    expect(join([[['foo']]])).toBe('foo')
    expect(join([false, [['foo']]])).toBe('foo')
    expect(join(['foo', ['bar', ['', [['baz']]]]])).toBe('foo bar baz')
})

test('arrays (variadic)', () => {
    expect(join([], [])).toBe('')
    expect(join(['foo'], ['bar'])).toBe('foo bar')
    expect(join(['foo'], null, ['baz', ''], false, '', [])).toBe('foo baz')
})
