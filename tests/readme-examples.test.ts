import fs from 'fs'

import { twMerge } from '../src'

const twMergeExampleRegex =
    /twMerge\((?<arguments>[\w\s\-:[\]#(),!\n'"]+?)\)(?!.*(?<!\/\/.*)')\s*\n?\s*\/\/\s*→\s*['"](?<result>.+)['"]/g

test('readme examples', () => {
    expect.assertions(21)

    return fs.promises
        .readFile(`${__dirname}/../README.md`, { encoding: 'utf-8' })
        .then((fileContent) => {
            Array.from(fileContent.matchAll(twMergeExampleRegex)).forEach((match) => {
                // eslint-disable-next-line no-eval
                const args = eval(`[${match.groups!.arguments}]`)
                expect(twMerge(...args)).toBe(match.groups!.result)
            })
        })
})
