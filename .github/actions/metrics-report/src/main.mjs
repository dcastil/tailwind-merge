// @ts-check

import core from '@actions/core'
import { context } from '@actions/github'

import { getPackageSize } from './get-package-size.mjs'
import { getSizeInKb, getSizeMetricsReportContent } from './get-size-metrics-report-content.mjs'
import { setComment } from './set-comment.mjs'
import { checkoutBranch } from './utils/git.mjs'

run()

async function run() {
    const pullRequest =
        /** @type {import('@octokit/webhooks-definitions/schema').PullRequestEvent} */ (
            context.payload
        ).pull_request

    if (!pullRequest) {
        throw Error('This action can only be run in a pull request')
    }

    core.info('Getting local package sizes')
    const entryPointSizesHead = await getPackageSize()
    logEntryPointSizes(entryPointSizesHead)

    await checkoutBranch(pullRequest.base.ref)

    core.info('Getting PR base package sizes')
    const entryPointSizesBase = await getPackageSize({ shouldOmitFailures: true })
    logEntryPointSizes(entryPointSizesBase)

    const commentBody = getBodyText([
        ['### Metrics report'],
        [
            `At head commit ${pullRequest.head?.sha} and base commit ${pullRequest.base?.sha} at \`${new Date().toISOString()}\``,
        ],
        [getSizeMetricsReportContent(entryPointSizesHead, entryPointSizesBase)],
    ])

    const isPullRequestFromFork =
        pullRequest.head.repo.full_name !== `${context.repo.owner}/${context.repo.repo}`

    if (isPullRequestFromFork) {
        core.info('Pull request is from a fork, printing comment instead of posting it')
        core.info(commentBody)
    } else {
        await setComment(commentBody)
    }
}

/**
 * @param {import('./get-package-size.mjs').EntryPointSize[]} entryPointSizes
 */
function logEntryPointSizes(entryPointSizes) {
    core.info('Package sizes')

    entryPointSizes.forEach(({ bundleSize, singleExportSizes }) => {
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
                getSizeInKb(bundleSize.size).padStart(14),
                `${getSizeInKb(bundleSize.sizeMinified).padStart(14)} minified`,
                `${getSizeInKb(bundleSize.sizeBrotliCompressed).padStart(14)} brotli compressed`,
            ].join(' '),
        ].join(''),
    )
}

/**
 * @param {string[][]} paragraphs
 */
function getBodyText(paragraphs) {
    return paragraphs.map((lines) => lines.join('\n')).join('\n\n')
}
