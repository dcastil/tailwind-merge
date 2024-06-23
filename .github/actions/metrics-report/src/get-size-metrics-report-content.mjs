// @ts-check

import { getDetails, getTableHtml, nonBreaking } from './utils/html.mjs'

/**
 * @param {import('./get-package-size.mjs').EntryPointSize[]} entryPointSizesHead
 * @param {import('./get-package-size.mjs').EntryPointSize[]} entryPointSizesBase
 */
export function getSizeMetricsReportContent(entryPointSizesHead, entryPointSizesBase) {
    const entryPointSizeMetrics = getEntryPointSizeMetrics(entryPointSizesHead, entryPointSizesBase)

    const entryPointSizeChanges = entryPointSizeMetrics
        .filter(({ bundleSize, singleExportSizes }) => {
            return hasBundleSizeChange(bundleSize) || singleExportSizes?.some(hasBundleSizeChange)
        })
        .map((entryPointSizeMetrics) => {
            if (!entryPointSizeMetrics.singleExportSizes) {
                return entryPointSizeMetrics
            }

            return {
                ...entryPointSizeMetrics,
                singleExportSizes:
                    entryPointSizeMetrics.singleExportSizes.filter(hasBundleSizeChange),
            }
        })

    return [
        '### Size',
        entryPointSizeChanges.length
            ? getTableHtmlForSizeMetrics(entryPointSizeChanges)
            : 'No changes',
        getDetails({
            summary: 'All size metrics',
            content: getTableHtmlForSizeMetrics(entryPointSizeMetrics),
        }),
    ].join('\n\n')
}

/**
 * @param {import('./get-package-size.mjs').EntryPointSize[]} entryPointSizesHead
 * @param {import('./get-package-size.mjs').EntryPointSize[]} entryPointSizesBase
 */
function getEntryPointSizeMetrics(entryPointSizesHead, entryPointSizesBase) {
    const baseEntryPointSizesMap = new Map(
        entryPointSizesBase.map((entryPointSize) => [
            entryPointSize.bundleSize.label,
            entryPointSize,
        ]),
    )

    return entryPointSizesHead.map(({ bundleSize, singleExportSizes }) => {
        const baseEntryPointSize = baseEntryPointSizesMap.get(bundleSize.label)

        const bundleSizeMetrics = getBundleSizeMetrics(bundleSize, baseEntryPointSize?.bundleSize)

        if (singleExportSizes) {
            const baseBundleSizeMap = new Map(
                baseEntryPointSize?.singleExportSizes?.map((bundleSize) => [
                    bundleSize.label,
                    bundleSize,
                ]),
            )

            return {
                bundleSize: bundleSizeMetrics,
                singleExportSizes: singleExportSizes.map((singleExportSize) => {
                    const baseBundleSize = baseBundleSizeMap.get(singleExportSize.label)
                    return getBundleSizeMetrics(singleExportSize, baseBundleSize)
                }),
            }
        }

        return {
            bundleSize: bundleSizeMetrics,
        }
    })
}

/**
 * @param {import('./get-package-size.mjs').BundleSize} bundleSizeHead
 * @param {import('./get-package-size.mjs').BundleSize=} bundleSizeBase
 */
function getBundleSizeMetrics(bundleSizeHead, bundleSizeBase) {
    return {
        label: bundleSizeHead.label,
        size: getSizeMetrics(bundleSizeHead.size, bundleSizeBase?.size),
        sizeMinified: getSizeMetrics(bundleSizeHead.sizeMinified, bundleSizeBase?.sizeMinified),
        sizeBrotliCompressed: getSizeMetrics(
            bundleSizeHead.sizeBrotliCompressed,
            bundleSizeBase?.sizeBrotliCompressed,
        ),
    }
}

/**
 * @param {number} sizeHead
 * @param {number=} sizeBase
 */
function getSizeMetrics(sizeHead, sizeBase) {
    return {
        value: sizeHead,
        changePercent: sizeBase ? (sizeHead - sizeBase) / sizeBase : undefined,
    }
}

/**
 *
 * @param {ReturnType<typeof getEntryPointSizeMetrics>} entryPointSizeMetrics
 */
function getTableHtmlForSizeMetrics(entryPointSizeMetrics) {
    return getTableHtml({
        headers: [
            'Export',
            'Size original',
            'Size minified',
            'Size minified and Brotli compressed',
        ],
        columnAlignments: ['left', 'center', 'center', 'center'],
        columnWidths: ['225px', '200px', '200px', '200px'],
        rows: entryPointSizeMetrics.flatMap(({ bundleSize, singleExportSizes }) => {
            const mainBundleRow = getBundleSizeTableRow(bundleSize)

            if (singleExportSizes) {
                return [
                    mainBundleRow,
                    ...singleExportSizes.map((singleExportSize) => {
                        return getBundleSizeTableRow(singleExportSize, true)
                    }),
                ]
            }

            return [mainBundleRow]
        }),
    })
}

/**
 * @param {ReturnType<typeof getBundleSizeMetrics>} bundleSizeMetrics
 * @param {boolean=} isIndented
 */
function getBundleSizeTableRow(bundleSizeMetrics, isIndented) {
    return [
        nonBreaking(
            [isIndented ? ' › ' : '', '<code>', bundleSizeMetrics.label, '</code>'].join(''),
        ),
        getSizeMetricsTableContent(bundleSizeMetrics.size),
        getSizeMetricsTableContent(bundleSizeMetrics.sizeMinified),
        getSizeMetricsTableContent(bundleSizeMetrics.sizeBrotliCompressed),
    ]
}

/**
 * @param {ReturnType<typeof getSizeMetrics>} size
 */
function getSizeMetricsTableContent(size) {
    const sizeString = nonBreaking(getSizeInKb(size.value))

    if (size.changePercent === undefined) {
        return sizeString
    }

    return sizeString + ' ' + nonBreaking(getChangePercentString(size.changePercent))
}

/**
 * @param {number} size
 */
export function getSizeInKb(size) {
    return (size / 1024).toLocaleString('en-GB', {
        style: 'unit',
        unit: 'kilobyte',
        unitDisplay: 'short',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

/**
 * @param {number} changePercent
 */
function getChangePercentString(changePercent) {
    const isZero = changePercent === 0
    const isPositive = changePercent > 0

    const percentageString = changePercent.toLocaleString('en-GB', {
        style: 'percent',
        minimumFractionDigits: isZero ? 0 : 1,
        maximumFractionDigits: 1,
        signDisplay: 'exceptZero',
    })

    return percentageString + (isZero ? '' : isPositive ? ' 🔴' : ' 🟢')
}

/**
 * @param {ReturnType<typeof getBundleSizeMetrics>} bundleSizeMetrics
 */
function hasBundleSizeChange(bundleSizeMetrics) {
    return (
        bundleSizeMetrics.size.changePercent !== 0 ||
        bundleSizeMetrics.sizeMinified.changePercent !== 0 ||
        bundleSizeMetrics.sizeBrotliCompressed.changePercent !== 0
    )
}
