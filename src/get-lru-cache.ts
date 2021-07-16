import HLRU from 'hashlru'

interface LruCache<T> {
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
