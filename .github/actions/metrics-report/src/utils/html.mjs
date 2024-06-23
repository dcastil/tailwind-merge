// @ts-check

/**
 * @typedef {object} DetailsData
 * @property {string} summary
 * @property {string} content
 */

/**
 * @param {DetailsData} param0
 */
export function getDetails({ summary, content }) {
    return [`<details>`, `<summary>${summary}</summary>`, '', content, '', `</details>`].join('\n')
}

/**
 * @typedef {object} TableData
 * @property {('left' | 'center' | 'right' | undefined)[]=} columnAlignments
 * @property {(string | undefined)[]=} columnWidths
 * @property {string[]} headers
 * @property {string[][]} rows
 */

/**
 * @param {TableData} param0
 */
export function getTableHtml({ columnAlignments = [], columnWidths = [], headers, rows }) {
    return getHtml([
        {
            tag: 'table',
            children: [
                {
                    tag: 'thead',
                    children: [
                        {
                            tag: 'tr',
                            children: headers.map((header, headerIndex) => ({
                                tag: 'th',
                                attributes: {
                                    width: columnWidths[headerIndex],
                                    align: columnAlignments[headerIndex],
                                },
                                children: [header],
                            })),
                        },
                    ],
                },
                {
                    tag: 'tbody',
                    children: rows.map((row) => ({
                        tag: 'tr',
                        children: row.map((cell, cellIndex) => ({
                            tag: 'td',
                            attributes: {
                                align: columnAlignments[cellIndex],
                            },
                            children: [cell],
                        })),
                    })),
                },
            ],
        },
    ])
}

/**
 * @typedef {object} HtmlElement
 * @property {string} tag
 * @property {Record<string, string | undefined>=} attributes
 * @property {(HtmlElement | string)[]=} children
 */

/**
 * @param {(HtmlElement | string)[]} elements
 */
function getHtml(elements) {
    return indent(getHtmlLinesToIndent(elements))
}

/**
 * @typedef {(string | LinesToIndent)[]} LinesToIndent
 */

/**
 * @param {LinesToIndent} lines
 * @param {number=} level
 * @returns {string}
 */
function indent(lines, level = 0) {
    const indentation = ' '.repeat(level * 4)
    return lines
        .map((element) => {
            if (typeof element === 'string') {
                return indentation + element
            }

            return indent(element, level + 1)
        })
        .join('\n')
}

/**
 * @param {(HtmlElement | string)[]} elements
 * @returns {LinesToIndent}
 */
function getHtmlLinesToIndent(elements) {
    return elements.flatMap((element) => {
        if (typeof element === 'string') {
            return element
        }

        const attributes = Object.entries(element.attributes ?? {})
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ')
        const openingTag = `<${element.tag}${attributes ? ' ' + attributes : ''}>`
        const closingTag = `</${element.tag}>`
        const innerHtmlLines = element.children ? getHtmlLinesToIndent(element.children) : []

        if (innerHtmlLines.length === 0) {
            return [openingTag, closingTag]
        }

        return [openingTag, innerHtmlLines, closingTag]
    })
}
