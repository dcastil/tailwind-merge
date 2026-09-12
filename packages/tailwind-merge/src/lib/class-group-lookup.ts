import { createConfigUtils } from './config-utils'
import { mergeClassList } from './merge-classlist'
import { AnyConfig } from './types'

/**
 * Observes every successful class-map lookup needed to merge a single candidate. Build-time pruning needs intermediate base matches as well as a final slash match, or removing a base matcher can change runtime precedence.
 * Reuse the merge engine rather than reproducing its decisions. Instrumentation stays in this tooling-only entry point and adds no work to normal merging.
 */
export const createClassGroupLookup = (config: AnyConfig) => {
    const configUtils = createConfigUtils(config)

    return (className: string) => {
        const matches: { className: string; classGroupId: string }[] = []
        mergeClassList(className, {
            ...configUtils,
            getClassGroupId(lookupName) {
                const classGroupId = configUtils.getClassGroupId(lookupName)
                if (classGroupId) {
                    matches.push({ className: lookupName, classGroupId })
                }
                return classGroupId
            },
        })
        return matches
    }
}
