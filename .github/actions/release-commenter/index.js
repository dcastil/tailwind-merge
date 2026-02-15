// @ts-check

const fs = require('node:fs')

const closesMatcher = /aria-label="This (?:commit|pull request) closes issue #(\d+)\."/g
const releaseTagMarkerRegex = /<!--\s*release-commenter:\s*tag=([^;\s>]+)(?:;[^>]*)?\s*-->/i
const releaseTagUrlRegex = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/releases\/tag\/([^)\s]+)/i

const defaultCommentTemplate = 'This was addressed in release {release_link}.'

const apiVersionHeader = '2022-11-28'
const npmRegistryUrl = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org'

const eventPath = process.env.GITHUB_EVENT_PATH
const repository = process.env.GITHUB_REPOSITORY
const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com'
const graphqlUrl = process.env.GITHUB_GRAPHQL_URL || `${apiUrl}/graphql`

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    logError(message)
    process.exit(1)
})

/**
 * @typedef {{
 *   major: number
 *   minor: number
 *   patch: number
 *   prerelease: string[]
 *   isPrerelease: boolean
 * }} ParsedTag
 */

/**
 * @typedef {{
 *   tag_name: string
 *   name?: string | null
 *   html_url?: string | null
 *   draft?: boolean
 * }} ReleaseRecord
 */

/**
 * @typedef {{
 *   tag: string
 *   name: string
 *   htmlUrl: string
 * }} ReleaseInfo
 */

/**
 * @typedef {{
 *   release?: ReleaseRecord
 * }} EventPayload
 */

/**
 * @typedef {{
 *   sha: string
 * }} CommitRecord
 */

/**
 * @typedef {{
 *   status: string
 *   ahead_by?: number
 *   commits: CommitRecord[]
 * }} CompareData
 */

/**
 * @typedef {{
 *   body?: string | null
 *   html_url: string
 * }} IssueComment
 */

/**
 * @typedef {{
 *   issueNumber: number
 *   kind: 'duplicate' | 'previous-release'
 *   existingTag: string
 *   commentUrl: string
 * }} GuardViolation
 */

/**
 * @typedef {{
 *   name: string
 * }} GraphQLLabelNode
 */

/**
 * @typedef {{
 *   __typename: 'Issue' | 'PullRequest'
 *   number: number
 * }} GraphQLTimelineSubject
 */

/**
 * @typedef {{
 *   __typename: 'ConnectedEvent' | 'DisconnectedEvent'
 *   isCrossRepository: boolean
 *   subject?: GraphQLTimelineSubject | null
 * }} GraphQLTimelineNode
 */

/**
 * @typedef {{
 *   bodyHTML?: string
 *   number: number
 *   labels?: { nodes?: GraphQLLabelNode[] | null } | null
 *   timelineItems?: { nodes?: GraphQLTimelineNode[] | null } | null
 * }} GraphQLAssociatedPrNode
 */

/**
 * @typedef {{
 *   node: GraphQLAssociatedPrNode
 * }} GraphQLAssociatedPrEdge
 */

/**
 * @typedef {{
 *   messageHeadlineHTML?: string
 *   messageBodyHTML?: string
 *   associatedPullRequests?: { edges?: GraphQLAssociatedPrEdge[] | null } | null
 * }} GraphQLCommitResource
 */

/**
 * @typedef {{
 *   resource?: GraphQLCommitResource | null
 * }} GraphQLCommitQueryData
 */

/**
 * @typedef {{
 *   prereleasePrefix: string
 *   currentSha: string
 * }} ShaPrereleaseContext
 */

/**
 * @typedef {{
 *   versions?: Record<string, unknown>
 * }} NpmPackument
 */

/**
 * @typedef {{
 *   baseRef: string
 *   headRef: string
 *   sourceVersion: string
 *   aheadBy: number
 * }} ShaBaseResolution
 */

/**
 * @typedef {{
 *   baseRef: string
 *   headRef: string
 * }} CompareRefs
 */

/**
 * Action entrypoint.
 *
 * @returns {Promise<void>}
 */
