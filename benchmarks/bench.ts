import { Bench } from 'tinybench'
import { withCodSpeed } from '@codspeed/tinybench-plugin'

import { twMerge } from '../src/index'

import testData from './perf-test-data.json'

const bench = withCodSpeed(new Bench())

bench.add('twMerge (simple)', () => {
    twMerge('flex mx-10 px-10', 'mr-5 pr-5')
})

bench.add('twMerge (heavy)', () => {
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
bench.add('twMerge (collection)', () => {
    for (let i = 0; i < testData.length; ++i) {
        type Item = (typeof testData)[number][number]
        twMerge(...(testData[i] as Exclude<Item, true>[]))
    }
})
;(async () => {
    await bench.run()
    // eslint-disable-next-line no-console
    console.table(bench.table())
})()
