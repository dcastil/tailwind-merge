import { expect, test } from 'vitest'

import { validators } from '../src'

const {
    isAny,
    isAnyNonArbitrary,
    isArbitraryImage,
    isArbitraryLength,
    isArbitraryNumber,
    isArbitraryPosition,
    isArbitraryShadow,
    isArbitrarySize,
    isArbitraryValue,
    isArbitraryVariable,
    isArbitraryVariableFamilyName,
    isArbitraryVariableImage,
    isArbitraryVariableLength,
    isArbitraryVariablePosition,
    isArbitraryVariableShadow,
    isArbitraryVariableSize,
    isFraction,
    isInteger,
    isNumber,
    isPercent,
    isTshirtSize,
} = validators

test('isAny', () => {
    expect(isAny()).toBe(true)
    // @ts-expect-error
    expect(isAny('')).toBe(true)
    // @ts-expect-error
    expect(isAny('something')).toBe(true)
})

test('isAnyNonArbitrary', () => {
    expect(isAnyNonArbitrary('test')).toBe(true)
    expect(isAnyNonArbitrary('1234-hello-world')).toBe(true)
    expect(isAnyNonArbitrary('[hello')).toBe(true)
    expect(isAnyNonArbitrary('hello]')).toBe(true)
    expect(isAnyNonArbitrary('[)')).toBe(true)
    expect(isAnyNonArbitrary('(hello]')).toBe(true)

    expect(isAnyNonArbitrary('[test]')).toBe(false)
    expect(isAnyNonArbitrary('[label:test]')).toBe(false)
    expect(isAnyNonArbitrary('(test)')).toBe(false)
    expect(isAnyNonArbitrary('(label:test)')).toBe(false)
})

test('isArbitraryImage', () => {
    expect(isArbitraryImage('[url:var(--my-url)]')).toBe(true)
    expect(isArbitraryImage('[url(something)]')).toBe(true)
    expect(isArbitraryImage('[url:bla]')).toBe(true)
    expect(isArbitraryImage('[image:bla]')).toBe(true)
    expect(isArbitraryImage('[linear-gradient(something)]')).toBe(true)
    expect(isArbitraryImage('[repeating-conic-gradient(something)]')).toBe(true)

    expect(isArbitraryImage('[var(--my-url)]')).toBe(false)
    expect(isArbitraryImage('[bla]')).toBe(false)
    expect(isArbitraryImage('url:2px')).toBe(false)
    expect(isArbitraryImage('url(2px)')).toBe(false)
})

test('isArbitraryLength', () => {
    expect(isArbitraryLength('[3.7%]')).toBe(true)
    expect(isArbitraryLength('[481px]')).toBe(true)
    expect(isArbitraryLength('[19.1rem]')).toBe(true)
    expect(isArbitraryLength('[50vw]')).toBe(true)
    expect(isArbitraryLength('[56vh]')).toBe(true)
    expect(isArbitraryLength('[length:var(--arbitrary)]')).toBe(true)

    expect(isArbitraryLength('1')).toBe(false)
    expect(isArbitraryLength('3px')).toBe(false)
    expect(isArbitraryLength('1d5')).toBe(false)
    expect(isArbitraryLength('[1]')).toBe(false)
    expect(isArbitraryLength('[12px')).toBe(false)
    expect(isArbitraryLength('12px]')).toBe(false)
    expect(isArbitraryLength('one')).toBe(false)
})

test('isArbitraryNumber', () => {
    expect(isArbitraryNumber('[number:black]')).toBe(true)
    expect(isArbitraryNumber('[number:bla]')).toBe(true)
    expect(isArbitraryNumber('[number:230]')).toBe(true)
    expect(isArbitraryNumber('[450]')).toBe(true)

    expect(isArbitraryNumber('[2px]')).toBe(false)
    expect(isArbitraryNumber('[bla]')).toBe(false)
    expect(isArbitraryNumber('[black]')).toBe(false)
    expect(isArbitraryNumber('black')).toBe(false)
    expect(isArbitraryNumber('450')).toBe(false)
})

test('isArbitraryPosition', () => {
    expect(isArbitraryPosition('[position:2px]')).toBe(true)
    expect(isArbitraryPosition('[position:bla]')).toBe(true)
    expect(isArbitraryPosition('[percentage:bla]')).toBe(true)

    expect(isArbitraryPosition('[2px]')).toBe(false)
    expect(isArbitraryPosition('[bla]')).toBe(false)
    expect(isArbitraryPosition('position:2px')).toBe(false)
})

