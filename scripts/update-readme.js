// File can only be executed with zx
import 'zx/globals'
import { pipe } from 'fp-ts/lib/function.js'

import { applyVersionedLogoImage } from './helpers/apply-versioned-logo-image.js'

const ROOT_PATH = `${__dirname}/..`
const README_PATH = `${ROOT_PATH}/README.md`
const PACKAGE_PATH = `${ROOT_PATH}/package.json`

const [readme, packageJson] = await Promise.all([
    fs.readFile(README_PATH, { encoding: 'utf-8' }),
    fs.readFile(PACKAGE_PATH, { encoding: 'utf-8' }),
])

const nextReadme = pipe(readme, (readme) => {
    const { hasPartsToUpdate, updatedText } = applyVersionedLogoImage(readme, packageJson)

    if (!hasPartsToUpdate) {
        throw Error(
            `${chalk.red('[ERROR]')} Could not find versioned logo image to update in README`
        )
    }

    return updatedText
})

if (nextReadme !== readme) {
    await fs.writeFile(README_PATH, nextReadme)
}

await $`git add README.md`
