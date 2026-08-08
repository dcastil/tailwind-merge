import { __unstable__loadDesignSystem } from '@tailwindcss/node'

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

export interface LoadThemeSnapshotOptions {
    css: string
    base: string
    /** Namespaces to capture, as tailwind-merge theme keys (namespace without the `--` prefix). */
    themeKeys: string[]
}

/**
 * Loads the design system through Tailwind's own compiler and captures the effective theme per namespace.
 *
 * Reading the design system instead of parsing CSS text means defaults, `@import` chains, namespace resets (`--color-*: initial`), `@config`/`@plugin` contributions and value precedence are all Tailwind's responsibility — the snapshot only records the result. Values are intentionally not resolved: only which names exist matters for class classification.
 */
export const loadThemeSnapshot = async ({
    css,
    base,
    themeKeys,
}: LoadThemeSnapshotOptions): Promise<ThemeSnapshot> => {
    const designSystem = await __unstable__loadDesignSystem(css, { base })
    // The theme's typed surface hides the parts we need behind private fields, so this narrows to the small structural slice the snapshot relies on. Verified against tailwindcss 4.3.x, guarded by tests.
    const theme = designSystem.theme as unknown as ThemeAccess

    const prefix = theme.prefix ?? null
    if (prefix) {
        throw new Error(
            'Tailwind CSS prefixes are not supported yet. Planned for a later iteration, see PROPOSAL.md.',
        )
    }

    const scales = new Map<string, ScaleSnapshot>(
        themeKeys.map((themeKey) => [themeKey, { names: [], hasBareValue: false }]),
    )

    // Longest key first so `--text-shadow-2xs` lands in `text-shadow` and never in `text`. The same mechanism will keep sub-namespaces like `--text-color-*` out of `text` once they are supported.
    const keysByLength = [...themeKeys].sort((a, b) => b.length - a.length)

    for (const [variableName] of theme.entries()) {
        if (!variableName.startsWith('--')) {
            continue
        }
        const path = variableName.slice(2)

        const themeKey = keysByLength.find(
            (key) => path === key || path.startsWith(`${key}-`),
        )
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

interface ThemeAccess {
    prefix: string | null
    entries(): Iterable<[string, unknown]>
}
