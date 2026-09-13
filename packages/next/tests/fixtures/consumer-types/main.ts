import type { NextConfig } from 'next'
import { type TailwindMergeOptions, withTailwindMerge } from '@tailwind-merge/next'
import {
    type ClassNameValue,
    extendTailwindMerge,
    getConfig,
    twJoin,
    twMerge,
} from '@tailwind-merge/next/runtime'

const options: TailwindMergeOptions = {
    prune: { dev: true },
    encoding: 'exact',
    css: 'app/globals.css',
}
export const config: NextConfig = withTailwindMerge({ reactStrictMode: true }, options)
export const configFunction = withTailwindMerge(async (phase) => ({ env: { PHASE: phase } }))
export const bare: NextConfig = withTailwindMerge()

const classes: ClassNameValue = ['p-2', 'p-4']

export const merged: string = twMerge('text-sm', classes)
export const joined: string = twJoin('a', false, 'b')
export const cacheSize: number = getConfig().cacheSize
export const customMerge = extendTailwindMerge<'pixel'>({
    extend: { classGroups: { pixel: ['pixel'] } },
})
