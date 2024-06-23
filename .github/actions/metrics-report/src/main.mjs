// @ts-check

import core from '@actions/core'
import { context } from '@actions/github'

import { getPackageSize } from './get-package-size.mjs'
import { setComment } from './set-comment.mjs'
import { checkoutBranch } from './utils.mjs'

run()

async function run() {
    const pullRequest = context.payload.pull_request

    if (!pullRequest) {
        throw Error('This action can only be run in a pull request')
    }

    core.info('Getting local package sizes')
    const localBundleSizes = await getPackageSize()
    logBundleSizes(localBundleSizes)

    await checkoutBranch(pullRequest.base.ref)

    core.info('Getting PR base package sizes')
    const baseBundleSizes = await getPackageSize({ shouldOmitFailures: true })
    logBundleSizes(baseBundleSizes)

    const commentBody = getBodyText([
        ['### Metrics report'],
        [`on commit ${pullRequest.head?.sha} at \`${new Date().toISOString()}\``],
        [getBundleSizeTable(localBundleSizes, baseBundleSizes)],
    ])

    await setComment(commentBody)
}

/**
 * @param {import('./get-package-size.mjs').OverallBundleSize[]} bundleSizes
 */
function logBundleSizes(bundleSizes) {
    core.info('Package sizes')

    bundleSizes.forEach(({ bundleSize, singleExportSizes }) => {
        logBundleSize(bundleSize)

        singleExportSizes?.forEach((singleExportSize) => {
            logBundleSize(singleExportSize, true)
        })
    })
}

/**
 * @param {import('./get-package-size.mjs').BundleSize} bundleSize
 * @param {boolean=} isIndented
 */
function logBundleSize(bundleSize, isIndented) {
    core.info(
        [
            [isIndented ? '    ' : '', bundleSize.label].join('').padEnd(30),
            [
                getSizeInKb(bundleSize.size),
                `${getSizeInKb(bundleSize.sizeMinified)} minified`,
                `${getSizeInKb(bundleSize.sizeBrotliCompressed)} brotli compressed`,
            ].join(' '),
        ].join(''),
    )
}

/**
 * @param {number} size
 */
function getSizeInKb(size) {
    return (size / 1024)
        .toLocaleString('en-GB', {
            style: 'unit',
            unit: 'kilobyte',
            unitDisplay: 'short',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        .padStart(14)
}

/**
 * @param {string[][]} paragraphs
 */
function getBodyText(paragraphs) {
    return paragraphs.map((lines) => lines.join('\n')).join('\n\n')
}

/**
 * @param {import('./get-package-size.mjs').OverallBundleSize[]} localBundleSizes
 * @param {import('./get-package-size.mjs').OverallBundleSize[]} baseBundleSizes
 */
function getBundleSizeTable(localBundleSizes, baseBundleSizes) {
    const baseBundleSizesMap = new Map(
        baseBundleSizes.map((bundleSize) => [bundleSize.bundleSize.label, bundleSize]),
    )

    return getTableHtml({
        headers: [
            'Export',
            'Size original',
            'Size minified',
            'Size minified and Brotli compressed',
        ],
        columnAlignments: ['left', 'center', 'center', 'center'],
        columnWidths: ['30%', '23.5%', '23.5%', '23.5%'],
        rows: localBundleSizes.flatMap(({ bundleSize, singleExportSizes }) => {
            const baseBundleSize = baseBundleSizesMap.get(bundleSize.label)

            const mainBundleRow = getBundleSizeRow(bundleSize, baseBundleSize?.bundleSize)

            if (singleExportSizes) {
                const baseBundleSizeMap = new Map(
                    baseBundleSize?.singleExportSizes?.map((bundleSize) => [
                        bundleSize.label,
                        bundleSize,
                    ]),
                )

                return [
                    mainBundleRow,
                    ...singleExportSizes.map((singleExportSize) => {
                        const baseBundleSize = baseBundleSizeMap.get(singleExportSize.label)
                        return getBundleSizeRow(singleExportSize, baseBundleSize, true)
                    }),
                ]
            }

            return [mainBundleRow]
        }),
    })
}

/**
 *
 * @param {import('./get-package-size.mjs').BundleSize} bundleSize
 * @param {import('./get-package-size.mjs').BundleSize=} baseBundleSize
 * @param {boolean=} isIndented
 */
function getBundleSizeRow(bundleSize, baseBundleSize, isIndented) {
    return [
        [isIndented ? '→ ' : '', '`', bundleSize.label, '`'].join('').padEnd(30),
        getBundleSizeDifference(bundleSize.size, baseBundleSize?.size),
        getBundleSizeDifference(bundleSize.sizeMinified, baseBundleSize?.sizeMinified),
        getBundleSizeDifference(
            bundleSize.sizeBrotliCompressed,
            baseBundleSize?.sizeBrotliCompressed,
        ),
    ]
}

/**
 *
 * @param {number} size
 * @param {number=} baseSize
 */
function getBundleSizeDifference(size, baseSize) {
    if (baseSize) {
        return getSizeInKb(size) + ' ' + getSizeDifference(size, baseSize)
    }

    return getSizeInKb(size)
}

/**
 * @param {number} size
 * @param {number} baseSize
 */
function getSizeDifference(size, baseSize) {
    const difference = size - baseSize
    const differencePercent = difference / baseSize
    const isZero = difference === 0
    const isPositive = difference > 0

    const percentageString = differencePercent.toLocaleString('en-GB', {
        style: 'percent',
        minimumFractionDigits: isZero ? 0 : 1,
        maximumFractionDigits: 1,
        signDisplay: 'exceptZero',
    })

    return percentageString + (isZero ? '' : isPositive ? ' 🔴' : ' 🟢')
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
function getTableHtml({ columnAlignments = [], columnWidths = [], headers, rows }) {
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
