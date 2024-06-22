// @ts-check

import core from '@actions/core'
import { context } from '@actions/github'

import { octokit } from './utils.mjs'

const commentIdComment = '<!-- This is an autogenerated comment from metrics-report-action. -->\n'
const commentAdditionComment =
    "<!-- Please don't alter the line above and don't include it in other comments. -->\n\n"

/**
 * @param {string} body
 */
export async function setComment(body) {
    const commentToUpdate = await findCommentToUpdate()

    if (commentToUpdate) {
        await updateComment(body, commentToUpdate.id)
    } else {
        await createComment(body)
    }
}

async function findCommentToUpdate() {
    if (!context.payload.pull_request) {
        throw new Error('Can only list comments in a pull request')
    }

    core.info('Searching comment to update')
    const iterator = octokit.paginate.iterator(octokit.rest.issues.listComments, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
    })

    /** @type {import('@octokit/types').GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.issues.listComments>[number]=} */
    let commentToUpdate

    iteratorLoop: for await (const response of iterator) {
        for (const comment of response.data) {
            if (comment.body?.startsWith(commentIdComment)) {
                commentToUpdate = comment
                break iteratorLoop
            }
        }
    }

    if (commentToUpdate) {
        core.info(`Found comment to update with URL ${commentToUpdate.url}`)
    } else {
        core.info('No comment to update found')
    }

    return commentToUpdate
}

/**
 * @param {string} body
 */
async function createComment(body) {
    if (!context.payload.pull_request) {
        throw new Error('Can only create a comment in a pull request')
    }

    const response = await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: commentIdComment + commentAdditionComment + body,
    })

    core.info(`Created comment with URL ${response.data.url}`)
}

/**
 * @param {string} body
 * @param {number} commentId
 */
async function updateComment(body, commentId) {
    const response = await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: commentId,
        body: commentIdComment + commentAdditionComment + body,
    })

    core.info(`Updated comment with URL ${response.data.url}`)
}
