import { getDefaultConfig } from '../../src'
import { createClassGroupUtils } from '../../src/lib/class-group-utils'
import { AnyConfig } from '../../src/lib/types'

import { buildAugmentations } from './augment'
import { loadDesignSystems } from './design-system'
import { emitModule } from './emit'
import { materializeConfig } from './materialize'
import { ConfigPlan, applyAugmentations, buildPlan } from './plan'
import { snapshotTheme } from './snapshot'

export interface GenerateOptions {
    /** Content of the project's Tailwind CSS entrypoint (the file containing `@import 'tailwindcss'` and `@theme` customizations). */
    css: string
    /** Directory used to resolve imports in the CSS, usually the directory containing the entrypoint. Tailwind resolves `@import 'tailwindcss'` from here, so the project's own Tailwind installation is used. */
    base: string
    /** LRU cache size passed through to the generated config. Defaults to the default config's value. */
    cacheSize?: number
    /** Comment lines placed below the generated-file notice at the top of the emitted module, e.g. provenance info like input path and content hash. */
    banner?: string
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
export const generate = async (options: GenerateOptions): Promise<GenerateResult> => {
    const themeKeys = Object.keys(getDefaultConfig().theme)
    const { project, vanilla } = await loadDesignSystems({ css: options.css, base: options.base })

    const plan = buildPlan({
        snapshot: snapshotTheme(project, themeKeys),
        cacheSize: options.cacheSize,
    })

    // Both classifiers reuse the configurator's own output: the pre-augmentation project config decides which new classes are already covered by the standard namespaces, the vanilla config buckets sibling classes into the candidate groups for classification.
    const vanillaPlan = buildPlan({ snapshot: snapshotTheme(vanilla, themeKeys) })
    const projectClassGroupUtils = createClassGroupUtils(materializeConfig(plan))
    const vanillaClassGroupUtils = createClassGroupUtils(materializeConfig(vanillaPlan))

    applyAugmentations(
        plan,
        buildAugmentations({
            project,
            vanilla,
            projectClassGroupId: projectClassGroupUtils.getClassGroupId,
            vanillaClassGroupId: vanillaClassGroupUtils.getClassGroupId,
        }),
    )

    return {
        code: emitModule(plan, { banner: options.banner }),
        config: materializeConfig(plan),
        plan,
    }
}
