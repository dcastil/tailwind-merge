/**
 * Minimal legacy-style JS plugin for the @plugin fixture: one static utility via addUtilities and one functional utility via matchUtilities. The declared properties are deliberately ones no built-in utility sets, so the conformance sweep's oracle doesn't flag the (documented) lack of cross-group conflicts for plugin utilities.
 */
export default function plugin({ addUtilities, matchUtilities }) {
    addUtilities({
        '.glow': {
            'paint-order': 'stroke',
        },
    })

    matchUtilities(
        {
            tint: (value) => ({
                '--tint-color': value,
            }),
        },
        {
            values: {
                subtle: 'rgb(0 0 0 / 5%)',
                strong: 'rgb(0 0 0 / 20%)',
            },
        },
    )
}
