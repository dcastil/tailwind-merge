/**
 * Reads active CSS statements and block headers for build-time inspection without interpreting their contents. Comments cannot introduce directives, and quoted text and function arguments cannot end a statement or open a block. Sharing this between source scanning and root discovery keeps both integrations' view of active directives consistent.
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