test('isArbitraryShadow', () => {
    expect(isArbitraryShadow('[0_35px_60px_-15px_rgba(0,0,0,0.3)]')).toBe(true)
    expect(isArbitraryShadow('[inset_0_1px_0,inset_0_-1px_0]')).toBe(true)
    expect(isArbitraryShadow('[0_0_#00f]')).toBe(true)
    expect(isArbitraryShadow('[.5rem_0_rgba(5,5,5,5)]')).toBe(true)
    expect(isArbitraryShadow('[-.5rem_0_#123456]')).toBe(true)
    expect(isArbitraryShadow('[0.5rem_-0_#123456]')).toBe(true)
    expect(isArbitraryShadow('[0.5rem_-0.005vh_#123456]')).toBe(true)
    expect(isArbitraryShadow('[0.5rem_-0.005vh]')).toBe(true)

    expect(isArbitraryShadow('[rgba(5,5,5,5)]')).toBe(false)
    expect(isArbitraryShadow('[#00f]')).toBe(false)
    expect(isArbitraryShadow('[something-else]')).toBe(false)
})

test('isArbitrarySize', () => {
    expect(isArbitrarySize('[size:2px]')).toBe(true)
    expect(isArbitrarySize('[size:bla]')).toBe(true)
    expect(isArbitrarySize('[length:bla]')).toBe(true)

    expect(isArbitrarySize('[2px]')).toBe(false)
    expect(isArbitrarySize('[bla]')).toBe(false)
    expect(isArbitrarySize('size:2px')).toBe(false)
    expect(isArbitrarySize('[percentage:bla]')).toBe(false)
})

test('isArbitraryValue', () => {
    expect(isArbitraryValue('[1]')).toBe(true)
    expect(isArbitraryValue('[bla]')).toBe(true)
    expect(isArbitraryValue('[not-an-arbitrary-value?]')).toBe(true)
    expect(isArbitraryValue('[auto,auto,minmax(0,1fr),calc(100vw-50%)]')).toBe(true)

    expect(isArbitraryValue('[]')).toBe(false)
    expect(isArbitraryValue('[1')).toBe(false)
    expect(isArbitraryValue('1]')).toBe(false)
    expect(isArbitraryValue('1')).toBe(false)
    expect(isArbitraryValue('one')).toBe(false)
    expect(isArbitraryValue('o[n]e')).toBe(false)
})

test('isArbitraryVariable', () => {
    expect(isArbitraryVariable('(1)')).toBe(true)
    expect(isArbitraryVariable('(bla)')).toBe(true)
    expect(isArbitraryVariable('(not-an-arbitrary-value?)')).toBe(true)
    expect(isArbitraryVariable('(--my-arbitrary-variable)')).toBe(true)
    expect(isArbitraryVariable('(label:--my-arbitrary-variable)')).toBe(true)

    expect(isArbitraryVariable('()')).toBe(false)
    expect(isArbitraryVariable('(1')).toBe(false)
    expect(isArbitraryVariable('1)')).toBe(false)
    expect(isArbitraryVariable('1')).toBe(false)
    expect(isArbitraryVariable('one')).toBe(false)
    expect(isArbitraryVariable('o(n)e')).toBe(false)
})

test('isArbitraryVariableFamilyName', () => {
    expect(isArbitraryVariableFamilyName('(family-name:test)')).toBe(true)

    expect(isArbitraryVariableFamilyName('(other:test)')).toBe(false)
    expect(isArbitraryVariableFamilyName('(test)')).toBe(false)
    expect(isArbitraryVariableFamilyName('family-name:test')).toBe(false)
})

test('isArbitraryVariableImage', () => {
    expect(isArbitraryVariableImage('(image:test)')).toBe(true)
    expect(isArbitraryVariableImage('(url:test)')).toBe(true)

    expect(isArbitraryVariableImage('(other:test)')).toBe(false)
    expect(isArbitraryVariableImage('(test)')).toBe(false)
    expect(isArbitraryVariableImage('image:test')).toBe(false)
})

test('isArbitraryVariableLength', () => {
    expect(isArbitraryVariableLength('(length:test)')).toBe(true)

    expect(isArbitraryVariableLength('(other:test)')).toBe(false)
    expect(isArbitraryVariableLength('(test)')).toBe(false)
    expect(isArbitraryVariableLength('length:test')).toBe(false)
})

