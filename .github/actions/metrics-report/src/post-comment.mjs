// @ts-check

import fs from 'fs/promises'

import { isMetricsReportComment, setMetricsReportComment } from './metrics-report-comment.mjs'

const githubApiVersion = '2022-11-28'

await run()

async function run() {
    const { commentBodyPath, githubToken, owner, pullRequestNumber, repo } = getEnvironment()
    const commentBody = await fs.readFile(commentBodyPath, 'utf8')
    const { action, comment } = await setMetricsReportComment({
        body: commentBody,
        createComment: (body) => createComment(githubToken, owner, repo, pullRequestNumber, body),
        findCommentToUpdate: () =>
            findCommentToUpdate(githubToken, owner, repo, pullRequestNumber),
        updateComment: (comment, body) =>
            updateComment(githubToken, owner, repo, comment.id, body),
    })

    process.stdout.write(`${capitalize(action)} metrics report comment ${comment.html_url}\n`)
}

/**
 * @returns {{
 *   commentBodyPath: string
 *   githubToken: string
 *   owner: string
 *   pullRequestNumber: string
 *   repo: string
 * }}
 */
function getEnvironment() {
    const commentBodyPath = getRequiredEnvironmentVariable('COMMENT_BODY_PATH')
    const githubToken = getRequiredEnvironmentVariable('GITHUB_TOKEN')
    const repository = getRequiredEnvironmentVariable('GITHUB_REPOSITORY')
    const pullRequestNumber = getRequiredEnvironmentVariable('PR_NUMBER')
    const [owner, repo] = repository.split('/')

    if (!owner || !repo) {
        throw new Error(`Expected GITHUB_REPOSITORY to be in owner/repo format, got "${repository}"`)
    }

    return {
        commentBodyPath,
        githubToken,
        owner,
        pullRequestNumber,
        repo,
    }
}

/**
 * @param {string} githubToken
 * @param {string} owner
 * @param {string} repo
 * @param {string} pullRequestNumber
 */
async function findCommentToUpdate(githubToken, owner, repo, pullRequestNumber) {
    for (let page = 1; ; page++) {
        const comments = await requestJson(
            githubToken,
            `/repos/${owner}/${repo}/issues/${pullRequestNumber}/comments?per_page=100&page=${page}`,
        )
        const commentToUpdate = comments.find(isMetricsReportComment)

        if (commentToUpdate) {
            return commentToUpdate
        }

        if (comments.length < 100) {
            return undefined
        }
    }
}

/**
 * @param {string} githubToken
 * @param {string} owner
 * @param {string} repo
 * @param {string | number} commentId
 * @param {string} body
 */
async function updateComment(githubToken, owner, repo, commentId, body) {
    return requestJson(githubToken, `/repos/${owner}/${repo}/issues/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
    })
}

/**
 * @param {string} githubToken
 * @param {string} owner
 * @param {string} repo
 * @param {string} pullRequestNumber
 * @param {string} body
 */
async function createComment(githubToken, owner, repo, pullRequestNumber, body) {
    return requestJson(githubToken, `/repos/${owner}/${repo}/issues/${pullRequestNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
    })
}

/**
 * @param {string} githubToken
 * @param {string} path
 * @param {RequestInit=} init
 */
async function requestJson(githubToken, path, init = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
        ...init,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'tailwind-merge-metrics-report',
            'X-GitHub-Api-Version': githubApiVersion,
            ...init.headers,
        },
    })

    if (!response.ok) {
        throw new Error(
            `GitHub API request failed: ${response.status} ${response.statusText}\n${await response.text()}`,
        )
    }

    return response.json()
}

/**
 * @param {string} name
 */
function getRequiredEnvironmentVariable(name) {
    const value = process.env[name]

    if (!value) {
        throw new Error(`Missing required environment variable ${name}`)
    }

    return value
}

/**
 * @param {string} value
 */
function capitalize(value) {
    return value[0].toUpperCase() + value.slice(1)
}
