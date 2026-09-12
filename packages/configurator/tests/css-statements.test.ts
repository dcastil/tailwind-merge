import { expect, test } from 'vitest'

import { cssStatements } from '../src'

test('discovery can inspect active directives before an unfinished edit compiles', () => {
    expect([...cssStatements("@import 'tailwindcss'; @theme { --color-brand: red;")]).toEqual([
        "@import 'tailwindcss'",
        '@theme',
        '--color-brand: red',
    ])
})

test('CSS inspection excludes comments while preserving strings, escapes, and function arguments', () => {
    const css = String.raw`
        /* @theme { --ignored: true; } */
        @import/* @import 'ignored.css'; */url("/* actual filename */;{}.css");
        @theme {
            --example: "escaped \"; } @import 'ignored.css';";
        }
        .example::before {
            content: '@source inline("p-2");';
            background: url(data:image/svg+xml,<svg>{content}</svg>)
        }
    `
    expect([...cssStatements(css)]).toEqual([
        '@import url("/* actual filename */;{}.css")',
        '@theme',
        String.raw`--example: "escaped \"; } @import 'ignored.css';"`,
        '.example::before',
        `content: '@source inline("p-2");'`,
        'background: url(data:image/svg+xml,<svg>{content}</svg>)',
    ])
})
