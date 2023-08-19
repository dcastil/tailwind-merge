// @ts-check

import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'
import { dts } from 'rollup-plugin-dts'

import pkg from '../package.json' assert { type: 'json' }

// eslint-disable-next-line import/no-default-export
export default defineConfig([
    // Default entry point
    {
        input: pkg.source,
        output: [
            getOutputConfig({
                file: pkg.exports['.'].import,
                format: 'esm',
                targets: '> 0.5%, last 2 versions, Firefox ESR, not dead, maintained node versions',
            }),
            getOutputConfig({
                file: pkg.exports['.'].require,
                format: 'cjs',
                targets: '> 0.5%, last 2 versions, Firefox ESR, not dead, maintained node versions',
            }),
        ],
        external: /node_modules/,
        plugins: [
            del({ targets: 'dist/*' }),
            nodeResolve(),
            typescript({
                compilerOptions: {
                    noEmitOnError: true,
                },
            }),
        ],
    },

    // es5 entry point
    {
        input: pkg.source,
        output: [
            getOutputConfig({
                file: pkg.exports['./es5'].import,
                format: 'esm',
                targets: 'supports es5',
            }),
            getOutputConfig({
                file: pkg.exports['./es5'].require,
                format: 'cjs',
                targets: 'supports es5',
            }),
        ],
        external: /node_modules/,
        plugins: [
            nodeResolve(),
            typescript({
                compilerOptions: {
                    noEmitOnError: true,
                    // We don't want to emit declaration files more than once
                    declaration: false,
                    declarationMap: false,
                },
            }),
        ],
    },

    // Type declarations of default and es5 entry points
    {
        input: 'dist/types/index.d.ts',
        output: {
            file: pkg.exports['.'].types,
            format: 'esm',
        },
        plugins: [
            dts(),
            del({
                targets: 'dist/types',
                hook: 'buildEnd',
                runOnce: true,
            }),
        ],
    },
])

/**
 *
 * @param {{ file: string; format: 'esm' | 'cjs'; targets: string}} param0
 * @returns
 */
function getOutputConfig({ file, format, targets }) {
    /** @satisfies {import('rollup').OutputOptions} */
    const config = {
        file,
        format,
        sourcemap: true,
        freeze: false,
        generatedCode: 'es2015',
        plugins: [
            getBabelOutputPlugin({
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            loose: true,
                            bugfixes: true,
                            modules: false,
                            targets,
                        },
                    ],
                ],
                plugins: [
                    'babel-plugin-annotate-pure-calls',
                    ['@babel/plugin-transform-runtime', { useESModules: format === 'esm' }],
                    ['babel-plugin-polyfill-regenerator', { method: 'usage-pure' }],
                ],
            }),
        ],
    }

    return config
}
