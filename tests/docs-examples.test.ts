import fs from 'fs'

import globby from 'globby'

import { twMerge } from '../src'

const twMergeExampleRegex =
    /twMerge\((?<arguments>[\w\s\-:[\]#(),!&\n'"]+?)\)(?!.*(?<!\/\/.*)')\s*\n?\s*\/\/\s*→\s*['"](?<result>.+)['"]/g

test('docs examples', () => {
    expect.assertions(29)

    return forEachFile(['README.md', 'docs/**/*.md'], (fileContent) => {
        Array.from(fileContent.matchAll(twMergeExampleRegex)).forEach((match) => {
            // eslint-disable-next-line no-eval
            const args = eval(`[${match.groups!.arguments}]`)
            expect(twMerge(...args)).toBe(match.groups!.result)
        })
    })
})

async function forEachFile(patterns: string | string[], callback: (fileContent: string) => void) {
    const paths = await globby(patterns, {
        dot: true,
        absolute: true,
        onlyFiles: true,
        unique: true,
    })

    await Promise.all(
        paths.map((filePath) =>
            fs.promises.readFile(filePath, { encoding: 'utf-8' }).then(callback),
        ),
    )
}
