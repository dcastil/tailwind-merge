// @ts-check

import path from 'path'
import { fileURLToPath } from 'url'

import core from '@actions/core'
import { exec } from '@actions/exec'

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

export const actionRootPath = path.resolve(currentDirPath, '..')
export const repoRootPath = path.resolve(currentDirPath, '../../../..')

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
