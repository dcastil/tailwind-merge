// @ts-check

import path from 'path'
import { fileURLToPath } from 'url'

const currentDirPath = path.dirname(fileURLToPath(import.meta.url))

export const actionRootPath = path.resolve(currentDirPath, '..')
export const repoRootPath = path.resolve(currentDirPath, '../../../..')
