// @ts-check

import core from '@actions/core'
import { context } from '@actions/github'

import { getPackageSize } from './get-package-size.mjs'
import { setComment } from './set-comment.mjs'
import { checkoutBranch } from './utils.mjs'

run()

async function run() {
    const pullRequest = context.payload.pull_request

    console.log('📟 - run - pullRequest:', pullRequest)

    if (!pullRequest) {
        throw Error('This action can only be run in a pull request')
    }

    core.info('Getting local package sizes')
    const localBundleSizes = await getPackageSize()
    logBundleSizes(localBundleSizes)

    await checkoutBranch(pullRequest.head.ref)

    core.info('Getting PR base package sizes')
    const baseBundleSizes = await getPackageSize({ shouldOmitFailures: true })
    logBundleSizes(baseBundleSizes)

    const commentBody = getBodyText([
        ['# Metrics report'],
        [`on commit ${pullRequest} at ${new Date().toLocaleString('de-DE')}`],
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
