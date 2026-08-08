import { validators } from '../../src'
import { AnyConfig, ClassGroup } from '../../src/lib/types'

import { ConfigPlan, PlanValue } from './plan'

/**
 * Turns a plan into a runtime config object, the in-memory equivalent of the emitted module.
 *
 * Exists so tests and programmatic consumers can use the generated behavior directly without writing the emitted source to disk and importing it. Because both this and the emitter read the same plan, the two outputs describe the same config by construction.
 */
export const materializeConfig = (plan: ConfigPlan): AnyConfig => ({
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
})

const materializeValue = (value: PlanValue): ClassGroup<string>[number] =>
    value.kind === 'class'
        ? value.value
        : value.kind === 'validator'
          ? validators[value.name]
          : Object.fromEntries(
                value.entries.map(([key, items]) => [key, items.map(materializeValue)]),
            )