async function main() {
    if (!repository) {
        throw new Error('Missing GITHUB_REPOSITORY')
    }

    const [owner, repo] = repository.split('/')
    if (!owner || !repo) {
        throw new Error(`Invalid GITHUB_REPOSITORY value: "${repository}"`)
    }

    const payload = readEventPayload()
    const token = getInput('github-token') || process.env.GITHUB_TOKEN
    if (!token) {
        throw new Error('Missing github-token input')
    }

    const headTagInput = getInput('head-tag')
    const baseTagInput = getInput('base-tag')
    const npmPackageNameInput = getInput('npm-package-name')
    const dryRun = parseBooleanInput(getInput('dry-run', 'false'))

    const currentTag = headTagInput || payload?.release?.tag_name
    if (!currentTag) {
        throw new Error(
            'Could not determine current tag. Set head-tag input or trigger from release.published',
        )
    }

    const currentVersion = parseTag(currentTag)
    if (!currentVersion) {
        throw new Error(`Current tag "${currentTag}" is not semver-compatible`)
    }
    const shaPrereleaseContext = getShaPrereleaseContext(currentVersion)

    log(`Current tag: ${currentTag}`)
    log(`Dry run: ${dryRun}`)

    const currentRelease = await getCurrentRelease(token, owner, repo, currentTag, payload?.release)
    const releaseLabel = currentRelease.name || currentRelease.tag
    const releaseUrl = currentRelease.htmlUrl

    const commentTemplate = getInput('comment-template', defaultCommentTemplate)
    const labelTemplate = getInput('label-template')
    const skipLabelTemplate = getInput('skip-label')

    const resolvedComment = commentTemplate
        ? resolveTemplate(commentTemplate, releaseLabel, currentRelease.tag, releaseUrl).trim()
        : ''
    const labels = parseTemplateList(labelTemplate, releaseLabel, currentRelease.tag, releaseUrl)
    const skipLabels = parseTemplateList(
        skipLabelTemplate,
        releaseLabel,
        currentRelease.tag,
        releaseUrl,
    )

    const { baseRef, headRef } = await resolveCompareRefs(
        token,
        owner,
        repo,
        currentTag,
        currentVersion,
        shaPrereleaseContext,
        baseTagInput,
        npmPackageNameInput,
    )

    log(`Base ref: ${baseRef}`)
    log(`Head ref: ${headRef}`)
    log(`Compare range: ${baseRef}...${headRef}`)

    const compareData = await requestJson(
        token,
        'GET',
        `/repos/${owner}/${repo}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(headRef)}`,
    )
    /** @type {CompareData} */
    const comparePayload = compareData
    const commits = comparePayload.commits || []
    log(`Compare status: ${comparePayload.status}`)
    log(`Commits in range: ${commits.length}`)

    if (!commits.length) {
        log('No commits found in compare range. Nothing to do.')
        return
    }

    const targets = await collectLinkedIssuesAndPrs(token, owner, repo, commits, skipLabels)
    log(`Resolved targets: ${targets.length}`)

    if (!targets.length) {
        log('No linked issues/PRs found. Nothing to do.')
        return
    }

    const guardViolations = await checkGuardViolations(token, owner, repo, targets, currentVersion)
    if (guardViolations.length > 0) {
        const details = guardViolations
            .slice(0, 20)
            .map(
                (violation) =>
                    `#${violation.issueNumber} (${violation.kind}, existing ${violation.existingTag}) ${violation.commentUrl}`,
            )
            .join('\n')

        throw new Error(
            `Guard check failed. Found ${guardViolations.length} target(s) with existing release comments.\n${details}`,
        )
    }

    let commentBody = ''
    if (resolvedComment) {
        commentBody = `${resolvedComment}\n\n${releaseCommentMarker(
            currentTag,
            currentVersion.isPrerelease,
        )}`
    }

    if (dryRun && commentBody) {
        log(`Dry run comment body:\n${commentBody}`)
    }

    await postCommentsAndLabels(token, owner, repo, targets, commentBody, labels, dryRun)

    if (dryRun) {
        log('Dry run complete; no comments/labels were posted.')
    } else {
        log('Completed posting release comments/labels.')
    }
}

/**
 * Resolves the compare refs for this run from manual input, SHA-prerelease npm strategy,
 * or semver-stable release history strategy.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {string} currentTag
 * @param {ParsedTag} currentVersion
 * @param {ShaPrereleaseContext | null} shaPrereleaseContext
 * @param {string} baseTagInput
 * @param {string} npmPackageNameInput
 * @returns {Promise<CompareRefs>}
 */
