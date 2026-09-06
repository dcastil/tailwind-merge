# Limitations and compatibility

## Versions and runtime

The configurator is unreleased and its direct API is unstable. Its manifest currently declares Tailwind peers beginning at 4.3.3; a peer range is not a tested version matrix. The implementation and fixtures have been developed against the 4.3 line. Generation uses Tailwind's `__unstable__loadDesignSystem`, which is outside Tailwind's normal stable API contract.

Generation also depends on the library's unstable classification/parser exports and `themeKey` metadata. Use the matching library from this checkout until the next tailwind-merge release. Use a matching runtime for the generated output as well: importing only public functions does not establish compatibility with every older configuration format or merge behavior.

The emitted module is an ES module and needs tailwind-merge at runtime. Tailwind, oxide, and the configurator do not execute in the browser. TypeScript output uses `satisfies`; consumers with older TypeScript compilers can request JavaScript instead.

## Input and source boundaries

- Supply Tailwind v4 input CSS, not a compiled stylesheet or a v3 JavaScript config directly. Legacy configuration can be loaded through `@config` in v4 CSS.
- Referenced packages and files must exist where Tailwind resolves them. The fixture suite strips some external plugins from copied projects; it does not validate every third-party plugin installation.
- Each generated module describes one resolved stylesheet. For independent themes, generate separate modules and use the appropriate function for each theme.
- Source pruning only sees the configured sources and safelist. Classes styled outside that CSS build require a suitable full configuration, and generated files must be excluded from scanning.

## Classification and custom utilities

- Compact encoding may let a nonexistent name evict a real class. Exact encoding avoids overmatching finite named scales, but it is not full Tailwind type validation: arbitrary-value validators can still accept a wrongly typed value on a custom functional utility.
- `getClassList()` supplies suggestions, not every possible spelling. The generator probes additional aliases and open value kinds, but an empty `unassignedClasses` report does not prove all valid classes and combinations are handled.
- Custom conflict inference uses compiled declarations and representative built-in classes. Partial overlaps, conditional styles, and pseudo-element effects are handled conservatively; automatic inference does not establish every possible relationship. Built-in-to-custom override inference is not general; aliases cover the cases that can join a built-in group safely.
- A custom functional root with different effects across its names or probed value kinds is split into separate groups. Such roots enumerate names in both encodings and omit broad arbitrary-value matchers; some valid overlapping arbitrary classes therefore remain unmerged. Suggestions and probes do not exhaust every arbitrary type or spelling.
- Custom variant ordering is inferred from registered variants and their suggested values. Open custom functional variants absent from those suggestions may need their used spellings added to `orderSensitiveModifiers` through a [configuration extension](./api-reference.md#compose-the-generated-configuration).
- Classes that combine independent effects may pass through unmerged to avoid losing styles. The generated config also inherits deliberate semantics and known gaps from the library's default configuration.
- Pruning preserves behavior for supplied candidates relative to the full config. Retained validators can still recognize names that were not scanned. Pruning is not a strict class-name allowlist.
- Extensions referencing a group removed by pruning have no effect on that absent group. Add the necessary class group yourself or use an unpruned config.

For a surprising result, inspect `plan.report` and use the [development inspector](../../../agents/configurator.md#debugging-and-validation). Reproductions should include the input CSS, package versions, encoding/pruning settings, and the class list.
