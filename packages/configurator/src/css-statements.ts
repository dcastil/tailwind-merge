/**
 * Reads active CSS statements and block headers for build-time inspection without interpreting their contents. Comments cannot introduce directives, and quoted text and function arguments cannot end a statement or open a block. Sharing this between source scanning and root discovery keeps both integrations' view of active directives consistent.
 * Unlike declaration analysis of compiled CSS, discovery must tolerate unfinished edits so generation can select the entrypoint and report its error through the normal recovery path.
 */
export function* cssStatements(css: string): Generator<string> {
    let statement = ''
    let quote = ''
    let parenDepth = 0
    for (let index = 0; index < css.length; index++) {
        const character = css[index]!
        if (character === '\\') {
            statement += css.slice(index, index + 2)
            index += 1
            continue
        }
        if (quote) {
            statement += character
            if (character === quote) {
                quote = ''
            }
            continue
        }
        if (character === '/' && css[index + 1] === '*') {
            const end = css.indexOf('*/', index + 2)
            index = end === -1 ? css.length : end + 1
            statement += ' '
            continue
        }
        if (character === '"' || character === "'") {
            quote = character
        } else if (character === '(') {
            parenDepth += 1
        } else if (character === ')') {
            parenDepth -= 1
        } else if (
            parenDepth === 0 &&
            (character === ';' || character === '{' || character === '}')
        ) {
            if (statement.trim() !== '') {
                yield statement.trim()
            }
            statement = ''
            continue
        }
        statement += character
    }
    if (statement.trim() !== '') {
        yield statement.trim()
    }
}

/**
 * Splits at a separator that sits outside any parentheses, brackets, braces, and quotes (Tailwind's `segment`), so `a(b,c),d` splits into two parts at the top-level comma and quoted separators stay put.
 */
export function segment(input: string, separator: string): string[] {
    const parts: string[] = []
    const stack: string[] = []
    let last = 0

    for (let index = 0; index < input.length; index++) {
        const character = input[index]!

        if (stack.length === 0 && character === separator) {
            parts.push(input.slice(last, index))
            last = index + 1
            continue
        }

        switch (character) {
            case '\\':
                index += 1
                break
            case '"':
            case "'":
                // Quoted content is opaque until the matching quote.
                while (++index < input.length) {
                    if (input[index] === '\\') {
                        index += 1
                    } else if (input[index] === character) {
                        break
                    }
                }
                break
            case '(':
                stack.push(')')
                break
            case '[':
                stack.push(']')
                break
            case '{':
                stack.push('}')
                break
            case ')':
            case ']':
            case '}':
                if (stack.length > 0 && stack[stack.length - 1] === character) {
                    stack.pop()
                }
                break
        }
    }

    parts.push(input.slice(last))
    return parts
}
