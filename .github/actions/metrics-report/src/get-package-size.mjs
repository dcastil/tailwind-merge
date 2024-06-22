// @ts-check

import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import zlib from 'zlib'

import core from '@actions/core'
import { exec } from '@actions/exec'
import { transform } from 'esbuild'
import { rollup } from 'rollup'

import { actionRootPath, repoRootPath } from './utils.mjs'

/**
 * @typedef {object} BundleConfiguration
 * @property {string} path
 * @property {'esm' | 'cjs'} format
 * @property {boolean=} shouldMeasureIndividualExports
 */

/** @type {BundleConfiguration[]} */
const bundleConfigs = [
    {
        path: 'dist/bundle-mjs.mjs',
        format: 'esm',
        shouldMeasureIndividualExports: true,
    },
    {
        path: 'dist/bundle-cjs.js',
        format: 'cjs',
    },
    {
        path: 'dist/es5/bundle-mjs.mjs',
        format: 'esm',
    },
    {
        path: 'dist/es5/bundle-cjs.js',
        format: 'cjs',
    },
]

/**
 * @typedef {object} GetPackageSizeOptions
 * @property {string=} branch
 */

/**
 * @param {GetPackageSizeOptions=} param0
 */
export async function getPackageSize({ branch } = {}) {
    if (branch) {
        await checkoutBranch(branch)
    }

    await buildPackage()

    return getBundleSizes({ shouldOmitFailures: Boolean(branch) })
}

/**
 * @param {string} branch
 */
async function checkoutBranch(branch) {
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

async function buildPackage() {
    core.info('Installing dependencies')
    await exec('yarn install --frozen-lockfile', [], { cwd: repoRootPath })

    core.info('Building package')
    await exec('yarn build', [], { cwd: repoRootPath })
}

/**
 * @typedef {object} GetBundleSizeOptions
 * @property {boolean=} shouldOmitFailures
 */

/**
 * @typedef {object} OverallBundleSize
 * @property {BundleSize} bundleSize
 * @property {BundleSize[]=} singleExportSizes
 */

/**
 * @param {GetBundleSizeOptions} param0
 * @returns {Promise<OverallBundleSize[]>}
 */
async function getBundleSizes({ shouldOmitFailures }) {
    core.info('Getting bundle sizes')

    const maybeBundleSizes = await Promise.all(
        bundleConfigs.map(async (bundleConfig, bundleIndex) => {
            const bundlePath = path.resolve(repoRootPath, bundleConfig.path)

            const bundle = await getBundle(bundleConfig, bundlePath).catch((error) => {
                if (shouldOmitFailures) {
                    core.info(`Failed to get bundle for ${bundleConfig.path}: ${error.message}`)
                    return
                }

                throw error
            })

            if (!bundle) {
                return
            }

            const [bundleSize, singleExportSizes] = await Promise.all([
                getBundleSize(bundleConfig.path, bundle),
                getSingleExportBundleSizes(bundleConfig, bundleIndex, bundlePath, bundle),
            ])

            return {
                bundleSize,
                singleExportSizes,
            }
        }),
    )

    /** @type {any} */
    const bundleSizes = maybeBundleSizes.filter((bundleSize) => bundleSize !== undefined)

    return bundleSizes
}

/**
 * @param {BundleConfiguration} bundleConfig
 * @param {string} entryPoint
 */
async function getBundle(bundleConfig, entryPoint) {
    const rollupBuild = await rollup({ input: entryPoint })
    let rollupOutput

    try {
        rollupOutput = await rollupBuild.generate({
            format: bundleConfig.format,
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
 * @param {BundleConfiguration} bundleConfig
 * @param {number} bundleIndex
 * @param {string} bundlePath
 * @param {import('rollup').OutputChunk} bundle
 */
async function getSingleExportBundleSizes(bundleConfig, bundleIndex, bundlePath, bundle) {
    if (
        bundleConfig.shouldMeasureIndividualExports &&
        bundleConfig.format === 'esm' &&
        bundle.exports.length !== 0
    ) {
        const singleExportBundlesDirPath = path.resolve(
            actionRootPath,
            `temp/bundle-${bundleIndex}`,
        )

        await fs.mkdir(singleExportBundlesDirPath, { recursive: true })

        return Promise.all(
            bundle.exports.map(async (exportName) => {
                const entryPoint = await createEntryPoint(
                    singleExportBundlesDirPath,
                    bundlePath,
                    exportName,
                )

                const singleExportBundle = await getBundle(bundleConfig, entryPoint)

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
