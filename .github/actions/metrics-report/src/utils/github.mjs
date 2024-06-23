// @ts-check

import core from '@actions/core'
import { getOctokit } from '@actions/github'

const githubToken = core.getInput('github_token')
export const octokit = getOctokit(githubToken)
