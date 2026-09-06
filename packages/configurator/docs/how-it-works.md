# How it works

## From CSS to a merge function

The configurator loads your input stylesheet through Tailwind's design-system API. Tailwind resolves defaults, imports, overrides, resets, and compatibility configuration. Reading the input configuration matters: compiled CSS normally contains only used theme variables, so it cannot describe the complete theme.

The library's default configuration supplies class-group semantics and directional conflict relationships. The configurator substitutes resolved theme scales, removes disabled members, and classifies extra named classes by comparing their compiled CSS with built-in utilities. It also carries the configured prefix into the generated module.

The result exports `getConfig` and `twMerge`. Configuration construction stays inside `getConfig`, so the normal lazy initialization of `createTailwindMerge` is preserved. The emitted module uses the library's public runtime API without importing its default configuration, allowing a bundler to remove that default configuration.

## Compact and exact encoding

`encoding: 'compact'` is the default. It selects small matchers that cover a finite theme scale, which may also recognize nonexistent names. If a radius scale lacks `xs` but is represented by `isTshirtSize`, `twMerge('rounded-md rounded-xs')` can drop `rounded-md` even though `rounded-xs` has no CSS. Compact encoding assumes callers use valid theme tokens.

`encoding: 'exact'` enumerates finite names and retains validators for open-ended value kinds established by probing Tailwind. This avoids the finite-scale overmatching above. Valid arbitrary values and open numeric spacing continue to work.

Exact encoding is not a CSS validator: arbitrary-value matchers can still accept wrongly typed values, such as a color for a custom utility accepting lengths. See [limitations](./limitations.md#classification-and-custom-utilities).

Exact output is generally larger. Enumeration often compresses well, but the difference can grow when a project uses many palette shades across many utilities. Historical [size measurements](../../../agents/configurator-performance.md) explain the tradeoff; measure your own bundle when size matters.

## Pruning to source usage

The full generated configuration covers the resolved theme. Usage pruning removes groups and members that no supplied candidate reaches. Tailwind's own scanner supplies candidates from automatic detection, `source(…)`, `@source`, and inline safelists, including negative inline exclusions.

The pruning contract is relative to the full generated config: **lists made from supplied candidates must merge identically before and after pruning.** Pruning does not fix an existing classification gap or validate every scanner token. Retained validators can also match candidates absent from the scan, so a pruned config is not a strict allowlist of class strings.

The [CLI](./cli.md) can scan and generate in one command. The [JavaScript API](./api-reference.md#createsourcescanneroptions) keeps those steps separate so a build integration can reuse its scanner. Neither enables pruning by default.

Do not prune a design-system package's config against only the package's own source usage if its consumers pass additional class names. Likewise, keep the full config for classes supplied externally and styled by a separate CSS build. Safelisted classes need no exception because the scanner includes them.

## Custom utilities and collisions

A static utility whose compiled declarations match one built-in group's signature can join that group as an alias. Other custom roots receive their own self-conflict group. When a custom utility fully covers another group's unconditional element-level declarations, an override relationship allows the later custom utility to remove the earlier class.

For example, a utility setting padding and border radius can remove an earlier padding utility. An ordinary padding utility cannot remove the combined utility because doing so would lose its radius. Conditional rules and pseudo-element effects require conservative treatment for the same reason.

When one class name compiles to several independent effects, the generator may remove it from conflict groups so it passes through intact. The report records these collisions and any theme-created classes it could not assign. These decisions and their constraints are described in the [limitations](./limitations.md).
