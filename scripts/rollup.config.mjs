// @ts-check

import { nodeResolve } from '@rollup/plugin-node-resolve'
import swc from '@rollup/plugin-swc'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'
import { dts } from 'rollup-plugin-dts'

import pkg from '../package.json' assert { type: 'json' }

// eslint-disable-next-line import/no-default-export
export default defineConfig([
    // ESM and CJS package exports of default bundle
    {
        input: pkg.source,
        output: [
            {
                file: pkg.exports['.'].import,
                format: 'esm',
                sourcemap: true,
                freeze: false,
                generatedCode: 'es5',
            },
            {
                file: pkg.exports['.'].require,
                format: 'cjs',
                sourcemap: true,
                freeze: false,
                generatedCode: 'es5',
            },
        ],
        external: /node_modules/,
        plugins: [
            del({
                targets: 'dist/*',
                runOnce: true,
            }),
            nodeResolve(),
            typescript({
                compilerOptions: {
                    noEmitOnError: true,
                },
            }),
            swc({
                swc: {
                    jsc: {
                        target: undefined,
                    },
                    env: {
                        targets: 'defaults',
                    },
                },
            }),
        ],
    },

    // ESM and CJS package exports of ES5 bundle
    {
        input: pkg.source,
        output: [
            {
                file: pkg.exports['./es5'].import,
                format: 'esm',
                sourcemap: true,
                freeze: false,
                generatedCode: 'es5',
            },
            {
                file: pkg.exports['./es5'].require,
                format: 'cjs',
                sourcemap: true,
                freeze: false,
                generatedCode: 'es5',
            },
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
            swc({
                swc: {
                    jsc: {
                        target: undefined,
                    },
                    env: {
                        targets: 'supports es5',
                    },
                },
            }),
        ],
    },

    // Type declarations of default and es5 bundles
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
