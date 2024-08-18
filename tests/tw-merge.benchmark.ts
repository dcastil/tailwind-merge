import { beforeEach, bench, BenchOptions, BenchTask, describe } from 'vitest'

import { ClassNameValue, extendTailwindMerge } from '../src'

import testData from './tw-merge-benchmark-data.json'

console.log('CI env variable:', JSON.stringify(process.env.CI))

describe('twMerge', () => {
    bench('init', () => {
        const twMerge = extendTailwindMerge({})
        twMerge()
    })

    for (const isCached of [true, false]) {
        describe(isCached ? 'cached' : 'uncached', () => {
            let consoleIndex = 0

            let twMerge: (...classLists: ClassNameValue[]) => string

            function setup(task: BenchTask) {
                task.opts.beforeEach = function beforeEach() {
                    if (consoleIndex < 100) {
                        console.log('setup beforeEach')
                        consoleIndex++
                    }

                    twMerge = extendTailwindMerge({
                        cacheSize: isCached ? undefined : 0,
                    })

                    twMerge()
                }
            }

            const withSuffix = (str: string) => str + ' ' + (isCached ? '(cached)' : '(uncached)')

            const options: BenchOptions | undefined = process.env.CI
                ? undefined
                : {
                      warmupTime: 10,
                      time: 50,
                      setup,
                  }

            if (process.env.CI) {
                // codespeed tries to optimize function, before actual setup call - we need to adopt
                beforeEach(() => {
                    if (consoleIndex < 100) {
                        console.log('beforeEach')
                        consoleIndex++
                    }

                    twMerge = extendTailwindMerge({
                        cacheSize: isCached ? undefined : 0,
                    })

                    twMerge()
                })
            }

            bench(
                withSuffix('simple'),
                () => {
                    if (consoleIndex < 100) {
                        console.log('simple')
                        consoleIndex++
                    }

                    twMerge('flex mx-10 px-10', 'mr-5 pr-5')
                },
                options,
            )

            bench(
                withSuffix('heavy'),
                () => {
                    twMerge(
                        'font-medium text-sm leading-16',
                        'group/button relative isolate items-center justify-center overflow-hidden rounded-md outline-none transition [-webkit-app-region:no-drag] focus-visible:ring focus-visible:ring-primary',
                        'inline-flex',
                        'bg-primary-50 ring ring-primary-200',
                        'text-primary dark:text-primary-900 hover:bg-primary-100',
                        false,
                        'font-medium text-sm leading-16 gap-4 px-6 py-4',
                        null,
                        'p-0 size-24',
                        null,
                    )
                },
                options,
            )

            bench(
                withSuffix('collection'),
                () => {
                    for (let i = 0; i < testData.length; ++i) {
                        type Item = (typeof testData)[number][number]
                        twMerge(...(testData[i] as Exclude<Item, true>[]))
                    }
                },
                options,
            )
        })
    }
})
