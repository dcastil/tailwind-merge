import { DesignSystemAccess } from './design-system'

export interface ThemeSnapshot {
    /** Class name prefix configured via `@import 'tailwindcss' prefix(…)`, or `null` without one. */
    prefix: string | null
    /** Effective theme values per tailwind-merge theme key. */
    scales: Map<string, ScaleSnapshot>
}

export interface ScaleSnapshot {
    /** Value names within the namespace, e.g. `red-500` for `--color-red-500`. Order follows theme definition order (defaults first, then user values). */
    names: string[]
    /** Whether the bare namespace variable exists, e.g. `--spacing` itself, which drives Tailwind's numeric spacing scale. */
    hasBareValue: boolean
}

/**
 * Captures the effective theme per namespace from a loaded design system.
 *
 * Reading the design system instead of parsing CSS text means defaults, `@import` chains, namespace resets (`--color-*: initial`), `@config`/`@plugin` contributions and value precedence are all Tailwind's responsibility — the snapshot only records the result. Values are intentionally not resolved: only which names exist matters for class classification.
 *
 * Variables outside the supported namespaces (e.g. `--text-color-*` or `--z-index-*`) are not captured here — the classes they create are picked up by the vanilla-diff augmentation pass instead, which classifies them empirically.
 */
export function snapshotTheme(
    designSystem: DesignSystemAccess,
    themeKeys: string[],
): ThemeSnapshot {
    const prefix = designSystem.theme.prefix ?? null
    if (prefix) {
        throw new Error(
            'Tailwind CSS prefixes are not supported yet. Planned for a later iteration, see PROPOSAL.md.',
        )
    }

    const scales = new Map<string, ScaleSnapshot>(
        themeKeys.map((themeKey) => [themeKey, { names: [], hasBareValue: false }]),
    )

    // Longest key first so `--text-shadow-2xs` lands in `text-shadow` and never in `text`.
    const keysByLength = [...themeKeys].sort((a, b) => b.length - a.length)

    for (const [variableName] of designSystem.theme.entries()) {
        if (!variableName.startsWith('--')) {
            continue
        }
        const path = variableName.slice(2)

        const themeKey = keysByLength.find((key) => path === key || path.startsWith(`${key}-`))
        if (!themeKey) {
            continue
        }

        const scale = scales.get(themeKey)!
        if (path === themeKey) {
            scale.hasBareValue = true
            continue
        }

        const name = path.slice(themeKey.length + 1)
        // Compound keys like `--text-xl--line-height` configure sub-values of an existing name and don't produce class names of their own.
        if (!name.includes('--')) {
            scale.names.push(name)
        }
    }

    return { prefix, scales }
}
