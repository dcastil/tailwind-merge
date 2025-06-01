/**
 * The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
 *
 * Specifically:
 * - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
 * - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
 *
 * Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
 */

export type ClassNameValue = ClassNameArray | string | null | undefined | 0 | 0n | false
type ClassNameArray = ClassNameValue[]

export function twJoin(...classLists: ClassNameValue[]): string
export function twJoin() {
    let index = 0
    let argument: ClassNameValue
    let resolvedValue: string
    let string = ''

    while (index < arguments.length) {
        if ((argument = arguments[index++])) {
            if ((resolvedValue = toValue(argument))) {
                string && (string += ' ')
                string += resolvedValue
            }
        }
    }
    return string
}

const toValue = (mix: ClassNameValue): string => {
    // Fast path for strings
    if (typeof mix === 'string') {
        return mix
    }

    // Early return for falsy values
    if (!mix) {
        return ''
    }

    // Iterative approach using a stack
    const stack: ClassNameValue[] = [mix]
    let string = ''

    while (stack.length > 0) {
        const current = stack.pop()

        if (!current) continue

        if (typeof current === 'string') {
            // Append string value
            if (string) string += ' '
            string += current
        } else if (Array.isArray(current)) {
            // Process array items in reverse order to maintain original order when popped
            for (let i = current.length - 1; i >= 0; i--) {
                if (current[i]) {
                    stack.push(current[i])
                }
            }
        }
    }

    return string
}
