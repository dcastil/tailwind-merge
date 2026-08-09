/** Legacy v3-style JS config for the @config fixture. Its theme values flow through Tailwind's compat layer into namespaced variables (`--color-brand-*`, `--z-index-*`, `--border-width-*`). */
module.exports = {
    theme: {
        extend: {
            colors: {
                brand: {
                    500: '#33f',
                    900: '#113',
                },
            },
            zIndex: {
                header: '10',
                modal: '100',
            },
            borderWidth: {
                hairline: '0.5px',
            },
        },
    },
}
