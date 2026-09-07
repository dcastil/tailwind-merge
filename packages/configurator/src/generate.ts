import { getDefaultConfig } from 'tailwind-merge'
import { type AnyConfig, createClassGroupUtils, createParseClassName } from 'tailwind-merge/unstable-do-not-import'

import { buildAugmentations } from './augment.ts'
import { type EncodingMode } from './compress.ts'
import { buildCustomUtilityPlan } from './custom-utilities.ts'
import {
    type DesignSystemAccess,
    type TailwindIntegration,
    declaredDeclarations,
    loadDesignSystems,
} from './design-system.ts'
import { emitModule } from './emit.ts'
import { materializeConfig } from './materialize.ts'
import { type ConfigPlan, applyAugmentations, applyCustomUtilityPlan, buildPlan } from './plan.ts'
import { prunePlan } from './prune.ts'
import { snapshotTheme } from './snapshot.ts'

export interface GenerateOptions {
    /** Content of the project's Tailwind CSS entrypoint (the file containing `@import 'tailwindcss'` and `@theme` customizations). */
    css: string
    /** Directory used to resolve imports in the CSS, usually the directory containing the entrypoint. Tailwind resolves stylesheet and module imports from here; the compiler itself comes from the configurator's installed `@tailwindcss/node`. */
    base: string
    /** Optional bundler resolution and dependency hooks; omitted for ordinary filesystem/package resolution. */
    integration?: TailwindIntegration
    /** LRU cache size passed through to the generated config. Defaults to the default config's value. */
    cacheSize?: number
    /** How finite value sets (theme scales, custom-utility values) are encoded. 'compact' (default) picks the smallest matcher even when it accepts names beyond the theme — smallest bundle, but a nonexistent name like `rounded-xs` on a t-shirt scale can evict a real class. 'exact' enumerates finite names to avoid that overmatching, at a size cost; arbitrary-value types remain approximate. See `EncodingMode`. */
    encoding?: EncodingMode
    /** Comment lines placed below the generated-file notice at the top of the emitted module, e.g. provenance info like input path and content hash. */
    banner?: string
    /** Output language of the emitted module — see `EmitOptions.format`. Defaults to TypeScript. */
    format?: 'ts' | 'js'
    /** Module specifier the emitted code imports tailwind-merge's API from — see `EmitOptions.importSource`. */
    importSource?: string
    /** Shrinks the generated config to the classes a project uses: class names as a source scanner finds them (variants, important markers, and postfix modifiers included — see `createSourceScanner`). Class groups and scale members no listed class reaches are dropped; every class list made of listed classes merges exactly as with the full config, while retained validators may also match unlisted classes. The result is reported in `plan.report.pruning`. */
    prune?: { usedClasses: Iterable<string> }
}

export interface GenerateResult {
    /** Source code of the generated module exporting `getConfig` and `twMerge`. */
    code: string
    /** The same config as a runtime object, so callers (and tests) can use the generated behavior without writing `code` to disk and importing it. */
    config: AnyConfig
    /** Intermediate representation, including the report on encoding strategies, pruned groups, and augmentations. */
    plan: ConfigPlan
}

