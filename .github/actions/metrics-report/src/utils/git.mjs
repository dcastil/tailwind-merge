// @ts-check

import core from '@actions/core'
import { exec } from '@actions/exec'

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
