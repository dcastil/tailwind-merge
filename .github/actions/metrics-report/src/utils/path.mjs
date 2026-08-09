// @ts-check

import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

export const actionRootPath = path.resolve(currentDirPath, '../..')
export const repoRootPath = path.resolve(actionRootPath, '../../..')

/**
 * Resolves the root of the tailwind-merge library package, which holds the manifest with the entry points to measure. The library lives in packages/tailwind-merge since the 2026-08 monorepo restructure, but this action also measures the PR base branch by checking it out in place, and the base can still carry the old layout with the library manifest at the repo root — so this resolves per call against the currently checked-out tree instead of once at import time.
 */
export function getLibraryRootPath() {
    const packagedLibraryPath = path.join(repoRootPath, 'packages/tailwind-merge')

    return existsSync(path.join(packagedLibraryPath, 'package.json'))
        ? packagedLibraryPath
        : repoRootPath
}
