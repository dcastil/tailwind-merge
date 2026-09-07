# How it works

## From CSS to a merge function

The configurator loads your input stylesheet through Tailwind's design-system API. Tailwind resolves defaults, imports, overrides, resets, and compatibility configuration. Reading the input configuration matters: compiled CSS normally contains only used theme variables, so it cannot describe the complete theme.

The library's default configuration supplies class-group semantics and directional conflict relationships. The configurator substitutes resolved theme scales, removes disabled members, and classifies extra named classes by comparing their compiled CSS with built-in utilities. It also carries the configured prefix into the generated module.

The result exports `getConfig` and `twMerge`. Configuration construction stays inside `getConfig`, so the normal lazy initialization of `createTailwindMerge` is preserved. The emitted module uses the library's public runtime API without importing its default configuration, allowing a bundler to remove that default configuration.

TypeScript and JavaScript output preserve the in-memory config's theme entries, including families named `__proto__`, which require special object-key syntax in generated code.

## Compact and exact encoding

`encoding: 'compact'` is the default. It selects small matchers that cover a finite theme scale, which may also recognize nonexistent names. If a radius scale lacks `xs` but is represented by `isTshirtSize`, `twMerge('rounded-md rounded-xs')` can drop `rounded-md` even though `rounded-xs` has no CSS. Compact encoding assumes callers use valid theme tokens.

`encoding: 'exact'` enumerates finite names and retains validators for open-ended value kinds established by probing Tailwind. This avoids the finite-scale overmatching above. Valid arbitrary values and open numeric spacing continue to work.

