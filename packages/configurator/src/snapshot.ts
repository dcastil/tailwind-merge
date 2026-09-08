import { type DesignSystemAccess } from './design-system.ts'

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
 * Variables outside the supported namespaces (e.g. `--z-index-*`) and in Tailwind's compat sub-namespaces (e.g. `--text-color-*`, which shares the `--text` prefix but feeds other utilities) are not captured here — the classes they create are picked up by the vanilla-diff augmentation pass instead, which classifies them empirically.
 */
export function snapshotTheme(
    designSystem: DesignSystemAccess,
    themeKeys: string[],
): ThemeSnapshot {
    const prefix = designSystem.theme.prefix ?? null

    const scales = new Map<string, ScaleSnapshot>(
        themeKeys.map((themeKey) => [themeKey, { names: [], hasBareValue: false }]),
    )

    // Longest key first so `--text-shadow-2xs` lands in `text-shadow` and never in `text`.
    const keysByLength = [...themeKeys].sort((a, b) => b.length - a.length)

    for (const [variableName] of designSystem.theme.entries()) {
        if (!variableName.startsWith('--')) {
            continue
        }
        let path = variableName.slice(2)
        // With `@import 'tailwindcss' prefix(tw)` the theme stores every variable prefixed (`--tw-color-*`); namespace bucketing works on the logical name.
        if (prefix !== null) {
            if (!path.startsWith(`${prefix}-`)) {
                continue
            }
            path = path.slice(prefix.length + 1)
        }

        const themeKey = keysByLength.find((key) => path === key || path.startsWith(`${key}-`))
        if (
            !themeKey ||
            IGNORED_SUB_NAMESPACES[themeKey]?.some(
                (subNamespace) => path === subNamespace || path.startsWith(`${subNamespace}-`),
            )
        ) {
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

/**
 * Tailwind's compat sub-namespaces, keyed by the theme key whose prefix they share: `--text-color-brand` is not a `text-*` font size, `--font-size-huge` not a `font-*` family. Mirrors the map Tailwind's theme resolution excludes when it reads a namespace (`ignoredThemeKeyMap` in tailwindcss's theme.ts) in full; sub-namespaces that are theme keys of their own (`text-shadow`, `font-weight`, `inset-shadow`, `inset-ring`) are listed as well so the exclusion does not depend on key length. Prefix matching alone would enumerate these names as scale members, and a name Tailwind never turns into a class would then evict a real one.
 */
const IGNORED_SUB_NAMESPACES: Record<string, readonly string[]> = {
    font: ['font-weight', 'font-size'],
    inset: ['inset-shadow', 'inset-ring'],
    text: [
        'text-color',
        'text-decoration-color',
        'text-decoration-thickness',
        'text-indent',
        'text-shadow',
        'text-underline-offset',
    ],
    'grid-column': ['grid-column-start', 'grid-column-end'],
    'grid-row': ['grid-row-start', 'grid-row-end'],
}