test('isArbitraryVariablePosition', () => {
    expect(isArbitraryVariablePosition('(position:test)')).toBe(true)

    expect(isArbitraryVariablePosition('(other:test)')).toBe(false)
    expect(isArbitraryVariablePosition('(test)')).toBe(false)
    expect(isArbitraryVariablePosition('position:test')).toBe(false)
    expect(isArbitraryVariablePosition('percentage:test')).toBe(false)
})

test('isArbitraryVariableShadow', () => {
    expect(isArbitraryVariableShadow('(shadow:test)')).toBe(true)
    expect(isArbitraryVariableShadow('(test)')).toBe(true)

    expect(isArbitraryVariableShadow('(other:test)')).toBe(false)
    expect(isArbitraryVariableShadow('shadow:test')).toBe(false)
})

test('isArbitraryVariableSize', () => {
    expect(isArbitraryVariableSize('(size:test)')).toBe(true)
    expect(isArbitraryVariableSize('(length:test)')).toBe(true)

    expect(isArbitraryVariableSize('(other:test)')).toBe(false)
    expect(isArbitraryVariableSize('(test)')).toBe(false)
    expect(isArbitraryVariableSize('size:test')).toBe(false)
    expect(isArbitraryVariableSize('(percentage:test)')).toBe(false)
})

test('isFraction', () => {
    expect(isFraction('1/2')).toBe(true)
    expect(isFraction('123/209')).toBe(true)
    expect(isFraction('1')).toBe(false)
    expect(isFraction('1/2/3')).toBe(false)
    expect(isFraction('[1/2]')).toBe(false)
})

test('isInteger', () => {
    expect(isInteger('1')).toBe(true)
    expect(isInteger('123')).toBe(true)
    expect(isInteger('8312')).toBe(true)

    expect(isInteger('[8312]')).toBe(false)
    expect(isInteger('[2]')).toBe(false)
    expect(isInteger('[8312px]')).toBe(false)
    expect(isInteger('[8312%]')).toBe(false)
    expect(isInteger('[8312rem]')).toBe(false)
    expect(isInteger('8312.2')).toBe(false)
    expect(isInteger('1.2')).toBe(false)
    expect(isInteger('one')).toBe(false)
    expect(isInteger('1/2')).toBe(false)
    expect(isInteger('1%')).toBe(false)
    expect(isInteger('1px')).toBe(false)
})

test('isNumber', () => {
    expect(isNumber('1')).toBe(true)
    expect(isNumber('123')).toBe(true)
    expect(isNumber('8312')).toBe(true)
    expect(isNumber('8312.2')).toBe(true)
    expect(isNumber('1.2')).toBe(true)

    expect(isNumber('[8312]')).toBe(false)
    expect(isNumber('[2]')).toBe(false)
    expect(isNumber('[8312px]')).toBe(false)
    expect(isNumber('[8312%]')).toBe(false)
    expect(isNumber('[8312rem]')).toBe(false)
    expect(isNumber('one')).toBe(false)
    expect(isNumber('1/2')).toBe(false)
    expect(isNumber('1%')).toBe(false)
    expect(isNumber('1px')).toBe(false)
})

test('isPercent', () => {
    expect(isPercent('1%')).toBe(true)
    expect(isPercent('100.001%')).toBe(true)
    expect(isPercent('.01%')).toBe(true)
    expect(isPercent('0%')).toBe(true)

    expect(isPercent('0')).toBe(false)
    expect(isPercent('one%')).toBe(false)
})

test('isTshirtSize', () => {
    expect(isTshirtSize('xs')).toBe(true)
    expect(isTshirtSize('sm')).toBe(true)
    expect(isTshirtSize('md')).toBe(true)
    expect(isTshirtSize('lg')).toBe(true)
    expect(isTshirtSize('xl')).toBe(true)
    expect(isTshirtSize('2xl')).toBe(true)
    expect(isTshirtSize('2.5xl')).toBe(true)
    expect(isTshirtSize('10xl')).toBe(true)
    expect(isTshirtSize('2xs')).toBe(true)
    expect(isTshirtSize('2lg')).toBe(true)

    expect(isTshirtSize('')).toBe(false)
    expect(isTshirtSize('hello')).toBe(false)
    expect(isTshirtSize('1')).toBe(false)
    expect(isTshirtSize('xl3')).toBe(false)
    expect(isTshirtSize('2xl3')).toBe(false)
    expect(isTshirtSize('-xl')).toBe(false)
    expect(isTshirtSize('[sm]')).toBe(false)
})
