import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import { afterEach, expect, test, vi } from 'vitest'

const require = createRequire(import.meta.url)
const {
    __testing: {
        filterTargetsWithoutReleaseComments,
        findReleaseComment,
        formatPostedCommentsSummary,
        getIssueCommentUrl,
        parseTag,
        pickShaPrereleaseCandidatePool,
        postCommentsAndLabels,
        releaseCommentMarker,
    },
} = require('./index.js')

const originalFetch = globalThis.fetch
const originalStepSummaryPath = process.env.GITHUB_STEP_SUMMARY

afterEach(() => {
    globalThis.fetch = originalFetch

    if (originalStepSummaryPath === undefined) {
        delete process.env.GITHUB_STEP_SUMMARY
    } else {
        process.env.GITHUB_STEP_SUMMARY = originalStepSummaryPath
    }

    vi.restoreAllMocks()
})

test('filters prerelease targets that already have release comments', async () => {
    const commentsByIssueNumber = new Map([
        [
            669,
            [
                {
                    body: `This was addressed in release [v3.5.0-dev.1c12c561babd1b9260220d2e6af7a3e1fb58f2bb](https://www.npmjs.com/package/tailwind-merge/v/3.5.0-dev.1c12c561babd1b9260220d2e6af7a3e1fb58f2bb).\n\n${releaseCommentMarker(
                        'v3.5.0-dev.1c12c561babd1b9260220d2e6af7a3e1fb58f2bb',
                        true,
                        null,
                    )}`,
                    html_url: 'https://github.com/dcastil/tailwind-merge/pull/669#issuecomment-1',
                },
            ],
        ],
        [
            670,
            [
                {
                    body: 'A regular maintainer comment.',
                    html_url: 'https://github.com/dcastil/tailwind-merge/pull/670#issuecomment-1',
                },
            ],
        ],
        [
            671,
            [
                {
                    body: 'This was addressed in release [v3.6.0](https://github.com/dcastil/tailwind-merge/releases/tag/v3.6.0).',
                    html_url: 'https://github.com/dcastil/tailwind-merge/pull/671#issuecomment-1',
                },
            ],
        ],
    ])

    const targets = await filterTargetsWithoutReleaseComments(
        [669, 670, 671],
        async (issueNumber) => commentsByIssueNumber.get(issueNumber) || [],
    )

    expect(targets).toEqual([670])
})

test('ignores release-commenter markers when the tag is not semver-compatible', () => {
    expect(
        findReleaseComment([
            {
                body: '<!-- release-commenter: tag=not-a-semver-tag; prerelease=true -->',
                html_url: 'https://github.com/dcastil/tailwind-merge/pull/669#issuecomment-1',
            },
        ]),
    ).toBeNull()
})

test('keeps every candidate from previous core version for first dev release after version bump', () => {
    const currentVersion = parseVersion('3.6.0-dev.d54f7e5713c653d0171971405344f7c6e44d418f')
    const selection = pickShaPrereleaseCandidatePool(
        [
            candidate('3.4.1-dev.ffffffffffffffffffffffffffffffffffffffff'),
            candidate('3.5.0-dev.1c12c561babd1b9260220d2e6af7a3e1fb58f2bb'),
            candidate('3.5.0-dev.ef91df55ea3be957e222aaa5963d0cac8b69d380'),
        ],
        currentVersion,
    )

    expect(selection.usedSameCoreVersion).toBe(false)
    expect(selection.fallbackCoreVersion).toMatchObject({
        major: 3,
        minor: 5,
        patch: 0,
    })
    expect(selection.candidates.map((entry) => entry.npmVersion)).toEqual([
        '3.5.0-dev.1c12c561babd1b9260220d2e6af7a3e1fb58f2bb',
        '3.5.0-dev.ef91df55ea3be957e222aaa5963d0cac8b69d380',
    ])
})

test('prefers same-core candidates for SHA dev release base selection', () => {
    const currentVersion = parseVersion('3.6.0-dev.d54f7e5713c653d0171971405344f7c6e44d418f')
    const selection = pickShaPrereleaseCandidatePool(
        [
            candidate('3.5.0-dev.ef91df55ea3be957e222aaa5963d0cac8b69d380'),
            candidate('3.6.0-dev.17041e17c5b9c96fcb0f4758c718799cb3af14a6'),
        ],
        currentVersion,
    )

    expect(selection.usedSameCoreVersion).toBe(true)
    expect(selection.candidates.map((entry) => entry.npmVersion)).toEqual([
        '3.6.0-dev.17041e17c5b9c96fcb0f4758c718799cb3af14a6',
    ])
})

test('logs posted comment URLs and writes them to the workflow summary', async () => {
    const summaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-commenter-'))
    const summaryPath = path.join(summaryDirectory, 'step-summary.md')
    process.env.GITHUB_STEP_SUMMARY = summaryPath

    const postedCommentUrls = [
        'https://github.com/dcastil/tailwind-merge/pull/669#issuecomment-1',
        'https://github.com/dcastil/tailwind-merge/issues/670#issuecomment-2',
    ]
    let requestIndex = 0
    globalThis.fetch = vi.fn(async () => ({
        ok: true,
        status: 201,
        json: async () => ({
            html_url: postedCommentUrls[requestIndex++],
        }),
    }))
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await postCommentsAndLabels('token', 'dcastil', 'tailwind-merge', [669, 670], 'Body', [], false)

    expect(consoleSpy).toHaveBeenCalledWith(
        `[release-commenter] Posted comment on #669: ${postedCommentUrls[0]}`,
    )
    expect(consoleSpy).toHaveBeenCalledWith(
        `[release-commenter] Posted comment on #670: ${postedCommentUrls[1]}`,
    )
    expect(fs.readFileSync(summaryPath, 'utf8')).toContain(
        formatPostedCommentsSummary([
            { issueNumber: 669, commentUrl: postedCommentUrls[0] },
            { issueNumber: 670, commentUrl: postedCommentUrls[1] },
        ]),
    )
})

test('extracts comment URLs from GitHub issue comment responses defensively', () => {
    expect(getIssueCommentUrl({ html_url: 'https://github.com/example/comment' })).toBe(
        'https://github.com/example/comment',
    )
    expect(getIssueCommentUrl({ html_url: 123 })).toBe('')
    expect(getIssueCommentUrl(null)).toBe('')
})

function parseVersion(version) {
    const parsedVersion = parseTag(version)
    if (!parsedVersion) {
        throw new Error(`Expected ${version} to be semver-compatible`)
    }

    return parsedVersion
}

function candidate(npmVersion) {
    return {
        npmVersion,
        parsedVersion: parseVersion(npmVersion),
        sha: npmVersion.split('.').at(-1),
    }
}
