import { AnyConfig } from './types'

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
export const createSortModifiers = (config: AnyConfig) => {
    // Pre-compute weights for all known modifiers for O(1) comparison
    const modifierWeights = new Map<string, number>()

    // Assign weights to sensitive modifiers (highest priority, but preserve order)
    config.orderSensitiveModifiers.forEach((mod, index) => {
        modifierWeights.set(mod, 1000000 + index) // High weights for sensitive mods
    })

    return function sortModifiers(modifiers: readonly string[]): string[] {
        // Fast path for common cases
        if (modifiers.length <= 1) return [...modifiers]

        const result: string[] = []
        let currentSegment: string[] = []

        // Process modifiers in one pass
        for (let i = 0; i < modifiers.length; i++) {
            const modifier = modifiers[i]!

            // Check if modifier is sensitive (starts with '[' or in orderSensitiveModifiers)
            const isArbitrary = modifier[0] === '['
            const isOrderSensitive = modifierWeights.has(modifier)

            if (isArbitrary || isOrderSensitive) {
                // Sort and flush current segment using numeric weights
                if (currentSegment.length > 0) {
                    currentSegment.sort((a, b) => {
                        const weightA = modifierWeights.get(a)
                        const weightB = modifierWeights.get(b)
                        if (weightA !== undefined && weightB !== undefined) {
                            return weightA - weightB
                        }
                        if (weightA !== undefined) return -1
                        if (weightB !== undefined) return 1
                        return a.localeCompare(b)
                    })
                    result.push(...currentSegment)
                    currentSegment = []
                }
                result.push(modifier)
            } else {
                // Regular modifier - add to current segment for batch sorting
                currentSegment.push(modifier)
            }
        }

        // Sort and add any remaining segment items
        if (currentSegment.length > 0) {
            currentSegment.sort((a, b) => {
                const weightA = modifierWeights.get(a)
                const weightB = modifierWeights.get(b)
                if (weightA !== undefined && weightB !== undefined) {
                    return weightA - weightB
                }
                if (weightA !== undefined) return -1
                if (weightB !== undefined) return 1
                return a.localeCompare(b)
            })
            result.push(...currentSegment)
        }

        return result
    }
}
