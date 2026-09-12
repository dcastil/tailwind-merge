import { createRequire } from 'node:module'

import { afterEach, expect, test, vi } from 'vitest'

const require = createRequire(import.meta.url)
const {
    __testing: { collectLinkedIssuesAndPrs, postCommentsAndLabels },
} = require('./index.js')

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

test.each([
    ['tailwind-merge', [101, 104, 1001, 1004, 2001, 2004, 3001, 3004, 3006, 3007]],
    ['@tailwind-merge/vite', [102, 103, 104, 1002, 1003, 1004, 2002, 2003, 2004, 3002, 3003, 3004]],
])('scopes dry-run targets and their linked issues to %s', async (packageName, expected) => {
    const paths = {
        1: 'packages/tailwind-merge/src/index.ts',
        2: 'packages/vite/src/index.ts',
        3: 'packages/configurator/src/plan.ts',
        4: 'packages/tailwind-merge/tests/merge.test.ts',
        5: 'packages/tailwind-merge-other/index.ts',
        6: 'src/lib/default-config.ts',
        7: 'archive/removed.ts',
        8: '.github/workflows/test.yml',
    }
    const records = Object.entries(paths).map(([number, filename]) => ({
        sha: number,
        files: [
            {
                filename,
                ...(number === '7'
                    ? { previous_filename: 'packages/tailwind-merge/src/removed.ts' }
                    : {}),
            },
            ...(number === '4' ? [{ filename: 'packages/vite/tests/plugin.test.ts' }] : []),
        ],
        resource: {
            messageBodyHTML: closingIssue(3000 + Number(number)),
            associatedPullRequests: {
                // One commit can be associated with multiple PRs; an unrelated PR's body and timeline must be filtered too.
                edges: (number === '1' ? [1, 2] : Number(number) <= 4 ? [Number(number)] : []).map(
                    (id) => ({
                        node: {
                            number: 100 + id,
                            bodyHTML: closingIssue(1000 + id),
                            timelineItems: {
                                nodes: [
                                    {
                                        __typename: 'ConnectedEvent',
                                        subject: { __typename: 'Issue', number: 2000 + id },
                                    },
                                ],
                            },
                        },
                    }),
                ),
            },
        },
    }))
    const request = mockGitHub(records, (number) => records[number - 101].files)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const targets = await collectLinkedIssuesAndPrs(
        'token',
        'owner',
        'repo',
        records,
        [],
        packageName,
    )
    expect(targets).toEqual(expected)
    await postCommentsAndLabels('token', 'owner', 'repo', targets, 'Released', ['released'], true)
    expect(log.mock.calls.filter(([line]) => line.includes('Dry run: would comment'))).toHaveLength(
        expected.length,
    )
    expect(
        request.mock.calls.filter(
            ([url, options]) => options.method === 'POST' && !String(url).endsWith('/graphql'),
        ),
    ).toEqual([])
})

test.each(['commit', 'pull request'])(
    'checks later pages of changed %s files',
    async (endpoint) => {
        const unrelated = Array.from({ length: 100 }, (_, index) => ({
            filename: `packages/vite/${index}.ts`,
        }))
        const relevant = [{ filename: 'packages/tailwind-merge/src/index.ts' }]
        const records = [
            {
                sha: 'paginated',
                files: endpoint === 'commit' ? [...unrelated, ...relevant] : relevant,
                resource: { associatedPullRequests: { edges: [{ node: { number: 101 } }] } },
            },
        ]
        const request = mockGitHub(records, () =>
            endpoint === 'pull request' ? [...unrelated, ...relevant] : relevant,
        )
        expect(
            await collectLinkedIssuesAndPrs(
                'token',
                'owner',
                'repo',
                records,
                [],
                'tailwind-merge',
            ),
        ).toEqual([101])
        const pathname = endpoint === 'commit' ? '/commits/paginated' : '/pulls/101/files'
        expect(
            request.mock.calls.some(
                ([url]) =>
                    new URL(url).pathname.endsWith(pathname) &&
                    new URL(url).searchParams.get('page') === '2',
            ),
        ).toBe(true)
    },
)

test('caches PR scope across commits and excludes out-of-scope PR closing references', async () => {
    const records = ['first', 'second'].map((sha) => ({
        sha,
        files: [{ filename: 'packages/tailwind-merge/src/index.ts' }],
        resource: {
            associatedPullRequests: {
                edges: [
                    { node: { number: 101, bodyHTML: closingIssue(1) } },
                    { node: { number: 102, bodyHTML: closingIssue(2) } },
                ],
            },
        },
    }))
    const request = mockGitHub(records, (number) => [
        { filename: `packages/${number === 101 ? 'tailwind-merge' : 'vite'}/src/index.ts` },
    ])
    expect(
        await collectLinkedIssuesAndPrs('token', 'owner', 'repo', records, [], 'tailwind-merge'),
    ).toEqual([1, 101])
    expect(
        request.mock.calls.filter(([url]) => new URL(url).pathname.includes('/pulls/')),
    ).toHaveLength(2)
})

test('fails before collecting targets when changed-file data is truncated', async () => {
    const records = [
        {
            sha: 'large',
            files: Array.from({ length: 3000 }, (_, index) => ({
                filename: `packages/vite/${index}.ts`,
            })),
            resource: { messageBodyHTML: closingIssue(1) },
        },
    ]
    const request = mockGitHub(records, () => [])
    await expect(
        collectLinkedIssuesAndPrs('token', 'owner', 'repo', records, [], 'tailwind-merge'),
    ).rejects.toThrow('changed-file limit reached')
    expect(request.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true)
})

test('rejects unknown package scopes before making requests', async () => {
    const request = mockGitHub([], () => [])
    await expect(
        collectLinkedIssuesAndPrs('token', 'owner', 'repo', [{ sha: 'any' }], [], 'unknown'),
    ).rejects.toThrow('No release notification paths configured')
    expect(request).not.toHaveBeenCalled()
})

/** Simulate GitHub's commit envelope and PR file arrays, with real pagination and no network or publication. */
function mockGitHub(records, pullFiles) {
    const request = vi.fn(async (input, options) => {
        const url = new URL(input)
        let payload
        if (url.pathname === '/graphql') {
            const sha = JSON.parse(options.body).variables.url.split('/').at(-1)
            payload = { data: { resource: records.find((record) => record.sha === sha)?.resource } }
        } else {
            expect(options.method).toBe('GET')
            const page = Number(url.searchParams.get('page') || 1)
            const commitSha = /\/commits\/([^/]+)$/.exec(url.pathname)?.[1]
            const prNumber = /\/pulls\/(\d+)\/files$/.exec(url.pathname)?.[1]
            const files = commitSha
                ? records.find((record) => record.sha === commitSha)?.files
                : prNumber
                  ? pullFiles(Number(prNumber))
                  : undefined
            if (!files) throw new Error(`Unexpected request: ${url}`)
            const slice = files.slice((page - 1) * 100, page * 100)
            payload = commitSha ? { files: slice } : slice
        }
        return { ok: true, status: 200, json: async () => payload }
    })
    vi.stubGlobal('fetch', request)
    return request
}

/** Use GitHub's rendered closing-reference metadata rather than guessing links from prose. */
function closingIssue(number) {
    return `<a aria-label="This commit closes issue #${number}.">#${number}</a>`
}
