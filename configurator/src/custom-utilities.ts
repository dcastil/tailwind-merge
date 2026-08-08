import { DesignSystemAccess } from './design-system'
import { PlanValue } from './plan'

/**
 * Builds self-conflict class groups for utilities the project registers beyond the built-ins — both `@utility` definitions in CSS and utilities added by `@plugin` JS plugins land in the same registry, so one diff covers both.
 *
 * Scope is deliberately bounded (see PROPOSAL.md): each custom utility root becomes its own group so it merges against itself — a static root as a single-class group, a functional root matching any value under it. No conflict relationships against built-in groups are inferred, because utilities that set many CSS properties would need edges against many groups and make the config large and misleading. Roots that already exist as built-ins are skipped entirely: shadowing changes built-in behavior in ways a diff of registries cannot judge.
 */
export function buildCustomUtilityGroups(
    project: DesignSystemAccess,
    vanilla: DesignSystemAccess,
): Map<string, PlanValue[]> {
    const vanillaRoots = new Set([
        ...vanilla.utilities.keys('static'),
        ...vanilla.utilities.keys('functional'),
    ])

    const groups = new Map<string, PlanValue[]>()

    for (const root of project.utilities.keys('static')) {
        if (!vanillaRoots.has(root)) {
            groups.set(customUtilityGroupId(root), [{ kind: 'class', value: root }])
        }
    }

    for (const root of project.utilities.keys('functional')) {
        if (vanillaRoots.has(root)) {
            continue
        }
        const groupId = customUtilityGroupId(root)
        const items = groups.get(groupId) ?? []
        // `isAny` under the root makes every `root-*` value self-conflict, which is right for a functional utility: whatever values it accepts, they all set the same declarations. Nonexistent values overmatching is as harmless here as everywhere else.
        items.push({ kind: 'object', entries: [[root, [{ kind: 'validator', name: 'isAny' }]]] })
        groups.set(groupId, items)
    }

    return groups
}

/** Group IDs get a `utility.` prefix so they cannot collide with the skeleton's group IDs and are recognizable in reports and the emitted config. */
function customUtilityGroupId(root: string): string {
    return `utility.${root}`
}
