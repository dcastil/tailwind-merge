import { AnyConfig } from './types'

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
export const createSortModifiers = (config: AnyConfig) => {
    // Create a lookup Map for O(1) access
    const sensitiveModifiers = new Map(config.orderSensitiveModifiers.map((mod) => [mod, true]))

    // Binary search insertion point
    function findInsertionIndex(arr: string[], val: string, start: number, end: number): number {
        if (start >= end) return start

        const mid = Math.floor((start + end) / 2)
        if (arr[mid]! < val) {
            return findInsertionIndex(arr, val, mid + 1, end)
        } else {
            return findInsertionIndex(arr, val, start, mid)
        }
    }

    return function sortModifiers(modifiers: readonly string[]): string[] {
        // Fast path for common cases
        if (modifiers.length <= 1) return [...modifiers]

        const result: string[] = []
        let currentSegment: string[] = []

        // Process modifiers in one pass with binary insertion
        for (let i = 0; i < modifiers.length; i++) {
            const modifier = modifiers[i]!
            const isSensitive = modifier[0] === '[' || sensitiveModifiers.has(modifier)

            if (isSensitive) {
                // Sort and flush current segment
                if (currentSegment.length > 0) {
                    result.push(...currentSegment.sort())
                    currentSegment = []
                }
                result.push(modifier)
            } else {
                // Use binary search insertion for ongoing sorted segment
                if (currentSegment.length === 0) {
                    currentSegment.push(modifier)
                } else {
                    const pos = findInsertionIndex(
                        currentSegment,
                        modifier,
                        0,
                        currentSegment.length,
                    )
                    currentSegment.splice(pos, 0, modifier)
                }
            }
        }

        // Add any remaining segment items
        if (currentSegment.length > 0) {
            result.push(...currentSegment)
        }

        return result
    }
}
