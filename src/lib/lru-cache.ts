import HLRU from 'hashlru'

// Export is needed because TypeScript complains about an error otherwise:
// Error: …/tailwind-merge/src/config-utils.ts(8,17): semantic error TS4058: Return type of exported function has or is using name 'LruCache' from external module "…/tailwind-merge/src/lru-cache" but cannot be named.
export interface LruCache<T> {
    get(key: string): T | undefined
    set(key: string, value: T): void
}

export function getLruCache<T>(cacheSize: number): LruCache<T> {
    if (cacheSize >= 1) {
        return HLRU(cacheSize)
    }

    return {
        get: () => undefined,
        set: () => {},
    }
}
