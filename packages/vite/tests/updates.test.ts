import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createUpdateScheduler } from '../src/updates'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test.each([
    ['config', 'sources'],
    ['sources', 'config'],
] as const)('coalesces %s then %s into one config update', async (first, second) => {
    const update = vi.fn(async () => {})
    const scheduler = createUpdateScheduler(update, vi.fn())

    scheduler.schedule(first)
    scheduler.schedule(second)
    await vi.runOnlyPendingTimersAsync()

    expect(update).toHaveBeenCalledExactlyOnceWith('config')
})

test('serializes slow updates and retains edits arriving while one is running', async () => {
    const firstRun = Promise.withResolvers<void>()
    const update = vi.fn(async () => {}).mockImplementationOnce(() => firstRun.promise)
    const scheduler = createUpdateScheduler(update, vi.fn())

    scheduler.schedule('sources')
    await vi.runOnlyPendingTimersAsync()
    scheduler.schedule('config')
    scheduler.schedule('sources')
    await vi.runOnlyPendingTimersAsync()
    expect(update).toHaveBeenCalledExactlyOnceWith('sources')

    firstRun.resolve()
    await vi.runOnlyPendingTimersAsync()
    expect(update.mock.calls).toEqual([['sources'], ['config']])
})

test('reports an update failure and still processes the next edit', async () => {
    const error = new Error('update failed')
    const update = vi.fn(async () => {}).mockRejectedValueOnce(error)
    const onError = vi.fn()
    const scheduler = createUpdateScheduler(update, onError)

    scheduler.schedule('config')
    await vi.runOnlyPendingTimersAsync()
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)

    scheduler.schedule('sources')
    await vi.runOnlyPendingTimersAsync()
    expect(update.mock.calls).toEqual([['config'], ['sources']])
})

test('disposal cancels pending edits and ignores later ones', async () => {
    const update = vi.fn(async () => {})
    const scheduler = createUpdateScheduler(update, vi.fn())

    scheduler.schedule('config')
    scheduler.dispose()
    scheduler.schedule('sources')
    await vi.runOnlyPendingTimersAsync()

    expect(update).not.toHaveBeenCalled()
})

test('disposal waits for an active generation and prevents a queued follow-up', async () => {
    const firstRun = Promise.withResolvers<void>()
    const update = vi.fn(() => firstRun.promise)
    const scheduler = createUpdateScheduler(update, vi.fn())

    scheduler.schedule('config')
    await vi.runOnlyPendingTimersAsync()
    scheduler.schedule('sources')
    await vi.runOnlyPendingTimersAsync()
    const onDisposed = vi.fn()
    const disposal = scheduler.dispose()!.then(onDisposed)
    await vi.runOnlyPendingTimersAsync()
    expect(onDisposed).not.toHaveBeenCalled()
    firstRun.resolve()
    await disposal

    expect(update).toHaveBeenCalledExactlyOnceWith('config')
    expect(onDisposed).toHaveBeenCalledOnce()
})
