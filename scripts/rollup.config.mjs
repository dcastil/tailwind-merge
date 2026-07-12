// @ts-check

import path from 'node:path'

import { getBabelOutputPlugin } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import del from 'rollup-plugin-delete'
import { dts } from 'rollup-plugin-dts'

import pkg from '../package.json' with { type: 'json' }

/**
 * Preserves the generated-code semantics of Babel 7's `@babel/preset-env` `loose: true` option after Babel 8 removed it.
 *
 * @see https://babeljs.io/docs/assumptions#migrating-from-babelpreset-envs-loose-and-spec-modes
 */
const babelLooseAssumptions = {
    arrayLikeIsIterable: true,
    constantReexports: true,
    ignoreFunctionLength: true,
    ignoreToPrimitiveHint: true,
    mutableTemplateObject: true,
    noClassCalls: true,
    noDocumentAll: true,
    objectRestNoSymbols: true,
    privateFieldsAsProperties: true,
    pureGetters: true,
    setClassMethods: true,
    setComputedProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
    skipForOfIteratorClosing: true,
    superIsCallableConstructor: true,
}

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
                    outDir: path.dirname(pkg.exports['.'].import),
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
                    // We don't want to emit declaration files more than once
                    declaration: false,
                    declarationMap: false,
                    outDir: path.dirname(pkg.exports['./es5'].import),
                    // This is needed to correct source map paths
                    sourceRoot: '../src',
                },
            }),
        ],
    },

    // Type declarations of default and es5 entry points
    {
        input: 'dist/index.d.ts',
        output: {
            file: pkg.exports['.'].types,
            format: 'esm',
        },
        plugins: [
            dts(),
            del({
                targets: ['dist/lib', 'dist/index.d.ts'],
                hook: 'buildEnd',
                runOnce: true,
            }),
        ],
    },
])

/**
 * Creates a shared output configuration so every public bundle receives the same Babel transforms while retaining its format-specific file path and runtime targets.
 *
 * @param {object} param0
 * @param {string} param0.file
 * @param {'esm' | 'cjs'} param0.format
 * @param {string} param0.targets
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
                assumptions: babelLooseAssumptions,
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            exclude: ['transform-typeof-symbol'],
                            modules: false,
                            targets,
                        },
                    ],
                ],
                plugins: [
                    'babel-plugin-annotate-pure-calls',
                    ['babel-plugin-polyfill-regenerator', { method: 'usage-pure' }],
                ],
            }),
        ],
    }

    return config
}
