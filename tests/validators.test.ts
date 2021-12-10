import { validators } from '../src'

const { isLength, isCustomLength, isInteger, isCustomValue, isAny, isTshirtSize } = validators

describe('validators', () => {
    test('isLength', () => {
        expect(isLength('1')).toBe(true)
        expect(isLength('1023713')).toBe(true)
        expect(isLength('1.5')).toBe(true)
        expect(isLength('1231.503761')).toBe(true)
        expect(isLength('px')).toBe(true)
        expect(isLength('full')).toBe(true)
        expect(isLength('screen')).toBe(true)
        expect(isLength('1/2')).toBe(true)
        expect(isLength('123/345')).toBe(true)
        expect(isLength('[3.7%]')).toBe(true)
        expect(isLength('[481px]')).toBe(true)
        expect(isLength('[19.1rem]')).toBe(true)
        expect(isLength('[50vw]')).toBe(true)
        expect(isLength('[length:var(--custom)]')).toBe(true)

        expect(isLength('1d5')).toBe(false)
        expect(isLength('[1]')).toBe(false)
        expect(isLength('[12px')).toBe(false)
        expect(isLength('12px]')).toBe(false)
        expect(isLength('one')).toBe(false)
    })

    test('isCustomLength', () => {
        expect(isCustomLength('[3.7%]')).toBe(true)
        expect(isCustomLength('[481px]')).toBe(true)
        expect(isCustomLength('[19.1rem]')).toBe(true)
        expect(isCustomLength('[50vw]')).toBe(true)
        expect(isCustomLength('[length:var(--custom)]')).toBe(true)

        expect(isCustomLength('1')).toBe(false)
        expect(isCustomLength('3px')).toBe(false)
        expect(isCustomLength('1d5')).toBe(false)
        expect(isCustomLength('[1]')).toBe(false)
        expect(isCustomLength('[12px')).toBe(false)
        expect(isCustomLength('12px]')).toBe(false)
        expect(isCustomLength('one')).toBe(false)
    })

    test('isInteger', () => {
        expect(isInteger('1')).toBe(true)
        expect(isInteger('123')).toBe(true)
        expect(isInteger('8312')).toBe(true)
        expect(isInteger('[8312]')).toBe(true)
        expect(isInteger('[2]')).toBe(true)

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

    test('isCustomValue', () => {
        expect(isCustomValue('[1]')).toBe(true)
        expect(isCustomValue('[bla]')).toBe(true)
        expect(isCustomValue('[not-a-custom-value?]')).toBe(true)
        expect(isCustomValue('[auto,auto,minmax(0,1fr),calc(100vw-50%)]')).toBe(true)

        expect(isCustomValue('[]')).toBe(false)
        expect(isCustomValue('[1')).toBe(false)
        expect(isCustomValue('1]')).toBe(false)
        expect(isCustomValue('1')).toBe(false)
        expect(isCustomValue('one')).toBe(false)
        expect(isCustomValue('o[n]e')).toBe(false)
    })

    test('isAny', () => {
        expect(isAny()).toBe(true)
        // @ts-expect-error
        expect(isAny('')).toBe(true)
        // @ts-expect-error
        expect(isAny('something')).toBe(true)
    })

    test('isTshirtSize', () => {
        expect(isTshirtSize('xs')).toBe(true)
        expect(isTshirtSize('sm')).toBe(true)
        expect(isTshirtSize('md')).toBe(true)
        expect(isTshirtSize('lg')).toBe(true)
        expect(isTshirtSize('xl')).toBe(true)
        expect(isTshirtSize('2xl')).toBe(true)
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
})
