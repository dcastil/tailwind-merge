export type UpdateTrigger = 'config' | 'sources'

/**
 * Coalesces dev-server edits without losing a CSS change or allowing generations to race. A config update subsumes source updates because it recreates the scanner as well. Edits arriving during a run are retained for the next run; disposal cancels pending work and lets Vite await an active generation before restarting the server.
 */
export function createUpdateScheduler(
    update: (trigger: UpdateTrigger) => Promise<void>,
    onError: (error: unknown) => void,
) {
    let pending: UpdateTrigger | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let running: Promise<void> | undefined
    let disposed = false

    return {
        schedule(trigger: UpdateTrigger) {
            if (disposed) {
                return
            }
            pending = pending === 'config' ? pending : trigger
            clearTimeout(timer)
            timer = setTimeout(() => {
                timer = undefined
                flush()
            }, UPDATE_DEBOUNCE_MS)
        },
        dispose() {
            disposed = true
            clearTimeout(timer)
            timer = undefined
            pending = undefined
            return running
        },
    }

    function flush() {
        if (running || disposed || pending === undefined) {
            return
        }
        const trigger = pending
        pending = undefined
        running = Promise.resolve()
            .then(() => update(trigger))
            .catch(onError)
            .finally(() => {
                running = undefined
                // An expired debounce may have found an active run. Drain its queued update now; a still-pending timer keeps its own debounce window.
                if (timer === undefined && pending !== undefined && !disposed) {
                    flush()
                }
            })
    }
}

const UPDATE_DEBOUNCE_MS = 100
