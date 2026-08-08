import { validators } from 'tailwind-merge'
import { AnyConfig, ClassGroup } from 'tailwind-merge/unstable-do-not-import'

import { ConfigPlan, PlanValue } from './plan'

/**
 * Turns a plan into a runtime config object, the in-memory equivalent of the emitted module.
 *
 * Exists so tests and programmatic consumers can use the generated behavior directly without writing the emitted source to disk and importing it. Because both this and the emitter read the same plan, the two outputs describe the same config by construction.
 */
export function materializeConfig(plan: ConfigPlan): AnyConfig {
    return {
        cacheSize: plan.cacheSize,
        ...(plan.prefix === null ? {} : { prefix: plan.prefix }),
        theme: {},
        classGroups: Object.fromEntries(
            [...plan.classGroups].map(([classGroupId, items]) => [
                classGroupId,
                items.map(materializeValue),
            ]),
        ),
        conflictingClassGroups: Object.fromEntries(plan.conflictingClassGroups),
        conflictingClassGroupModifiers: Object.fromEntries(plan.conflictingClassGroupModifiers),
        postfixLookupClassGroups: plan.postfixLookupClassGroups,
        orderSensitiveModifiers: plan.orderSensitiveModifiers,
    }
}

function materializeValue(value: PlanValue): ClassGroup<string>[number] {
    if (value.kind === 'class') {
        return value.value
    }
    if (value.kind === 'validator') {
        return validators[value.name]
    }
    return Object.fromEntries(
        value.entries.map(([key, items]) => [key, items.map(materializeValue)]),
    )
}
