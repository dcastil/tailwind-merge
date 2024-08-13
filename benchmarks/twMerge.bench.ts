import { bench, describe } from 'vitest'

import { twMerge } from '../src'

import testData from './perf-test-data.json'

describe('twMerge', () => {
    bench('simple', () => {
        twMerge('flex mx-10 px-10', 'mr-5 pr-5')
    })

    bench('heavy', () => {
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
    })
    bench('collection', () => {
        for (let i = 0; i < testData.length; ++i) {
            type Item = (typeof testData)[number][number]
            twMerge(...(testData[i] as Exclude<Item, true>[]))
        }
    })
})
