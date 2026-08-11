import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

import { generate } from './generate.ts'

/**
 * The CLI's behavior as a function returning the process exit code, separated from the executable entry in cli.ts so tests can drive it. Kept deliberately thin: the generation pipeline in generate.ts is the product, and future integrations (bundler plugins) should reuse the library rather than the CLI.
 */
export async function runCli(argv: string[]): Promise<number> {
    const args = parseArguments(argv)

    if (!args.input || !args.output || (args.format && args.format !== 'ts' && args.format !== 'js')) {
        console.error(
            'Usage: @tailwind-merge/configurator --input <tailwind-css-entrypoint> --output <generated-module-path> [--format ts|js] [--check]',
        )
        return 1
    }

    const inputPath = resolve(args.input)
    const outputPath = resolve(args.output)
    const css = await readFile(inputPath, 'utf8')

    // Not every project uses TypeScript, so the emitted language follows the output file's extension unless --format overrides it. Invalid --format values were rejected above, so the fallthrough here only happens when the flag is absent.
    const format: 'ts' | 'js' =
        args.format === 'js' || args.format === 'ts'
            ? args.format
            : /\.[cm]?js$/.test(outputPath)
              ? 'js'
              : 'ts'

    // The generated-file notice itself is emitted unconditionally by emitModule; the CLI adds provenance. The hash makes the emitted module deterministic per input state, which is what allows --check to compare full file contents.
    const contentHash = createHash('sha256').update(css).digest('hex').slice(0, 16)
    const banner = `// Source: ${relative(dirname(outputPath), inputPath)} (sha256 ${contentHash})`

    const { code, plan } = await generate({ css, base: dirname(inputPath), banner, format })
    const displayPath = relative(process.cwd(), outputPath)

    if (args.check) {
        const existingCode = await readFile(outputPath, 'utf8').catch(() => null)
        if (existingCode === code) {
            console.log(`${displayPath} is up to date`)
            return 0
        }
        console.error(
            existingCode === null
                ? `${displayPath} is missing. Run the configurator without --check to generate it.`
                : `${displayPath} is out of date. Run the configurator without --check to regenerate it.`,
        )
        return 1
    }

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, code)

    console.log(`Generated ${displayPath} with ${plan.classGroups.size} class groups`)
    console.log(
        `Scale encodings: ${Object.entries(plan.report.scaleStrategies)
            .map(([themeKey, strategy]) => `${themeKey}=${strategy}`)
            .join(' ')}`,
    )
    if (plan.report.prunedClassGroups.length > 0) {
        console.log(`Pruned class groups: ${plan.report.prunedClassGroups.join(', ')}`)
    }
    if (plan.report.customUtilityGroups.length > 0) {
        console.log(
            `Self-conflict groups for custom utilities: ${plan.report.customUtilityGroups.join(', ')}`,
        )
    }
    const aliased = Object.entries(plan.report.aliasedUtilityClasses)
    if (aliased.length > 0) {
        console.log(
            `Custom utilities joining built-in groups as aliases: ${aliased
                .map(([className, classGroupId]) => `${className} → ${classGroupId}`)
                .join(', ')}`,
        )
    }
    const utilityConflicts = Object.entries(plan.report.customUtilityConflicts)
    if (utilityConflicts.length > 0) {
        console.log(
            `Inferred overrides for custom utilities: ${utilityConflicts
                .map(([classGroupId, covered]) => `${classGroupId} overrides ${covered.join(', ')}`)
                .join('; ')}`,
        )
    }
    const augmented = Object.entries(plan.report.augmentedClassGroups)
    if (augmented.length > 0) {
        console.log(
            `Classes added beyond standard namespaces: ${augmented
                .map(([classGroupId, classNames]) => `${classGroupId} += ${classNames.join(', ')}`)
                .join('; ')}`,
        )
    }
    for (const { className, keptGroupId, removedFromGroupIds } of plan.report.resolvedCollisions) {
        console.log(
            keptGroupId === null
                ? `Resolved name collision: '${className}' resolves through multiple utilities and will pass through unmerged`
                : `Resolved name collision: '${className}' stays in ${keptGroupId}, removed the shadowing value from ${removedFromGroupIds.join(', ')}`,
        )
    }
    for (const { className, reason } of plan.report.unassignedClasses) {
        console.warn(
            `Warning: could not determine a class group for '${className}' (${reason}). It will be treated like a non-Tailwind class when merging.`,
        )
    }

    return 0
}

function parseArguments(argv: string[]) {
    const args: { input?: string; output?: string; format?: string; check: boolean } = {
        check: false,
    }

    for (let index = 0; index < argv.length; index++) {
        const flag = argv[index]
        if (flag === '--input' || flag === '-i') {
            args.input = argv[++index]
        } else if (flag === '--output' || flag === '-o') {
            args.output = argv[++index]
        } else if (flag === '--format') {
            args.format = argv[++index]
        } else if (flag === '--check') {
            args.check = true
        }
    }

    return args
}