/**
 * Generates a project-specific tailwind-merge setup from a Tailwind CSS v4 entrypoint.
 *
 * The design system is loaded through Tailwind's own APIs with defaults merged, overrides applied, and resets executed. Keep the installed compiler aligned with the version that builds the project's CSS. The default tailwind-merge config acts as the structural skeleton — class group semantics and conflict relationships — while every theme reference in it is replaced with exact values from the design system.
 *
 * Classes the theme creates outside the standard namespaces (compat sub-namespaces like `--text-color-*`, or namespaces without a theme key like `--z-index-*`) are found by diffing against a vanilla design system of the same Tailwind installation and classified empirically by their compiled CSS declarations, so no namespace mapping needs to be hand-maintained anywhere.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
    const themeKeys = Object.keys(getDefaultConfig().theme)
    const { project, vanilla } = await loadDesignSystems({
        css: options.css,
        base: options.base,
        integration: options.integration,
    })
    const encoding = options.encoding ?? 'compact'

    const plan = buildPlan({
        snapshot: snapshotTheme(project, themeKeys),
        cacheSize: options.cacheSize,
        encoding,
    })
    plan.orderSensitiveModifiers = [
        ...new Set([
            ...plan.orderSensitiveModifiers,
            ...customOrderSensitiveModifiers(project, vanilla),
        ]),
    ]

    // Both classifiers reuse the configurator's own output: the pre-augmentation project config decides which new classes are already covered, the vanilla config buckets sibling classes into the candidate groups for classification. They run without the prefix because class-list names are unprefixed — the prefix only applies to real candidates like `tw:bg-red-500`. The vanilla classifier always runs compact: real class names classify identically under both encodings, and compact skips the probing work.
    const vanillaPlan = buildPlan({ snapshot: snapshotTheme(vanilla, themeKeys) })
    const vanillaClassGroupUtils = createClassGroupUtils(materializeConfig(vanillaPlan))

    // Establish custom ownership before the diff passes run, including classes deliberately left unclassified, so property-only augmentation cannot undo effect-aware decisions.
    const customUtilities = buildCustomUtilityPlan({
        project,
        vanilla,
        vanillaClassGroupId: vanillaClassGroupUtils.getClassGroupId,
        encoding,
    })
    applyCustomUtilityPlan(plan, customUtilities)

    const projectClassGroupUtils = createClassGroupUtils(
        materializeConfig({ ...plan, prefix: null }),
    )

    // Top-level class-name prefixes per group, so augmentation can probe a value under a group's other spellings (the `start` group holds both `inset-s` and the deprecated `start`, but Tailwind's class list only ever suggests `inset-s-*`).
    const groupPrefixKeys = new Map<string, string[]>()
    for (const [groupId, items] of plan.classGroups) {
        const prefixes = items.flatMap((item) =>
            item.kind === 'object' ? item.entries.map(([key]) => key) : [],
        )
        if (prefixes.length > 0) {
            groupPrefixKeys.set(groupId, prefixes)
        }
    }

    applyAugmentations(
        plan,
        buildAugmentations({
            project,
            vanilla,
            projectClassGroupId: projectClassGroupUtils.getClassGroupId,
            vanillaClassGroupId: vanillaClassGroupUtils.getClassGroupId,
            groupPrefixKeys,
            customGroupIds: new Set(customUtilities.groups.keys()),
            preservedCustomClasses: customUtilities.preservedClasses,
        }),
    )
    plan.postfixLookupClassGroups = [
        ...new Set([
            ...plan.postfixLookupClassGroups,
            ...staticPostfixLookupGroups(project, plan),
        ]),
    ]

    // Pruning runs last, on the finished plan: only then does classification see every member a used class could reach (custom utilities, augmented classes, collision corrections included).
    const finalPlan = options.prune ? prunePlan(plan, options.prune.usedClasses) : plan

    return {
        code: emitModule(finalPlan, {
            banner: options.banner,
            format: options.format,
            importSource: options.importSource,
        }),
        config: materializeConfig(finalPlan),
        plan: finalPlan,
    }
}

/** Added or redefined variants that style another target are ordering barriers, like the default before/after/child modifiers. Compile their suggested spellings so theme-only media changes and ordinary state variants keep commuting; selector lists are conservative because they can mix targets. */
function customOrderSensitiveModifiers(
    project: DesignSystemAccess,
    vanilla: DesignSystemAccess,
): string[] {
    const defaults = new Map(vanilla.getVariants().map((variant) => [variant.name, variant]))
    const modifiers = new Set<string>()
    for (const variant of project.getVariants()) {
        const original = defaults.get(variant.name)
        if (
            !original ||
            JSON.stringify(variant.selectors()) !== JSON.stringify(original.selectors())
        ) {
            modifiers.add(variant.name)
        }
        for (const value of variant.values) {
            if (
                !original ||
                !original.values.includes(value) ||
                JSON.stringify(variant.selectors({ value })) !==
                    JSON.stringify(original.selectors({ value }))
            ) {
                modifiers.add(`${variant.name}${variant.hasDash ? '-' : ''}${value}`)
            }
        }
    }
    return [...modifiers].filter((modifier) =>
        declaredDeclarations(project, `${modifier}:block`)?.some(
            (entry) =>
                entry.context !== '' ||
                entry.scope.some((rule) => !rule.startsWith('@') && rule.includes(',')),
        ),
    )
}

/** Static names can contain slashes too: badge/icon must reach its own group instead of inheriting badge's group. Use the final classifier after aliases and augmentation establish both owners, and the runtime parser for the exact postfix boundary. Pruning then retains both lookups. */
function staticPostfixLookupGroups(project: DesignSystemAccess, plan: ConfigPlan): string[] {
    const classNames = project.utilities.keys('static').filter((name) => name.includes('/'))
    if (classNames.length === 0) {
        return []
    }
    // Registry names are unprefixed, including under a prefixed theme.
    const config = materializeConfig({ ...plan, prefix: null })
    const parseClassName = createParseClassName(config)
    const { getClassGroupId } = createClassGroupUtils(config)
    const groups = new Set<string>()
    for (const className of classNames) {
        const { baseClassName, maybePostfixModifierPosition } = parseClassName(className)
        if (!maybePostfixModifierPosition) {
            continue
        }
        const baseGroup = getClassGroupId(baseClassName.slice(0, maybePostfixModifierPosition))
        const fullGroup = getClassGroupId(baseClassName)
        if (baseGroup && fullGroup && baseGroup !== fullGroup) {
            groups.add(baseGroup)
        }
    }
    return [...groups]
}
