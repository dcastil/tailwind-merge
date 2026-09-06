import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('handles color conflicts properly', () => {
    expect(twMerge('bg-grey-5 bg-hotpink')).toBe('bg-hotpink')
    expect(twMerge('hover:bg-grey-5 hover:bg-hotpink')).toBe('hover:bg-hotpink')
    expect(twMerge('stroke-[hsl(350_80%_0%)] stroke-[10px]')).toBe(
        'stroke-[hsl(350_80%_0%)] stroke-[10px]',
    )
})

test('handles color() functions with percentages correctly', () => {
    expect(twMerge('text-sm text-[color(display-p3_1_0_0/50%)]')).toBe(
        'text-sm text-[color(display-p3_1_0_0/50%)]',
    )
    expect(twMerge('text-[color(display-p3_1_0_0/50%)] text-sm')).toBe(
        'text-[color(display-p3_1_0_0/50%)] text-sm',
    )
    expect(twMerge('text-red-500 text-[color(display-p3_1_0_0/50%)]')).toBe(
        'text-[color(display-p3_1_0_0/50%)]',
    )
    expect(twMerge('text-[color(display-p3_1_0_0/50%)] text-red-500')).toBe('text-red-500')
    expect(twMerge('border-2 border-[color(display-p3_1_0_0/50%)]')).toBe(
        'border-2 border-[color(display-p3_1_0_0/50%)]',
    )
    expect(twMerge('border-[color(display-p3_1_0_0/50%)] border-2')).toBe(
        'border-[color(display-p3_1_0_0/50%)] border-2',
    )
    expect(twMerge('stroke-2 stroke-[color(display-p3_1_0_0/50%)]')).toBe(
        'stroke-2 stroke-[color(display-p3_1_0_0/50%)]',
    )
    expect(twMerge('stroke-[color(display-p3_1_0_0/50%)] stroke-2')).toBe(
        'stroke-[color(display-p3_1_0_0/50%)] stroke-2',
    )
})

test('handles light-dark() functions with percentages correctly', () => {
    expect(twMerge('text-sm text-[light-dark(white,rgb(0_0_0/50%))]')).toBe(
        'text-sm text-[light-dark(white,rgb(0_0_0/50%))]',
    )
    expect(twMerge('text-[light-dark(white,rgb(0_0_0/50%))] text-sm')).toBe(
        'text-[light-dark(white,rgb(0_0_0/50%))] text-sm',
    )
    expect(twMerge('text-red-500 text-[light-dark(white,rgb(0_0_0/50%))]')).toBe(
        'text-[light-dark(white,rgb(0_0_0/50%))]',
    )
    expect(twMerge('text-[light-dark(white,rgb(0_0_0/50%))] text-red-500')).toBe('text-red-500')
    expect(twMerge('border-2 border-[light-dark(white,rgb(0_0_0/50%))]')).toBe(
        'border-2 border-[light-dark(white,rgb(0_0_0/50%))]',
    )
    expect(twMerge('border-[light-dark(white,rgb(0_0_0/50%))] border-2')).toBe(
        'border-[light-dark(white,rgb(0_0_0/50%))] border-2',
    )
    expect(twMerge('stroke-2 stroke-[light-dark(white,rgb(0_0_0/50%))]')).toBe(
        'stroke-2 stroke-[light-dark(white,rgb(0_0_0/50%))]',
    )
    expect(twMerge('stroke-[light-dark(white,rgb(0_0_0/50%))] stroke-2')).toBe(
        'stroke-[light-dark(white,rgb(0_0_0/50%))] stroke-2',
    )
})
