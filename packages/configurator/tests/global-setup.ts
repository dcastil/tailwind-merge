import { readdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * Vitest global setup, run once before any test worker starts: removes the `.tmp-*` scratch directories earlier runs left behind in tests/ (a crashed or interrupted run skips the per-test cleanup, and a worker killed mid-way never reaches its exit handler). Safe here because no worker is alive yet; the directories are gitignored either way.
 */
export async function setup(): Promise<void> {
    const testsDirectory = fileURLToPath(new URL('.', import.meta.url))
    for (const entry of await readdir(testsDirectory)) {
        if (entry.startsWith('.tmp-')) {
            await rm(new URL(entry, new URL('.', import.meta.url)), { recursive: true, force: true })
        }
    }
}
