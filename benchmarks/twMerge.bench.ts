import { bench, describe, beforeEach } from 'vitest'

import { createTailwindMerge, getDefaultConfig } from '../src'

import testData from './perf-test-data.json'

describe('twMerge', () => {
    bench('init', () => {
        const twMerge = createTailwindMerge(getDefaultConfig)
        twMerge()
    })

    for (let cached of [true, false] as const) {
        let twMerge: ReturnType<typeof createTailwindMerge>
        const withSuffix = (str: string) => (cached ? str + '(cached)' : str)
        const setup = () => {
            twMerge = createTailwindMerge(() =>
                cached ? getDefaultConfig() : { ...getDefaultConfig(), cacheSize: 0 },
            )

            twMerge()
        }
        describe(cached ? 'cached' : 'pure', () => {
            bench(
                withSuffix('simple'),
                () => {
                    twMerge('flex mx-10 px-10', 'mr-5 pr-5')
                },
                { setup },
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
                { setup },
            )
            bench(
                withSuffix('collection'),
                () => {
                    for (let i = 0; i < testData.length; ++i) {
                        type Item = (typeof testData)[number][number]
                        twMerge(...(testData[i] as Exclude<Item, true>[]))
                    }
                },
                { setup },
            )
        })
    }
})