async function resolveCompareRefs(
    token,
    owner,
    repo,
    currentTag,
    currentVersion,
    shaPrereleaseContext,
    baseTagInput,
    npmPackageNameInput,
) {
    let baseRef = ''
    let headRef = currentTag

    if (baseTagInput) {
        baseRef = baseTagInput
        if (shaPrereleaseContext) {
            headRef = shaPrereleaseContext.currentSha
        }
        log(`Using manual base ref input: ${baseRef}`)
    } else if (shaPrereleaseContext) {
        const npmPackageName = npmPackageNameInput || repo
        const shaResolution = await resolveShaPrereleaseBaseRef(
            token,
            owner,
            repo,
            npmPackageName,
            currentVersion,
            shaPrereleaseContext,
        )
        baseRef = shaResolution.baseRef
        headRef = shaResolution.headRef
        log(
            `Resolved SHA compare range from npm: version=${shaResolution.sourceVersion} base_sha=${baseRef} head_sha=${headRef} ahead_by=${shaResolution.aheadBy}`,
        )
    } else {
        const releases = await requestPaginated(token, `/repos/${owner}/${repo}/releases`)
        /** @type {ReleaseRecord[]} */
        const publishedReleases = releases.filter((release) => !release.draft)
        baseRef = pickBaseTag(currentTag, currentVersion, publishedReleases, '')
    }

    return { baseRef, headRef }
}

/**
 * Resolves linked issue/PR numbers from commits and associated PR metadata.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {CommitRecord[]} commits
 * @param {string[]} skipLabels
 * @returns {Promise<number[]>}
 */
