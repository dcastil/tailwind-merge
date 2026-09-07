# JavaScript API

The package exports `generate`, `createSourceScanner`, the `cssStatements` inspection helper, `createStylesheetResolver`, and their supporting types. The direct configurator API remains unstable until a standalone release. Internal helpers such as `prunePlan` and `emitModule` are not package exports.

## `generate(options)`

```ts
import { generate } from '@tailwind-merge/configurator'

const { code, config, plan } = await generate(options)
```

| Option | Type | Description |
| --- | --- | --- |
| `css` | `string`, required | Contents of the Tailwind CSS entrypoint, before compilation. |
| `base` | `string`, required | Directory from which Tailwind resolves stylesheet and module imports; normally the absolute directory containing the entrypoint. |
| `integration` | `TailwindIntegration` | Optional bundler resolution and dependency hooks, shared with source scanning. Omit for ordinary filesystem/package resolution. |
| `cacheSize` | `number` | Cache size passed through to the generated config. Defaults to the library's default. |
| `encoding` | `'compact' \| 'exact'` | Finite-scale matching policy. Defaults to `'compact'`; see [encoding](./how-it-works.md#compact-and-exact-encoding). |
| `format` | `'ts' \| 'js'` | Output language. Defaults to `'ts'`. Both forms are ES modules. |
| `banner` | `string` | Additional comment lines below the generated-file notice. Provide valid comment text, including its comment delimiters. |
| `importSource` | `string` | Specifier from which the generated module imports the library API. Defaults to `'tailwind-merge'`. An alternative must expose compatible `createTailwindMerge`, `validators`, and, for TypeScript output, `Config`. |
| `prune` | `{ usedClasses: Iterable<string> }` | Retain the configuration reached by these raw class candidates, including variants, important markers, and postfix modifiers. Omit it to keep the full generated configuration. |

Results:

- `code`: module source exporting `twMerge` and `getConfig`. TypeScript output uses `satisfies` and needs TypeScript 4.9 or newer when compiled as TypeScript; JavaScript output has no type syntax.
- `config`: the generated configuration as an in-memory object. Use `createTailwindMerge(() => config)` when no file is needed.
- `plan`: the intermediate configuration representation and its `report`. Treat its detailed structure as unstable.

Generation rejects on errors; it does not log warnings or write files. Callers decide how to handle `plan.report.unassignedClasses`. The CLI prints them; the Vite plugin has its own documented failure behavior.

### Reports

| Field | Meaning |
| --- | --- |
| `encoding`, `scaleStrategies` | Selected encoding mode and representation of each theme scale. |
| `prunedClassGroups` | Groups removed because the theme disables all their members. This is separate from usage pruning. |
| `augmentedClassGroups` | Named classes added beyond the standard theme-namespace mapping. |
| `customUtilityGroups`, `aliasedUtilityClasses`, `customUtilityConflicts` | Custom roots registered for self-conflict, aliases joining built-in groups, and inferred directional overrides. |
| `resolvedCollisions` | Classes with competing claims and the group retained; `keptGroupId: null` means the class was removed from all groups to preserve its combined CSS effects. |
| `unassignedClasses` | Theme-created classes for which classification could not be established, with reasons. An empty list is not a proof of all merge behavior; see [limitations](./limitations.md). |
| `pruning` | Present only with `prune`. Contains counts before/after, `removedClassGroups`, and `unprunedClassGroups`. The latter records groups conservatively retained in full because member attribution could not reproduce the classifier's path. |

`pruning.usedClassCount` includes raw scanner tokens. `classifiedClassCount` counts candidates recognized by the full generated config; it is not a count of CSS rules or a compile-validation result.

### Compose the generated configuration

```ts
import { createTailwindMerge, mergeConfigs } from 'tailwind-merge'
import { getConfig } from './tw-merge.generated'

const twMerge = createTailwindMerge(() =>
    mergeConfigs(getConfig(), {
        extend: {
            classGroups: { 'text-style': ['text-style-heading', 'text-style-body'] },
        },
    }),
)
```

`getConfig()` builds a fresh configuration. Its `theme` object is empty because resolved scales are stored in class groups; extend those groups directly rather than using `fromTheme`. For design-system packages receiving consumer class names, generate without usage pruning so consumer usage remains covered.

## `createSourceScanner(options)`

The scanner provides candidates for `generate({ prune: { usedClasses } })`. Scanning is a separate operation; `generate` has no directory-based pruning option.

```ts
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createSourceScanner, generate } from '@tailwind-merge/configurator'

const input = resolve('src/app.css')
const css = await readFile(input, 'utf8')
const base = dirname(input)
const scanner = await createSourceScanner({ css, base, autoDetectBases: [process.cwd()] })
const { classes, files, globs } = scanner.scan()
const { code, plan } = await generate({ css, base, prune: { usedClasses: classes } })
```

All three options are required: `css`, `base`, and `autoDetectBases: readonly string[]`. The bases are where automatic source detection starts when the CSS specifies no `source(…)`; Tailwind's Vite integration uses the Vite root, while its PostCSS integration and CLI normally use the working directory. Several bases scan their union. Explicit `source(…)`, `source(none)`, `@source`, and inline safelists are honored.

An optional `integration` supplies the same `TailwindIntegration` hooks as `generate`: async `resolveCss(id, base)` and `resolveJs(id, base)` return an absolute path to a stylesheet or module, respectively. Either can return `false`/`undefined` to defer to Tailwind's normal resolution, including explicit `.pcss` or extensionless stylesheet imports. Either hook can also return an alias-expanded request before its extension is known; the appropriate stylesheet or module resolver completes the lookup and reports missing targets under the expanded path.

The optional `onDependency(file)` callback observes resolved dependencies, including those discovered before generation fails. Failed stylesheet and JavaScript config/plugin resolution also report attempted missing paths and the closest existing parent directory of a local request so an integration can watch for creation. Callback paths can be files, directories, or paths that do not exist yet. Configs/plugins are reported before execution; if JavaScript execution fails during generation, literal local imports are also followed to retain broken or missing transitive dependencies. Fresh resolution allows retrying immediately after a missing target is created. Pass the same hooks to scanning and generation so both see the same imports, aliases, and source directives.

The returned object exposes:

- `scan()`: returns `{ classes, files, globs }`. Candidates include source tokens and safelisted classes, minus inline exclusions; they are not all valid utilities. Register files and positive source globs with a watcher. Watchers without glob support must watch the corresponding base directories to observe newly created files.
- `dependencies: ReadonlySet<string>`: CSS/module dependencies read during compilation. The entrypoint itself is not included because the caller supplied its text.
- `sources`: scanner source entries, including negations and compat-config content paths.
- `safelist: readonly string[]`: brace-expanded inline candidates.
- `scansUtilities`: whether the stylesheet enables Tailwind's utilities layer.

Reuse `scan()` after source edits. Recreate the scanner after changes to the CSS graph, because its sources and safelist were resolved when it was created. Scanner creation and scanning may throw, including when the platform's oxide binary is unavailable; the direct API does not silently fall back.

## `cssStatements(css)`

Returns a generator of nonempty CSS statements and block headers without their terminating semicolon or brace. Comments are replaced by whitespace; quoted strings, escapes, and function arguments remain intact. Source scanning and Vite root discovery share this helper so comments and quoted examples cannot introduce directives. It is a lexical inspection helper, not a CSS validator or an import resolver.

## `createStylesheetResolver(resolveCss?, onStylesheet?, onMissingDependency?)`

Returns an `(id: string, base: string) => Promise<string>` resolver using the same stylesheet rules as generation and scanning. An optional `resolveCss` hook follows the `TailwindIntegration` contract above; alias-expanded paths still receive extension and package resolution, including a directory's `package.json` `style` entry. Bundler adapters can use this helper to keep entrypoint discovery consistent with generation.

`onStylesheet(file)` observes successful stylesheet resolution. `onMissingDependency(file)` observes attempted paths only when resolution fails, before the returned promise rejects; these paths may not exist. Each resolver uses fresh filesystem reads so retries can see newly created files.

## Exported types

`GenerateOptions`, `GenerateResult`, `EncodingMode`, `TailwindIntegration`, `SourceScanner`, `SourceScannerOptions`, and `UsageScan` describe the main API. The package also exports `ConfigPlan`, `PlanReport`, `PlanValue`, `PruneReport`, `ScalePlan`, `ValidatorName`, `ScaleSnapshot`, and `ThemeSnapshot` for tooling that inspects the generation result.
