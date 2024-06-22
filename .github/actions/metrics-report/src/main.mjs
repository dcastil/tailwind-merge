// @ts-check

import core from '@actions/core'
import { context } from '@actions/github'

import { getPackageSize } from './get-package-size.mjs'

run()

async function run() {
    const pullRequest = context.payload.pull_request

    if (!pullRequest) {
        throw Error('This action can only be run in a pull request')
    }

    core.info('Getting local package sizes')
    const localBundleSizes = await getPackageSize()
    logBundleSizes(localBundleSizes)

    core.info('Getting PR base package sizes')
    const baseBundleSizes = await getPackageSize({ branch: pullRequest.base.ref })
    logBundleSizes(baseBundleSizes)
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