Exact encoding is not a CSS validator: arbitrary-value matchers can still accept wrongly typed values, such as a color for a custom utility accepting lengths. See [limitations](./limitations.md#classification-and-custom-utilities).

Exact output is generally larger. Enumeration often compresses well, but the difference can grow when a project uses many palette shades across many utilities. Historical [size measurements](../../../agents/configurator-performance.md) explain the tradeoff; measure your own bundle when size matters.

## Pruning to source usage

The full generated configuration covers the resolved theme. Usage pruning removes groups and members that no supplied candidate reaches. Tailwind's own scanner supplies candidates from automatic detection, `source(…)`, `@source`, and inline safelists, including negative inline exclusions. Inline directives are read from active CSS in the entrypoint and every imported stylesheet, including `.pcss` and extensionless files. JavaScript dependencies are not treated as stylesheets, and text inside comments or quoted strings does not affect the candidates.

The pruning contract is relative to the full generated config: **lists made from supplied candidates must merge identically before and after pruning.** This can require keeping a base matcher even when only its slash-modified classes appear in the sources, because the base lookup selects how the full class is classified. Pruning does not fix an existing classification gap or validate every scanner token. Retained validators can also match candidates absent from the scan, so a pruned config is not a strict allowlist of class strings.

The [CLI](./cli.md) can scan and generate in one command. The [JavaScript API](./api-reference.md#createsourcescanneroptions) keeps those steps separate so a build integration can reuse its scanner. Neither enables pruning by default.

Do not prune a design-system package's config against only the package's own source usage if its consumers pass additional class names. Likewise, keep the full config for classes supplied externally and styled by a separate CSS build. Safelisted classes need no exception because the scanner includes them.

## Custom utilities and collisions

Theme overrides can change what an existing class means. For example, `@theme { --text-color-base: red; }` makes `text-base` a color utility. The generator rechecks affected existing names, so `text-base text-sm` keeps both classes while `text-base text-red-500` keeps only the later color. If an override adds independent effects to one class, the generator preserves them conservatively.

A static utility whose compiled declarations match one built-in group's signature can join that group as an alias when the two cover each other's effects. Other custom utilities receive self-conflict groups. When a custom utility fully covers another group's declarations, an override relationship allows the later custom utility to remove the earlier class. Coverage respects declaration-level `!important`: an important custom color survives a later normal text color and cannot alias the normal color group.

Static utility names containing `/` are classified by their complete names. For example, a `badge/icon` that sets color remains independent of a `badge` that sets padding, including when either utility aliases a built-in group.

Shorthand coverage uses known CSS relationships and preserves classes when a relationship is unknown. A custom utility setting `border` can replace earlier border widths and colors, but preserves rounded corners. Likewise, `font` preserves an independent `font-synthesis` setting, and `border-width` preserves `border-image-width`.

Functional values with different compiled effects receive separate groups. For example, `text-stroke-*` can set stroke width for numbers and stroke color for color names; those classes must coexist. Named values and supported numeric kinds are grouped by their properties, surrounding rules, and importance. When those effects differ, both encodings enumerate the named values and omit broad arbitrary-value matchers. Arbitrary values on such roots may therefore remain unmerged even when they overlap.

Negative custom roots such as `@utility -shift-*` use the runtime's shared positive/negative lookup path. A negative-only root merges normally. When both signs are registered, uniform roots with mutually covering effects share a group; otherwise both roots remain unmerged so a left-margin utility cannot remove an independent right-margin utility. Collision checks also include positive custom static names, even ones that would otherwise alias a built-in group. If `shift-small` sets padding while `-shift-small` sets margin, the conflicting functional roots and their overlapping static names remain unmerged to preserve both styles.

The same check applies to opposite static utilities: if `pull` sets left margin and `-pull` sets right margin, both remain unmerged. Compatible static pairs can still share merge behavior. A functional utility with the same name does not restore an incompatible static pair's bare default.

Arbitrary-value probes include images and the other supported Tailwind data types. A `paint-*` utility with separate image and color branches therefore preserves both `paint-[url(hero.svg)]` and `paint-[#123456]`. A utility whose arbitrary values all set the same effects can still merge normally.

Postfix modifiers can also change a functional utility's effects. If `pair-2` sets width and `pair-2/3` adds height, a later `pair-4` must preserve `pair-2/3`. Tailwind's suggested named modifiers participate too: a `label-red-500/xl` utility that adds a font size survives a later color-only `label-blue-500`. Named modifiers are also probed for numeric-only and arbitrary-only roots that have no suggested base classes. These groups first resolve the base class and then request a complete-class lookup, including in pruned configurations.

Bare numeric and arbitrary postfixes are probed even when Tailwind supplies no suggestions. When a modifier adds effects that the available full-class matchers cannot represent, the functional root is conservatively left unmerged in both encodings. Examples include `type-sm/2` adding line height to a named font size, `pair-2/[3px]` adding height to a width utility, and `demo-2/tall` adding a named height to a numeric width utility. This also preserves redundant base classes: the runtime would otherwise fall back to their group for an unrecognized postfix. Suggested classes from these roots appear in the report's `unassignedClasses`. Modifiers that keep the same effects, and separate effect groups whose full classes can be matched, still merge normally.

Overlapping names such as `demo-*` and `demo-child-*` are classified from their own compiled classes. A bare utility and its functional form share a group only when their effects fully cover each other; a separate static `demo-child` can therefore keep different conflict behavior from `demo-child-*`.

For example, a utility setting padding and border radius can remove an earlier padding utility. An ordinary padding utility cannot remove the combined utility because doing so would lose its radius. Likewise, a utility setting both a base color and a hover color survives a later ordinary text color. Conditional rules and pseudo-element effects count as shared scaffolding only when their declarations and surrounding rule paths match. Two identical declarations under different media queries remain independent.

Quoted CSS values retain their declarations even when they contain punctuation or escaped quotes. A base color plus `&::before { content: '('; }` therefore survives a later text color, preserving the pseudo-element.

Custom-property declarations also participate in coverage, including names such as `--_size`, `--2xl`, Unicode identifiers, and escaped punctuation. A color utility that sets `--_size` survives a later text color so a separate `w-(--_size)` class can still read the variable.

Style grouping blocks also retain their declarations and scope. An `entrance` utility combining a color with `@starting-style { opacity: 0; }` survives a later text color, preserving its initial opacity. Grouping rules such as `@scope` and `@layer` are handled conservatively; property registrations and keyframe bodies remain separate from element styles.

When one class name compiles to several independent effects, the generator may remove it from conflict groups so it passes through intact. The report records these collisions and any theme-created classes it could not assign. These decisions and their constraints are described in the [limitations](./limitations.md).

This also applies to new names absent from Tailwind's default suggestions. For example, `--color-x-13` makes `border-x-13` set both inline border width and color. A later `border-blue-500` preserves that class's width; the corresponding `divide-x-13` likewise keeps its divider widths.

## Custom variant ordering

Variants that change the styled element also change which orders can merge. For `@custom-variant children (& > *)`, `children:hover:text-red-500` styles a hovered child, while `hover:children:text-blue-500` styles a child of a hovered parent. The generated config preserves both classes.

The generator checks added and redefined variants, including their suggested named values, for changes to the target. Ordinary media and element-state variants keep commuting; selector lists are handled conservatively because they can mix targets. Open custom variant spellings absent from Tailwind's suggestions may need an explicit `orderSensitiveModifiers` extension; see [limitations](./limitations.md#classification-and-custom-utilities).
