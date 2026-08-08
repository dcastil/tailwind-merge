import { getDefaultConfig } from '../../src'
import { AnyConfig } from '../../src/lib/types'

import { emitModule } from './emit'
import { materializeConfig } from './materialize'
import { ConfigPlan, buildPlan } from './plan'
import { loadThemeSnapshot } from './snapshot'

export interface GenerateOptions {
    /** Content of the project's Tailwind CSS entrypoint (the file containing `@import 'tailwindcss'` and `@theme` customizations). */
    css: string
    /** Directory used to resolve imports in the CSS, usually the directory containing the entrypoint. Tailwind resolves `@import 'tailwindcss'` from here, so the project's own Tailwind installation is used. */
    base: string
    /** LRU cache size passed through to the generated config. Defaults to the default config's value. */
    cacheSize?: number
    /** Comment block placed at the top of the emitted module, e.g. provenance info like input path and content hash. */
    banner?: string
}

export interface GenerateResult {
    /** Source code of the generated module exporting `twMerge` and `config`. */
    code: string
    /** The same config as a runtime object, so callers (and tests) can use the generated behavior without writing `code` to disk and importing it. */
    config: AnyConfig
    /** Intermediate representation, including the report on encoding strategies and pruned groups. */
    plan: ConfigPlan
}

/**
 * Generates a project-specific tailwind-merge setup from a Tailwind CSS v4 entrypoint.
 *
 * The design system is loaded through Tailwind's own APIs so the resolved theme is exactly what the project's Tailwind version produces (defaults merged, overrides applied, resets executed). The default tailwind-merge config acts as the structural skeleton — class group semantics and conflict relationships — while every theme reference in it is replaced with exact values from the design system. This way the config knowledge maintained in tailwind-merge stays the single source of truth and nothing theme-specific needs to be hand-maintained here.
 */
export const generate = async (options: GenerateOptions): Promise<GenerateResult> => {
    const themeKeys = Object.keys(getDefaultConfig().theme)

    const snapshot = await loadThemeSnapshot({
        css: options.css,
        base: options.base,
        themeKeys,
    })

    const plan = buildPlan({ snapshot, cacheSize: options.cacheSize })

    return {
        code: emitModule(plan, { banner: options.banner }),
        config: materializeConfig(plan),
        plan,
    }
}
