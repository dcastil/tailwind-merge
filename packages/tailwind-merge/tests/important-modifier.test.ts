import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('merges tailwind classes with important modifier correctly', () => {
    expect(twMerge('font-medium! font-bold!')).toBe('font-bold!')
    expect(twMerge('font-medium! font-bold! font-thin')).toBe('font-bold! font-thin')
    expect(twMerge('right-2! -inset-x-px!')).toBe('-inset-x-px!')
    expect(twMerge('focus:inline! focus:block!')).toBe('focus:block!')
    expect(twMerge('[--my-var:20px]! [--my-var:30px]!')).toBe('[--my-var:30px]!')

    // Tailwind CSS v3 legacy syntax

    expect(twMerge('font-medium! !font-bold')).toBe('!font-bold')

    expect(twMerge('!font-medium !font-bold')).toBe('!font-bold')
    expect(twMerge('!font-medium !font-bold font-thin')).toBe('!font-bold font-thin')
    expect(twMerge('!right-2 !-inset-x-px')).toBe('!-inset-x-px')
    expect(twMerge('focus:!inline focus:!block')).toBe('focus:!block')
    expect(twMerge('![--my-var:20px] ![--my-var:30px]')).toBe('![--my-var:30px]')

    // Tailwind CSS v3 legacy syntax combined with a postfix modifier
    // The leading `!` must not shift the postfix modifier position, otherwise the part before
    // the slash resolves to no class group and the conflict is silently skipped.
    expect(twMerge('!text-lg/7 !text-sm')).toBe('!text-sm')
    expect(twMerge('!text-lg/7 !text-lg/9')).toBe('!text-lg/9')
    expect(twMerge('!text-lg/7 !text-sm/6')).toBe('!text-sm/6')
    expect(twMerge('!p-4/7 !p-2/9')).toBe('!p-2/9')
    expect(twMerge('!text-lg/[0/1] !text-sm')).toBe('!text-sm')
    expect(twMerge('!text-lg/7 font-medium!')).toBe('!text-lg/7 font-medium!')
})
