// File can only be executed with zx
/// <reference types="zx"/>

import packageBuildStats from 'package-build-stats'
import { pipe } from 'fp-ts/lib/function.js'

import { applyPackageStats } from './helpers/apply-package-stats.js'
import { applyVersionedLogoImage } from './helpers/apply-versioned-logo-image.js'

const ROOT_PATH = `${__dirname}/..`
const README_PATH = `${ROOT_PATH}/README.md`
const PACKAGE_PATH = `${ROOT_PATH}/package.json`

await $`yarn build`

const [packageStats, readme, packageJson] = await Promise.all([
    packageBuildStats.getPackageStats(ROOT_PATH),
    fs.readFile(README_PATH, { encoding: 'utf-8' }),
    fs.readFile(PACKAGE_PATH, { encoding: 'utf-8' }),
])

const nextReadme = pipe(
    readme,
    (readme) => {
        const { gzipSize, composition, hasPartsToUpdate, updatedText } = applyPackageStats(
            packageStats,
            readme
        )

        console.log(
            `${chalk.blue(
                '[INFO]'
            )} Package stats: Total ${gzipSize} kB minified + gzipped, ${composition}`
        )

        if (!hasPartsToUpdate) {
            throw Error(
                `${chalk.red('[ERROR]')} Could not find package stats parts to update in README.`
            )
        }

        return updatedText
    },
    (readme) => {
        const { hasPartsToUpdate, updatedText } = applyVersionedLogoImage(readme, packageJson)

        if (!hasPartsToUpdate) {
            throw Error(
                `${chalk.red('[ERROR]')} Could not find versioned logo image to update in README`
            )
        }

        return updatedText
    }
)

if (nextReadme !== readme) {
    await fs.writeFile(README_PATH, nextReadme)
}

await $`git add README.md`