async function collectLinkedIssuesAndPrs(token, owner, repo, commits, skipLabels) {
    /** @type {Set<number>} */
    const linkedIssuesPrs = new Set()

    for (const commit of commits) {
        const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`

        const data = await requestGraphQL(
            token,
            `
            query($url: URI!) {
              resource(url: $url) {
                ... on Commit {
                  messageHeadlineHTML
                  messageBodyHTML
                  associatedPullRequests(first: 20) {
                    pageInfo {
                      hasNextPage
                    }
                    edges {
                      node {
                        bodyHTML
                        number
                        labels(first: 50) {
                          pageInfo {
                            hasNextPage
                          }
                          nodes {
                            name
                          }
                        }
                        timelineItems(itemTypes: [CONNECTED_EVENT, DISCONNECTED_EVENT], first: 100) {
                          pageInfo {
                            hasNextPage
                          }
                          nodes {
                            ... on ConnectedEvent {
                              __typename
                              isCrossRepository
                              subject {
                                __typename
                                ... on Issue {
                                  number
                                }
                                ... on PullRequest {
                                  number
                                }
                              }
                            }
                            ... on DisconnectedEvent {
                              __typename
                              isCrossRepository
                              subject {
                                __typename
                                ... on Issue {
                                  number
                                }
                                ... on PullRequest {
                                  number
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            `,
            { url: commitUrl },
        )
        /** @type {GraphQLCommitQueryData} */
        const queryData = data

        const resource = queryData.resource
        if (!resource) continue

        const commitHtmlSegments = [
            resource.messageHeadlineHTML || '',
            resource.messageBodyHTML || '',
            ...(resource.associatedPullRequests?.edges || []).map(
                (edge) => edge?.node?.bodyHTML || '',
            ),
        ].join(' ')

        for (const match of commitHtmlSegments.matchAll(closesMatcher)) {
            const issueNumber = Number.parseInt(match[1], 10)
            if (Number.isInteger(issueNumber)) {
                linkedIssuesPrs.add(issueNumber)
            }
        }

        for (const edge of resource.associatedPullRequests?.edges || []) {
            const pr = edge.node
            const prLabels = (pr.labels?.nodes || []).map((label) => label.name)
            if (shouldSkipPr(skipLabels, prLabels)) {
                log(`Skipping PR #${pr.number} because skip-label matched`)
                continue
            }

            linkedIssuesPrs.add(pr.number)

            const timelineNodes = (pr.timelineItems?.nodes || [])
                .filter(
                    (node) =>
                        !node.isCrossRepository &&
                        node.subject &&
                        (node.subject.__typename === 'Issue' ||
                            node.subject.__typename === 'PullRequest') &&
                        Number.isInteger(node.subject.number),
                )
                .slice()
                .reverse()

            /** @type {Set<number>} */
            const seenTargets = new Set()
            for (const node of timelineNodes) {
                if (!node.subject) continue
                const targetNumber = node.subject.number
                if (seenTargets.has(targetNumber)) continue
                if (node.__typename === 'ConnectedEvent') {
                    linkedIssuesPrs.add(targetNumber)
                }
                seenTargets.add(targetNumber)
            }
        }
    }

    return [...linkedIssuesPrs].sort((left, right) => left - right)
}

/**
 * Validates that targets do not already have release comments that would make this run unsafe.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {number[]} targetNumbers
 * @param {ParsedTag} currentVersion
 * @returns {Promise<GuardViolation[]>}
 */
async function checkGuardViolations(token, owner, repo, targetNumbers, currentVersion) {
    if (currentVersion.isPrerelease) {
        log('Current release is a prerelease, skipping duplicate/previous-release comment guard')
        return []
    }

    /** @type {GuardViolation[]} */
    const violations = []

    for (const issueNumber of targetNumbers) {
        const comments = await requestPaginated(
            token,
            `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        )
        /** @type {IssueComment[]} */
        const issueComments = comments

        for (const comment of issueComments) {
            const existingTag = extractReleaseTagFromComment(comment.body || '')
            if (!existingTag) continue

            const existingVersion = parseTag(existingTag)
            if (!existingVersion) continue

            if (compareSemver(existingVersion, currentVersion) === 0) {
                violations.push({
                    issueNumber,
                    kind: 'duplicate',
                    existingTag,
                    commentUrl: comment.html_url,
                })
                break
            }

            if (!existingVersion.isPrerelease) {
                violations.push({
                    issueNumber,
                    kind: 'previous-release',
                    existingTag,
                    commentUrl: comment.html_url,
                })
                break
            }
        }
    }

    return violations
}

/**
 * Posts comments and/or labels for all resolved targets, or logs them in dry-run mode.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {number[]} targets
 * @param {string} commentBody
 * @param {string[]} labels
 * @param {boolean} dryRun
 * @returns {Promise<void>}
 */
async function postCommentsAndLabels(token, owner, repo, targets, commentBody, labels, dryRun) {
    for (const issueNumber of targets) {
        if (commentBody) {
            if (dryRun) {
                log(`Dry run: would comment on #${issueNumber}`)
            } else {
                await requestJson(
                    token,
                    'POST',
                    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
                    undefined,
                    { body: commentBody },
                )
            }
        }

        if (labels.length > 0) {
            if (dryRun) {
                log(`Dry run: would add labels [${labels.join(', ')}] to #${issueNumber}`)
            } else {
                await requestJson(
                    token,
                    'POST',
                    `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
                    undefined,
                    { labels },
                )
            }
        }
    }
}

/**
 * Writes a namespaced log line for easier workflow debugging.
 *
 * @param {string} message
 */
function log(message) {
    // eslint-disable-next-line no-console -- Intentional logging
    console.log(`[release-commenter] ${message}`)
}

/**
 * Writes a namespaced error line for easier workflow debugging.
 *
 * @param {string} message
 */
function logError(message) {
    // eslint-disable-next-line no-console -- Error logging for action run diagnostics
    console.error(`[release-commenter] ${message}`)
}

/**
 * Reads an action input by name and returns a normalized string value.
 *
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string}
 */
function getInput(name, fallback = '') {
    const key = `INPUT_${name.replaceAll('-', '_').toUpperCase()}`
    return (process.env[key] ?? fallback).trim()
}

/**
 * Parses typical truthy string forms used in workflow inputs.
 *
 * @param {string} rawValue
 * @returns {boolean}
 */
function parseBooleanInput(rawValue) {
    return ['1', 'true', 'yes', 'on'].includes(rawValue.trim().toLowerCase())
}

/**
 * Parses a semver tag with optional `v` or `refs/tags/` prefixes.
 *
 * @param {string | null | undefined} tag
 * @returns {ParsedTag | null}
 */
function parseTag(tag) {
    if (!tag) return null
    let normalized = tag.trim()
    if (normalized.startsWith('refs/tags/')) {
        normalized = normalized.slice('refs/tags/'.length)
    }
    if (normalized.startsWith('v')) {
        normalized = normalized.slice(1)
    }

    const match = normalized.match(
        /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/,
    )
    if (!match) return null

    const [, majorRaw, minorRaw, patchRaw, prereleaseRaw] = match
    const prerelease = prereleaseRaw ? prereleaseRaw.split('.') : []

    return {
        major: Number.parseInt(majorRaw, 10),
        minor: Number.parseInt(minorRaw, 10),
        patch: Number.parseInt(patchRaw, 10),
        prerelease,
        isPrerelease: prerelease.length > 0,
    }
}

/**
 * Compares two prerelease identifiers according to semver precedence rules.
 *
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
function comparePrereleaseIdentifiers(a, b) {
    const aIsNumber = /^[0-9]+$/.test(a)
    const bIsNumber = /^[0-9]+$/.test(b)

    if (aIsNumber && bIsNumber) {
        const aNumber = Number.parseInt(a, 10)
        const bNumber = Number.parseInt(b, 10)
        return aNumber === bNumber ? 0 : aNumber < bNumber ? -1 : 1
    }

    if (aIsNumber && !bIsNumber) return -1
    if (!aIsNumber && bIsNumber) return 1
    if (a === b) return 0
    return a < b ? -1 : 1
}

/**
 * Compares two parsed semver values.
 *
 * @param {ParsedTag} a
 * @param {ParsedTag} b
 * @returns {-1 | 0 | 1}
 */
function compareSemver(a, b) {
    if (a.major !== b.major) return a.major < b.major ? -1 : 1
    if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1
    if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1

    if (!a.isPrerelease && !b.isPrerelease) return 0
    if (a.isPrerelease && !b.isPrerelease) return -1
    if (!a.isPrerelease && b.isPrerelease) return 1

    const maxLength = Math.max(a.prerelease.length, b.prerelease.length)
    for (let index = 0; index < maxLength; index += 1) {
        const aIdentifier = a.prerelease[index]
        const bIdentifier = b.prerelease[index]

        if (aIdentifier === undefined) return -1
        if (bIdentifier === undefined) return 1

        const identifierComparison = comparePrereleaseIdentifiers(aIdentifier, bIdentifier)
        if (identifierComparison !== 0) return identifierComparison
    }

    return 0
}

/**
 * Normalizes commit SHA casing.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeSha(value) {
    return value.toLowerCase()
}

/**
 * Checks whether a prerelease identifier looks like a git SHA.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isShaLike(value) {
    return /^[0-9a-f]{7,40}$/i.test(value)
}

/**
 * Compares only major/minor/patch semver parts.
 *
 * @param {ParsedTag} a
 * @param {ParsedTag} b
 * @returns {boolean}
 */
function sameCoreVersion(a, b) {
    return a.major === b.major && a.minor === b.minor && a.patch === b.patch
}

/**
 * Gets prerelease prefix (everything before the last prerelease segment).
 *
 * @param {ParsedTag} version
 * @returns {string}
 */
function getPrereleasePrefix(version) {
    return version.prerelease.slice(0, -1).join('.')
}

/**
 * Detects prerelease tags where the final identifier is a git SHA.
 *
 * @param {ParsedTag} version
 * @returns {ShaPrereleaseContext | null}
 */
function getShaPrereleaseContext(version) {
    if (!version.isPrerelease || version.prerelease.length < 2) return null
    const maybeSha = version.prerelease[version.prerelease.length - 1]
    if (!isShaLike(maybeSha)) return null

    const prereleasePrefix = getPrereleasePrefix(version)
    if (!prereleasePrefix) return null

    return {
        prereleasePrefix,
        currentSha: normalizeSha(maybeSha),
    }
}

/**
 * Builds release display metadata from release-event payload when tags match.
 *
 * @param {string} currentTag
 * @param {ReleaseRecord | undefined} payloadRelease
 * @returns {ReleaseInfo | null}
 */
function releaseLabelAndUrl(currentTag, payloadRelease) {
    if (payloadRelease?.tag_name === currentTag) {
        return {
            tag: payloadRelease.tag_name,
            name: payloadRelease.name || payloadRelease.tag_name,
            htmlUrl:
                payloadRelease.html_url ||
                `https://github.com/${repository}/releases/tag/${currentTag}`,
        }
    }

    return null
}

/**
 * Expands template placeholders for release name/tag/link values.
 *
 * @param {string} rawTemplate
 * @param {string} releaseLabel
 * @param {string} releaseTag
 * @param {string} releaseUrl
 * @returns {string}
 */
function resolveTemplate(rawTemplate, releaseLabel, releaseTag, releaseUrl) {
    return rawTemplate
        .split('{release_link}')
        .join(`[${releaseLabel}](${releaseUrl})`)
        .split('{release_name}')
        .join(releaseLabel)
        .split('{release_tag}')
        .join(releaseTag)
}

/**
 * Resolves a comma-separated label list template into concrete label names.
 *
 * @param {string} rawTemplate
 * @param {string} releaseLabel
 * @param {string} releaseTag
 * @param {string} releaseUrl
 * @returns {string[]}
 */
function parseTemplateList(rawTemplate, releaseLabel, releaseTag, releaseUrl) {
    if (!rawTemplate) return []
    return resolveTemplate(rawTemplate, releaseLabel, releaseTag, releaseUrl)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
}

/**
 * Decodes URL-encoded tag values when possible.
 *
 * @param {string} rawTag
 * @returns {string}
 */
function decodeTag(rawTag) {
    try {
        return decodeURIComponent(rawTag)
    } catch {
        return rawTag
    }
}

/**
 * Extracts a previously-commented release tag from marker or release URL.
 *
 * @param {string | null | undefined} body
 * @returns {string | null}
 */
function extractReleaseTagFromComment(body) {
    if (!body) return null

    const markerMatch = body.match(releaseTagMarkerRegex)
    if (markerMatch) return decodeTag(markerMatch[1])

    const urlMatch = body.match(releaseTagUrlRegex)
    if (urlMatch) return decodeTag(urlMatch[1])

    return null
}

/**
 * Builds an HTML marker persisted in each release comment for guard checks.
 *
 * @param {string} tag
 * @param {boolean} isPrerelease
 * @returns {string}
 */
function releaseCommentMarker(tag, isPrerelease) {
    return `<!-- release-commenter: tag=${tag}; prerelease=${isPrerelease} -->`
}

/**
 * Reads and parses the GitHub event payload file.
 *
 * @returns {EventPayload}
 */
function readEventPayload() {
    if (!eventPath) {
        throw new Error('Missing GITHUB_EVENT_PATH')
    }
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'))
}

/**
 * Builds an API URL path under the current GitHub API base URL.
 *
 * @param {string} pathname
 * @returns {string}
 */
function githubApiPath(pathname) {
    return `${apiUrl}${pathname}`
}

/**
 * Builds an npm registry URL path under the current registry base URL.
 *
 * @param {string} packageName
 * @returns {string}
 */
function npmRegistryPath(packageName) {
    const registryRoot = npmRegistryUrl.endsWith('/') ? npmRegistryUrl.slice(0, -1) : npmRegistryUrl
    return `${registryRoot}/${encodeURIComponent(packageName)}`
}

/**
 * Executes an authenticated GitHub REST request and parses JSON responses.
 *
 * @template T
 * @param {string} token
 * @param {string} method
 * @param {string} pathname
 * @param {Record<string, string | number | boolean | null | undefined>} [queryParams]
 * @param {unknown} [body]
 * @returns {Promise<T | null>}
 */
async function requestJson(token, method, pathname, queryParams, body) {
    const url = new URL(githubApiPath(pathname))
    if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
            if (value === undefined || value === null || value === '') continue
            url.searchParams.set(key, String(value))
        }
    }

    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': apiVersionHeader,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    })

    if (response.status === 204) {
        return null
    }

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${method} ${pathname} failed (${response.status}): ${errorText}`)
    }

    return /** @type {Promise<T>} */ (response.json())
}

/**
 * Executes a REST request and returns `null` for not-found resources.
 *
 * @template T
 * @param {string} token
 * @param {string} method
 * @param {string} pathname
 * @param {Record<string, string | number | boolean | null | undefined>} [queryParams]
 * @param {unknown} [body]
 * @returns {Promise<T | null>}
 */
async function requestJsonOrNull(token, method, pathname, queryParams, body) {
    try {
        return await requestJson(token, method, pathname, queryParams, body)
    } catch (error) {
        if (error instanceof Error && error.message.includes('failed (404):')) {
            return null
        }
        throw error
    }
}

/**
 * Fetches all pages from a REST list endpoint with `per_page=100`.
 *
 * @template T
 * @param {string} token
 * @param {string} pathname
 * @param {Record<string, string | number | boolean | null | undefined>} [baseQueryParams]
 * @returns {Promise<T[]>}
 */
async function requestPaginated(token, pathname, baseQueryParams) {
    /** @type {T[]} */
    const records = []
    for (let page = 1; ; page += 1) {
        const pageData = await requestJson(token, 'GET', pathname, {
            ...baseQueryParams,
            per_page: 100,
            page,
        })
        if (!Array.isArray(pageData) || pageData.length === 0) break
        const typedPageData = /** @type {T[]} */ (pageData)
        records.push(...typedPageData)
        if (pageData.length < 100) break
    }
    return records
}

/**
 * Executes an authenticated GraphQL request.
 *
 * @template T
 * @param {string} token
 * @param {string} query
 * @param {Record<string, unknown>} variables
 * @returns {Promise<T>}
 */
async function requestGraphQL(token, query, variables) {
    const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': apiVersionHeader,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`POST /graphql failed (${response.status}): ${errorText}`)
    }

    const payload = /** @type {{data: T, errors?: Array<{message: string}>}} */ (
        await response.json()
    )
    if (payload.errors?.length) {
        throw new Error(
            `GraphQL errors: ${payload.errors
                .map((graphQLError) => graphQLError.message)
                .join('; ')}`,
        )
    }

    return payload.data
}

/**
 * Fetches all published npm versions for a package.
 *
 * @param {string} packageName
 * @returns {Promise<string[]>}
 */
async function fetchNpmVersions(packageName) {
    const response = await fetch(npmRegistryPath(packageName), {
        headers: {
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
            `npm registry request failed (${response.status}) for ${packageName}: ${errorText}`,
        )
    }

    const packument = /** @type {NpmPackument} */ (await response.json())
    return Object.keys(packument.versions || {})
}

/**
 * Resolves a base SHA for SHA-suffixed prerelease tags by using npm-published versions
 * with the same prerelease prefix and choosing the nearest ancestor in git history.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {string} packageName
 * @param {ParsedTag} currentVersion
 * @param {ShaPrereleaseContext} currentContext
 * @returns {Promise<ShaBaseResolution>}
 */
async function resolveShaPrereleaseBaseRef(
    token,
    owner,
    repo,
    packageName,
    currentVersion,
    currentContext,
) {
    const npmVersions = await fetchNpmVersions(packageName)
    log(
        `Using npm SHA prerelease strategy for ${packageName} (${currentContext.prereleasePrefix}), checking ${npmVersions.length} npm version(s)`,
    )

    /** @type {Map<string, string>} */
    const shaToVersion = new Map()
    for (const npmVersion of npmVersions) {
        const parsedNpmVersion = parseTag(npmVersion)
        if (!parsedNpmVersion) continue
        if (!sameCoreVersion(parsedNpmVersion, currentVersion)) continue

        const npmContext = getShaPrereleaseContext(parsedNpmVersion)
        if (!npmContext) continue
        if (npmContext.prereleasePrefix !== currentContext.prereleasePrefix) continue
        if (npmContext.currentSha === currentContext.currentSha) continue

        if (!shaToVersion.has(npmContext.currentSha)) {
            shaToVersion.set(npmContext.currentSha, npmVersion)
        }
    }

    if (!shaToVersion.size) {
        throw new Error(
            `No prior npm versions found for ${packageName} with prerelease prefix "${currentContext.prereleasePrefix}" and core version ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`,
        )
    }

    /** @type {{baseSha: string, sourceVersion: string, aheadBy: number} | null} */
    let bestMatch = null

    for (const [candidateSha, sourceVersion] of shaToVersion.entries()) {
        try {
            const compareResponse = await requestJson(
                token,
                'GET',
                `/repos/${owner}/${repo}/compare/${encodeURIComponent(candidateSha)}...${encodeURIComponent(currentContext.currentSha)}`,
            )
            /** @type {CompareData} */
            const comparePayload = /** @type {CompareData} */ (compareResponse)

            if (comparePayload.status !== 'ahead') continue
            const aheadBy = comparePayload.ahead_by ?? Number.POSITIVE_INFINITY
            if (!Number.isFinite(aheadBy) || aheadBy <= 0) continue

            if (!bestMatch || aheadBy < bestMatch.aheadBy) {
                bestMatch = {
                    baseSha: candidateSha,
                    sourceVersion,
                    aheadBy,
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            log(
                `Skipping npm candidate ${sourceVersion} (${candidateSha}) because compare failed: ${message}`,
            )
        }
    }

    if (!bestMatch) {
        throw new Error(
            `Could not resolve an ancestor prerelease commit for ${currentContext.currentSha} from npm-published versions`,
        )
    }

    log(
        `Selected npm prerelease base: version=${bestMatch.sourceVersion} base_sha=${bestMatch.baseSha} head_sha=${currentContext.currentSha} ahead_by=${bestMatch.aheadBy}`,
    )

    return {
        baseRef: bestMatch.baseSha,
        headRef: currentContext.currentSha,
        sourceVersion: bestMatch.sourceVersion,
        aheadBy: bestMatch.aheadBy,
    }
}

/**
 * Resolves display metadata for the current release tag.
 *
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {string} currentTag
 * @param {ReleaseRecord | undefined} payloadRelease
 * @returns {Promise<ReleaseInfo>}
 */
async function getCurrentRelease(token, owner, repo, currentTag, payloadRelease) {
    const directRelease = releaseLabelAndUrl(currentTag, payloadRelease)
    if (directRelease) return directRelease

    const apiRelease = await requestJsonOrNull(
        token,
        'GET',
        `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(currentTag)}`,
    )

    if (apiRelease) {
        return {
            tag: apiRelease.tag_name,
            name: apiRelease.name || apiRelease.tag_name,
            htmlUrl:
                apiRelease.html_url ||
                `https://github.com/${owner}/${repo}/releases/tag/${currentTag}`,
        }
    }

    return {
        tag: currentTag,
        name: currentTag,
        htmlUrl: `https://github.com/${owner}/${repo}/releases/tag/${currentTag}`,
    }
}

/**
 * Picks the most recent semver-compatible base tag for comparison.
 *
 * @param {string} currentTag
 * @param {ParsedTag} currentVersion
 * @param {ReleaseRecord[]} allReleases
 * @param {string} manualBaseTag
 * @returns {string}
 */
function pickBaseTag(currentTag, currentVersion, allReleases, manualBaseTag) {
    if (manualBaseTag) {
        const parsedManualTag = parseTag(manualBaseTag)
        if (!parsedManualTag) {
            throw new Error(`Input base-tag "${manualBaseTag}" is not a valid semver tag`)
        }
        return manualBaseTag
    }

    /** @type {Array<{tag: string, version: ParsedTag}>} */
    const parsedReleases = []
    for (const release of allReleases) {
        const version = parseTag(release.tag_name)
        if (!version) continue
        parsedReleases.push({ tag: release.tag_name, version })
    }

    const candidates = parsedReleases
        .filter((release) => release.tag !== currentTag)
        .filter((release) => compareSemver(release.version, currentVersion) < 0)
        .filter((release) => (currentVersion.isPrerelease ? true : !release.version.isPrerelease))
        .sort((left, right) => compareSemver(right.version, left.version))

    if (!candidates.length) {
        const mode = currentVersion.isPrerelease ? 'all semver tags' : 'stable tags'
        throw new Error(`Could not find previous release tag for ${currentTag} in ${mode}`)
    }

    return candidates[0].tag
}

/**
 * Returns true when an associated PR should be skipped based on labels.
 *
 * @param {string[]} skipLabels
 * @param {string[]} prLabels
 * @returns {boolean}
 */
function shouldSkipPr(skipLabels, prLabels) {
    if (!skipLabels.length) return false
    return skipLabels.some((skipLabel) => prLabels.includes(skipLabel))
}
