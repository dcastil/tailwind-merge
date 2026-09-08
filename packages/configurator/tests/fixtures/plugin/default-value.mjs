/**
 * A functional plugin utility with a DEFAULT value: Tailwind suggests the bare `tint` next to `tint-2` and compiles it, but registers only the functional root — there is no static `tint` for the bare class to join through.
 */
export default function plugin({ matchUtilities }) {
    matchUtilities(
        {
            tint: (value) => ({
                filter: value,
            }),
        },
        {
            values: {
                DEFAULT: 'sepia(1)',
                2: 'sepia(2)',
                3: 'sepia(3)',
            },
        },
    )
}
