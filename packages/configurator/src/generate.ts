import { getDefaultConfig } from 'tailwind-merge'
import { type AnyConfig, createClassGroupUtils } from 'tailwind-merge/unstable-do-not-import'

import { buildAugmentations } from './augment.ts'
import { type EncodingMode } from './compress.ts'
import { buildCustomUtilityPlan } from './custom-utilities.ts'
import { loadDesignSystems } from './design-system.ts'
import { emitModule } from './emit.ts'
import { materializeConfig } from './materialize.ts'
import { type ConfigPlan, applyAugmentations, applyCustomUtilityPlan, buildPlan } from './plan.ts'
import { snapshotTheme } from './snapshot.ts'

export interface GenerateOptions {
    /** Content of the project's Tailwind CSS entrypoint (the file containing `@import 'tailwindcss'` and `@theme` customizations). */
    css: string
    /** Directory used to resolve imports in the CSS, usually the directory containing the entrypoint. Tailwind resolves `@import 'tailwindcss'` from here, so the project's own Tailwind installation is used. */
    base: string
    /** LRU cache size passed through to the generated config. Defaults to the default config's value. */
    cacheSize?: number
    /** How finite value sets (theme scales, custom-utility values) are encoded. 'compact' (default) picks the smallest matcher even when it accepts names beyond the theme — smallest bundle, but a nonexistent name like `rounded-xs` on a t-shirt scale can evict a real class. 'exact' only matches names that exist, so classes that produce no CSS never merge anything away — larger output, exact merge behavior. See `EncodingMode`. */
    encoding?: EncodingMode
    /** Comment lines placed below the generated-file notice at the top of the emitted module, e.g. provenance info like input path and content hash. */
    banner?: string
    /** Output language of the emitted module — see `EmitOptions.format`. Defaults to TypeScript. */
    format?: 'ts' | 'js'
    /** Module specifier the emitted code imports tailwind-merge's API from — see `EmitOptions.importSource`. */
    importSource?: string
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
 * The design system is loaded through Tailwind's own APIs so the resolved theme is exactly what the project's Tailwind version produces (defaults merged, overrides applied, resets executed). The default tailwind-merge config acts as the structural skeleton — class group semantics and conflict relationships — while every theme reference in it is replaced with exact values from the design system.
 *
 * Classes the theme creates outside the standard namespaces (compat sub-namespaces like `--text-color-*`, or namespaces without a theme key like `--z-index-*`) are found by diffing against a vanilla design system of the same Tailwind installation and classified empirically by their compiled CSS declarations, so no namespace mapping needs to be hand-maintained anywhere.
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
    const themeKeys = Object.keys(getDefaultConfig().theme)
    const { project, vanilla } = await loadDesignSystems({ css: options.css, base: options.base })
    const encoding = options.encoding ?? 'compact'

    const plan = buildPlan({
        snapshot: snapshotTheme(project, themeKeys),
        cacheSize: options.cacheSize,
        encoding,
    })

    // Both classifiers reuse the configurator's own output: the pre-augmentation project config decides which new classes are already covered, the vanilla config buckets sibling classes into the candidate groups for classification. They run without the prefix because class-list names are unprefixed — the prefix only applies to real candidates like `tw:bg-red-500`. The vanilla classifier always runs compact: real class names classify identically under both encodings, and compact skips the probing work.
    const vanillaPlan = buildPlan({ snapshot: snapshotTheme(vanilla, themeKeys) })
    const vanillaClassGroupUtils = createClassGroupUtils(materializeConfig(vanillaPlan))

    // Applied before the diff passes run, so classes of custom utilities count as classified and don't show up as unassigned — whether they joined a built-in group as an alias or got their own group.
    applyCustomUtilityPlan(
        plan,
        buildCustomUtilityPlan({
            project,
            vanilla,
            vanillaClassGroupId: vanillaClassGroupUtils.getClassGroupId,
            encoding,
        }),
    )

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
        }),
    )

    return {
        code: emitModule(plan, {
            banner: options.banner,
            format: options.format,
            importSource: options.importSource,
        }),
        config: materializeConfig(plan),
        plan,
    }
}
