import { bench as vitestBench, describe, afterAll } from 'vitest'

import { extendTailwindMerge } from '../src'

import testDataCollection from './tw-merge-benchmark-data.json'

type TestDataItem = Exclude<(typeof testDataCollection)[number][number], true>[]

interface MemoryStats {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
}

function getMemoryUsage(): MemoryStats {
    const usage = process.memoryUsage()
    return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0 || !Number.isFinite(bytes)) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Forces garbage collection if available (requires Node.js --expose-gc flag).
 * Used to establish clean memory baselines for accurate memory measurements.
 */
async function forceGarbageCollection(): Promise<void> {
    if (typeof globalThis.gc === 'function') {
        await globalThis.gc()
    } else {
        console.warn(
            'Garbage collection not exposed. Run with --expose-gc for accurate memory measurements.',
        )
    }
}

// Guard to ensure memory summary is printed exactly once. teardown() runs after every
// benchmark iteration, so without this guard the summary would be printed multiple times
// (once per iteration of the last benchmark).
let summaryPrinted = false

const memoryData = new Map<string, { before: MemoryStats; after: MemoryStats }>()

const benchmarkNames: string[] = []

describe('twMerge', () => {
    function bench(name: string, fn: () => void, options?: { iterations?: number; time?: number }) {
        benchmarkNames.push(name)

        let iterationBefore: MemoryStats | null = null
        let peakMemoryDelta = 0

        vitestBench(
            name,
            () => {
                const beforeExecution = getMemoryUsage()
                fn()
                const afterExecution = getMemoryUsage()

                const data = memoryData.get(name)
                if (data && iterationBefore) {
                    const executionDelta = afterExecution.heapUsed - beforeExecution.heapUsed
                    if (executionDelta > peakMemoryDelta) {
                        peakMemoryDelta = executionDelta
                        data.after = {
                            ...afterExecution,
                            heapUsed: iterationBefore.heapUsed + peakMemoryDelta,
                        }
                    }
                }
            },
            {
                ...options,
                setup: async () => {
                    // Memory measurement strategy: Force GC twice to establish a clean baseline.
                    // First GC collects garbage from previous benchmark runs. Second GC ensures
                    // we're at a stable, minimal memory state before taking our baseline measurement.
                    // This prevents interference from lingering allocations between benchmarks.
                    await forceGarbageCollection()
                    await forceGarbageCollection()

                    const currentMemory = getMemoryUsage()

                    if (!memoryData.has(name)) {
                        iterationBefore = currentMemory
                        memoryData.set(name, {
                            before: iterationBefore,
                            after: iterationBefore,
                        })
                    }
                },
                teardown: forceGarbageCollection,
            },
        )
    }

    bench('init', () => {
        const twMerge = extendTailwindMerge({})

        twMerge()
    })

    bench('simple', () => {
        const twMerge = extendTailwindMerge({})

        twMerge('flex mx-10 px-10', 'mr-5 pr-5')
    })

    bench('heavy', () => {
        const twMerge = extendTailwindMerge({})

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

    bench('collection with cache', () => {
        const twMerge = extendTailwindMerge({})

        for (let index = 0; index < testDataCollection.length; ++index) {
            twMerge(...(testDataCollection[index] as TestDataItem))
        }
    })

    bench('collection without cache', () => {
        const twMerge = extendTailwindMerge({ cacheSize: 0 })

        for (let index = 0; index < testDataCollection.length; ++index) {
            twMerge(...(testDataCollection[index] as TestDataItem))
        }
    })
})

afterAll(() => {
    const lines: string[] = ['\nMemory Usage Summary:']
    for (const [benchName, benchData] of memoryData.entries()) {
        const memoryDelta = benchData.after.heapUsed - benchData.before.heapUsed
        lines.push(`  ${benchName}: ${formatBytes(memoryDelta)} heap`)
        if (benchName.includes('collection')) {
            lines.push(`    Total footprint: ${formatBytes(benchData.after.rss)}`)
            lines.push(`    Operations: ${testDataCollection.length}`)
        }
    }
    console.log(lines.join('\n'))
})
