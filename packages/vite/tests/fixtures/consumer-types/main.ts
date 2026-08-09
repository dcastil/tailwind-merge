import {
    type ClassNameValue,
    extendTailwindMerge,
    getConfig,
    twJoin,
    twMerge,
} from '@tailwind-merge/vite/runtime'

const classes: ClassNameValue = ['p-2', 'p-4']

export const merged: string = twMerge('text-sm', classes)
export const joined: string = twJoin('a', false, 'b')
export const cacheSize: number = getConfig().cacheSize
export const customMerge = extendTailwindMerge<'pixel'>({
    extend: { classGroups: { pixel: ['pixel'] } },
})
