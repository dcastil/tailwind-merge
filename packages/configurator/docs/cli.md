# CLI

Run the CLI from a repository checkout after the [initial setup](./getting-started.md#generate-from-a-checkout):

```bash
node packages/configurator/src/cli.ts \
    --input /path/to/app/src/app.css \
    --output /path/to/app/tw-merge.generated.ts
```

| Argument | Meaning |
| --- | --- |
| `--input`, `-i` | Required CSS entrypoint path. Relative paths resolve from the working directory. |
| `--output`, `-o` | Required generated-module path. Missing parent directories are created. |
| `--format ts\|js` | Override the output language. Without it, `.js`, `.mjs`, and `.cjs` select JavaScript; other extensions select TypeScript. |
| `--encoding compact\|exact` | Encoding policy, defaulting to compact. See [the tradeoff](./how-it-works.md#compact-and-exact-encoding). |
| `--prune [directory]` | Enable usage pruning. Automatic source detection starts from the supplied directory, or the working directory when omitted. |
| `--check` | Compare regenerated contents against the output file without writing it. |

Both output languages use ES-module imports and exports. Use `.mjs` or an appropriately configured `.js` file for JavaScript output; choosing `.cjs` does not produce CommonJS.

## Checking committed output

```bash
node packages/configurator/src/cli.ts \
    --input /path/to/app/src/app.css \
    --output /path/to/app/tw-merge.generated.ts \
    --encoding exact \
    --check
```

Use the same input, output, encoding, format, and pruning arguments as the generation command. The check exits with code 0 for an identical file and code 1 for missing or different contents. Generation, file-access, and scanning errors also terminate unsuccessfully.

The banner contains the input path relative to the output and a hash of the entrypoint text. It is not a hash of the full dependency graph and does not include package versions. `--check` nevertheless regenerates using the complete resolved configuration and compares the whole output. Even a comment-only edit to the entrypoint can change the banner; deterministic output means identical inputs produce identical output, not that every diff changes merge behavior.

## Pruning during a build

```bash
node packages/configurator/src/cli.ts \
    --input /path/to/app/src/app.css \
    --output /path/to/app/tw-merge.generated.mjs \
    --prune /path/to/app
```

Tailwind's CSS source directives remain the source of truth. There is no separate CLI glob option. Keep the generated module outside those sources or exclude it using `@source not`, as shown in [getting started](./getting-started.md#generate-from-a-checkout). Regenerate after source-class changes as well as theme changes.

The CLI prints generation and pruning reports and warnings for unassigned theme-created classes. Review those warnings before adopting the output. A successful `--check` returns after comparison and does not print the full report.
