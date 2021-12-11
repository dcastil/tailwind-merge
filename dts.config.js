module.exports = {
    // This function will run for each entry/format/env combination
    rollup(config, options) {
        if (options.format === 'esm') {
            config = {
                ...config,
                preserveModules: true,
            }

            config.output = {
                ...config.output,
                dir: 'dist',
                entryFileNames: '[name].mjs',
            }

            delete config.output.file
        }

        return config
    },
}
