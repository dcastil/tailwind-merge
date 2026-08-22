import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { createTailwindMerge, twMerge as defaultTwMerge } from 'tailwind-merge'
import { createClassGroupUtils } from 'tailwind-merge/unstable-do-not-import'

import { generate } from '../src/index.ts'
import { declaredDeclarations, loadDesignSystems } from '../src/design-system.ts'
import { acceptableResults, mergeVerdict } from '../tests/oracle.ts'

/**
 * Development inspector: shows, for a Tailwind CSS entrypoint and some class lists, what every class compiles to, which class group the generated config (and the default config) puts it in, what both merge functions return, and what Tailwind's compiled CSS says the right answer is. The quickest way to look at a surprising merge or a sweep failure without writing a test first.
 *
 * Usage: node scripts/explain.mts <entrypoint.css> "<class list>" ["<class list>" …] [--encoding exact]
 */
const args = process.argv.slice(2)
const encodingIndex = args.indexOf('--encoding')
const encoding = encodingIndex === -1 ? undefined : (args[encodingIndex + 1] as 'compact' | 'exact')
const positional =
    encodingIndex === -1
        ? args
        : args.filter((_, index) => index !== encodingIndex && index !== encodingIndex + 1)
const [entryPath, ...classLists] = positional

if (entryPath === undefined || classLists.length === 0) {
    console.error(
        'Usage: node scripts/explain.mts <entrypoint.css> "<class list>" ["<class list>" …] [--encoding exact]',
    )
    process.exit(1)
}

const css = await readFile(resolve(entryPath), 'utf8')
const base = dirname(resolve(entryPath))
const { config, plan } = await generate({ css, base, encoding })
const { project } = await loadDesignSystems({ css, base })
const generatedTwMerge = createTailwindMerge(() => config)
const generatedGroupId = createClassGroupUtils(config).getClassGroupId
const defaultGroupId = createClassGroupUtils(
    (await import('tailwind-merge')).getDefaultConfig(),
).getClassGroupId

for (const classList of classLists) {
    const classNames = classList.split(/\s+/).filter(Boolean)
    console.log(`\n${classList}`)
    for (const className of classNames) {
        const declarations = declaredDeclarations(project, className)
        console.log(
            `  ${className}: generated → ${generatedGroupId(className) ?? '(not a Tailwind class)'}, default → ${defaultGroupId(className) ?? '(not a Tailwind class)'}`,
        )
        if (declarations === null) {
            console.log('    compiles to nothing')
        } else {
            for (const entry of declarations) {
                console.log(
                    `    ${entry.context ? `${entry.context} ` : ''}${entry.property}: ${entry.value}${entry.conditional ? '  (conditional)' : ''}`,
                )
            }
        }
    }
    console.log(`  generated twMerge → ${generatedTwMerge(classList)}`)
    console.log(`  default twMerge   → ${defaultTwMerge(classList)}`)
    if (classNames.length === 2) {
        const [first, second] = classNames as [string, string]
        const firstDeclarations = declaredDeclarations(project, first)
        const secondDeclarations = declaredDeclarations(project, second)
        if (firstDeclarations !== null && secondDeclarations !== null) {
            const verdict = mergeVerdict(firstDeclarations, secondDeclarations)
            console.log(
                `  Tailwind's CSS says: ${verdict} → ${acceptableResults(verdict, first, second).join('  or  ')}`,
            )
        }
    }
}

const { unassignedClasses, resolvedCollisions } = plan.report
if (resolvedCollisions.length > 0) {
    console.log(
        `\nResolved name collisions: ${resolvedCollisions
            .map(({ className, keptGroupId }) => `${className} → ${keptGroupId ?? 'neutralized'}`)
            .join(', ')}`,
    )
}
if (unassignedClasses.length > 0) {
    console.log(
        `\nUnassigned classes: ${unassignedClasses.map(({ className, reason }) => `${className} (${reason})`).join(', ')}`,
    )
}
