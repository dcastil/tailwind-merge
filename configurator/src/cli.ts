import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import { generate } from './generate'

/**
 * Minimal CLI around the library API in generate.ts. Kept deliberately thin: the generation pipeline is the product, and future integrations (bundler plugins, a `--check` CI mode) should reuse the library rather than the CLI.
 */
async function main(argv: string[]) {
    const args = parseArguments(argv)

    if (!args.input || !args.output) {
        console.error(
            'Usage: tailwind-merge-configurator --input <tailwind-css-entrypoint> --output <generated-module-path>',
        )
        process.exitCode = 1
        return
    }

    const inputPath = resolve(args.input)
    const outputPath = resolve(args.output)
    const css = await readFile(inputPath, 'utf8')

    // The generated-file notice itself is emitted unconditionally by emitModule; the CLI adds provenance. The hash makes it possible to detect a stale generated file without re-running generation, and documents which input state the output belongs to.
    const contentHash = createHash('sha256').update(css).digest('hex').slice(0, 16)
    const banner = `// Source: ${relative(dirname(outputPath), inputPath)} (sha256 ${contentHash})`

    const { code, plan } = await generate({ css, base: dirname(inputPath), banner })

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, code)

    console.log(
        `Generated ${relative(process.cwd(), outputPath)} with ${plan.classGroups.size} class groups`,
    )
    console.log(
        `Scale encodings: ${Object.entries(plan.report.scaleStrategies)
            .map(([themeKey, strategy]) => `${themeKey}=${strategy}`)
            .join(' ')}`,
    )
    if (plan.report.prunedClassGroups.length > 0) {
        console.log(`Pruned class groups: ${plan.report.prunedClassGroups.join(', ')}`)
    }
    const augmented = Object.entries(plan.report.augmentedClassGroups)
    if (augmented.length > 0) {
        console.log(
            `Classes added beyond standard namespaces: ${augmented
                .map(([classGroupId, classNames]) => `${classGroupId} += ${classNames.join(', ')}`)
                .join('; ')}`,
        )
    }
    for (const { className, reason } of plan.report.unassignedClasses) {
        console.warn(
            `Warning: could not determine a class group for '${className}' (${reason}). It will be treated like a non-Tailwind class when merging.`,
        )
    }
}

function parseArguments(argv: string[]) {
    const args: { input?: string; output?: string } = {}

    for (let index = 0; index < argv.length; index++) {
        const flag = argv[index]
        if (flag === '--input' || flag === '-i') {
            args.input = argv[++index]
        } else if (flag === '--output' || flag === '-o') {
            args.output = argv[++index]
        }
    }

    return args
}

await main(process.argv.slice(2))
