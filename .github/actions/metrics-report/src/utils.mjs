// @ts-check

import path from 'path'
import { fileURLToPath } from 'url'

import core from '@actions/core'
import { exec } from '@actions/exec'
import { getOctokit } from '@actions/github'

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

export const actionRootPath = path.resolve(currentDirPath, '..')
export const repoRootPath = path.resolve(currentDirPath, '../../../..')

const githubToken = core.getInput('github_token')
export const octokit = getOctokit(githubToken)

/**
 * @param {string} branch
 */
export async function checkoutBranch(branch) {
    try {
        core.info(`Fetching branch ${branch}`)
        await exec(`git fetch origin ${branch} --depth=1`)
    } catch (error) {
        core.error('git fetch failed', error.message)

        throw error
    }

    core.info(`Checking out branch ${branch}`)
    await exec(`git checkout --force ${branch}`)
}
