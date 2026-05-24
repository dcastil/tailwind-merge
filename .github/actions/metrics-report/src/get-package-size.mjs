// @ts-check

import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import zlib from 'zlib'

import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { transform } from 'esbuild'
import { rollup } from 'rollup'

import { actionRootPath, repoRootPath } from './utils/path.mjs'

/**
 * @typedef {object} GetPackageSizeOptions
 * @property {boolean=} shouldOmitFailures
 */

/**
 * @param {GetPackageSizeOptions=} options
 */
export async function getPackageSize(options = {}) {
    const didBuildPackage = await buildPackage(options)

    if (!didBuildPackage) {
        return []
    }

    return getEntryPointSizes(options)
}

/**
 * The base branch can briefly be impossible to build while a pull request changes repository tooling. In that case, callers that request omitted failures should still get a report for the head commit instead of failing before any metrics are written.
 *
 * @param {GetPackageSizeOptions} options
 * @returns {Promise<boolean>}
 */
async function buildPackage({ shouldOmitFailures }) {
    core.info('Installing dependencies')
    const installExitCode = await exec('pnpm install --frozen-lockfile', [], {
        cwd: repoRootPath,
        ignoreReturnCode: shouldOmitFailures,
    })

    if (installExitCode !== 0) {
        if (shouldOmitFailures) {
            core.info('Skipping package size collection because dependency installation failed')
            return false
        }

        throw Error('Failed to install dependencies')
    }

    core.info('Building package')
    const buildExitCode = await exec('pnpm build', [], {
        cwd: repoRootPath,
        ignoreReturnCode: shouldOmitFailures,
    })

    if (buildExitCode !== 0) {
        if (shouldOmitFailures) {
            core.info('Skipping package size collection because the package build failed')
            return false
        }

        throw Error('Failed to build package')
    }

    return true
}

/**
 * @typedef {object} EntryPointSize
 * @property {BundleSize} bundleSize
 * @property {BundleSize[]=} singleExportSizes
 */

/**
 * @param {GetPackageSizeOptions} param0
 * @returns {Promise<EntryPointSize[]>}
 */
async function getEntryPointSizes({ shouldOmitFailures }) {
    core.info('Getting entry point configs')
    const entryPointConfigs = await getEntryPointConfigs()

    core.info('Getting bundle sizes')

    const maybeEntryPointSizes = await Promise.all(
        entryPointConfigs.map(async (entryPointConfig, entryPointIndex) => {
            const entryPointBundlePath = path.resolve(repoRootPath, entryPointConfig.bundlePath)

            const bundle = await getBundle(entryPointConfig, entryPointBundlePath).catch(
                (error) => {
                    if (shouldOmitFailures) {
                        core.info(
                            `Failed to get bundle for ${entryPointConfig.entryPoint}: ${error.message}`,
                        )
                        return
                    }

                    throw error
                },
            )

            if (!bundle) {
                return
            }

            const [bundleSize, singleExportSizes] = await Promise.all([
                getBundleSize(entryPointConfig.entryPoint, bundle),
                getSingleExportBundleSizes(
                    entryPointConfig,
                    entryPointIndex,
                    entryPointBundlePath,
                    bundle,
                ),
            ])

            return {
                bundleSize,
                singleExportSizes,
            }
        }),
    )

    /** @type {any} */
    const entryPointSizes = maybeEntryPointSizes.filter((bundleSize) => bundleSize !== undefined)

    return entryPointSizes
}

/**
 * @typedef {object} EntryPointConfiguration
 * @property {string} entryPoint
 * @property {string} bundlePath
 * @property {'esm' | 'cjs'} format
 */

/**
 * @returns {Promise<EntryPointConfiguration[]>}
 */
async function getEntryPointConfigs() {
    const pkg = (await import('../../../../package.json', { assert: { type: 'json' } })).default

    return Object.entries(pkg.exports).flatMap(([relativeEntryPointPath, bundleObject]) => {
        const entryPointPath = path.join('tailwind-merge', relativeEntryPointPath)

        /** @type {EntryPointConfiguration[]} */
        const entryPointConfigs = []

        if (bundleObject.import) {
            entryPointConfigs.push({
                entryPoint: entryPointPath + ' esm',
                bundlePath: bundleObject.import,
                format: 'esm',
            })
        }

        if (bundleObject.require) {
            entryPointConfigs.push({
                entryPoint: entryPointPath + ' cjs',
                bundlePath: bundleObject.require,
                format: 'cjs',
            })
        }

        return entryPointConfigs
    })
}

/**
 * @param {EntryPointConfiguration} entryPointConfig
 * @param {string} entryPoint
 */
async function getBundle(entryPointConfig, entryPoint) {
    const rollupBuild = await rollup({ input: entryPoint })
    let rollupOutput

    try {
        rollupOutput = await rollupBuild.generate({
            format: entryPointConfig.format,
        })
    } catch (error) {
        await rollupBuild.close()
        throw error
    }

    await rollupBuild.close()

    if (rollupOutput.output.length !== 1) {
        throw Error(`Expected a single output chunk for bundle ${entryPoint}`)
    }

    const outputChunk = rollupOutput.output[0]

    return outputChunk
}

/**
 * @param {EntryPointConfiguration} entryPointConfig
 * @param {number} entryPointIndex
 * @param {string} bundlePath
 * @param {import('rollup').OutputChunk} bundle
 */
async function getSingleExportBundleSizes(entryPointConfig, entryPointIndex, bundlePath, bundle) {
    if (entryPointConfig.format === 'esm' && bundle.exports.length !== 0) {
        const singleExportBundlesDirPath = path.resolve(
            actionRootPath,
            `temp/bundle-${entryPointIndex}`,
        )

        await fs.mkdir(singleExportBundlesDirPath, { recursive: true })

        return Promise.all(
            bundle.exports.map(async (exportName) => {
                const entryPoint = await createEntryPoint(
                    singleExportBundlesDirPath,
                    bundlePath,
                    exportName,
                )

                const singleExportBundle = await getBundle(entryPointConfig, entryPoint)

                return getBundleSize(exportName, singleExportBundle)
            }),
        )
    }
}

/**
 * @param {string} singleExportBundlesDirPath
 * @param {string} bundlePath
 * @param {string} exportName
 */
async function createEntryPoint(singleExportBundlesDirPath, bundlePath, exportName) {
    const filePath = path.resolve(singleExportBundlesDirPath, `${exportName}.mjs`)
    const fileContent = `export { ${exportName} } from '${bundlePath}'`

    await fs.writeFile(filePath, fileContent)

    return filePath
}

/**
 * @typedef {object} BundleSize
 * @property {string} label
 * @property {number} size
 * @property {number} sizeMinified
 * @property {number} sizeBrotliCompressed
 */

/**
 * @param {string} label
 * @param {import('rollup').OutputChunk} bundle
 * @returns {Promise<BundleSize>}
 */
async function getBundleSize(label, bundle) {
    const esBuildTransformResult = await transform(bundle.code, { minify: true })
    const minifiedCode = esBuildTransformResult.code
    const brotliCompressedCode = (await brotliCompress(minifiedCode)).toString()

    return {
        label,
        size: bundle.code.length,
        sizeMinified: minifiedCode.length,
        sizeBrotliCompressed: brotliCompressedCode.length,
    }
}

const brotliCompress = promisify(zlib.brotliCompress)
