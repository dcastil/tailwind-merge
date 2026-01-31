# Limitations

tailwind-merge is designed to work intelligently with Tailwind CSS classes, but there are some limitations and edge cases to be aware of.

## Don't use classes that look like Tailwind classes but apply different styles

tailwind-merge applies some heuristics to detect the type of a class even if that particular class does not exist in the default Tailwind config. E.g. the class `text-1000xl` does not exist in Tailwind CSS by default but is treated like a `font-size` class in tailwind-merge because it starts with `text-` followed by an optional number and a T-shirt size, like all the other `font-size` classes.

This behavior has the advantage that you're less likely to need to configure tailwind-merge if you're only changing or extending some scales in your Tailwind config. But it also means that tailwind-merge treats classes that look like Tailwind classes as Tailwind classes although they might not be defined in your Tailwind config.

**Example of potential issues**:

```ts
import { twMerge } from 'tailwind-merge'

// ❌ Problem: If you create a custom class that matches a Tailwind pattern
// Tailwind detects T-shirt sizes with optional numbers: xs, sm, md, lg, xl, 2xl, 3xl, etc.
// So even non-existent sizes like text-10xl are treated as font-size classes:

twMerge('text-lg text-10xl') // → 'text-10xl'
// text-lg is removed because text-10xl matches the font-size pattern (text + number + xl)

// This is especially problematic if you want to create custom utility classes
// that happen to match these patterns. For example, if you have a custom
// `text-2xs` class that applies specific styles (not just font-size):
twMerge('text-sm text-2xs') // → 'text-2xs'
// text-sm is removed even if your text-2xs does completely different things
```

**How to avoid this**:

1. **Use prefixes that don't match Tailwind patterns** - Instead of `text-2xs`, use `typography-2xs`
2. **Use component-specific prefixes** - Prefix custom utilities with `app-`, `ui-`, or your project name
3. **Don't merge custom component classes** - Keep your custom utility classes separate from classes that are passed through `twMerge`

```ts
// ✅ Good: Use non-conflicting naming
twMerge('text-lg typography-custom') // → 'text-lg typography-custom'
twMerge('text-sm ui-text-special') // → 'text-sm ui-text-special'

// ✅ Good: Keep custom classes separate from merging
<Component className={twJoin(twMerge('text-lg', props.className), 'text-custom')} />
```

## You need to use labels in ambiguous arbitrary value classes

tailwind-merge detects the type of class by parsing the class name. Some arbitrary value patterns are ambiguous and need explicit labels.

### Arbitrary `font-weight` and `font-family` classes

Both `font-weight` and `font-family` use the `font-*` prefix in Tailwind CSS. When using arbitrary variables without labels, tailwind-merge cannot determine whether the class sets font-weight or font-family, so it defaults to treating unlabeled arbitrary variables as font-weight. This matches Tailwind CSS behavior, which also defaults to font-weight for ambiguous `font-*` classes.

```ts
// ⚠️ Unlabeled arbitrary variables default to font-weight
twMerge('font-(--my-family) font-(--my-weight)')
// → 'font-(--my-weight)' (both treated as font-weight, first one removed)

// ✅ Use `family-name:` label for font-family
twMerge('font-(family-name:--my-family) font-(--my-weight)')
// → 'font-(family-name:--my-family) font-(--my-weight)' (both kept)
```

Required labels:

- `font-family`: use `family-name:` prefix (e.g., `font-(family-name:--my-font)`)
- `font-weight`: no label needed, but you can use `weight:` or `number:` for clarity (e.g., `font-(weight:--my-weight)`)

The same applies to arbitrary values with square brackets:

```ts
// ⚠️ Unlabeled arbitrary values default to font-weight
twMerge('font-[var(--family)] font-[var(--weight)]')
// → 'font-[var(--weight)]'

// ✅ Use explicit labels
twMerge('font-[family-name:var(--family)] font-[var(--weight)]')
// → 'font-[family-name:var(--family)] font-[var(--weight)]'
```

### Arbitrary `background-position` and `background-size` classes

When using a class like `bg-[30%_30%]`, tailwind-merge can't determine whether the class is a `background-position` or `background-size` class.

```ts
// ❌ Ambiguous - could be position or size
// Without a label, tailwind-merge cannot determine the type
twMerge('bg-[30%_30%] bg-cover') // → 'bg-[30%_30%] bg-cover'

// ✅ Use explicit labels
twMerge('bg-[position:30%_30%] bg-cover') // → 'bg-[position:30%_30%] bg-cover'
twMerge('bg-[size:30%_30%] bg-cover') // → 'bg-cover'
```

Required labels:

- `background-position`: use `position:` prefix (e.g., `bg-[position:30%_30%]`)
- `background-size`: use `length:`, `size:`, or `percentage:` prefix (e.g., `bg-[size:200px_100px]`)

### Arbitrary values in `text-*` classes

The `text-*` prefix is used for both font-size and text-color. For arbitrary values, tailwind-merge tries to infer the type, but explicit labels help in ambiguous cases:

```ts
// ✅ Clear cases (no label needed)
twMerge('text-[12px] text-[16px]') // → 'text-[16px]' (detected as font-size)
twMerge('text-[#ff0000] text-[#00ff00]') // → 'text-[#00ff00]' (detected as color)

// ⚠️ Ambiguous cases (label recommended)
twMerge('text-[theme(myCustomScale.value)] text-lg')
// → 'text-[theme(myCustomScale.value)] text-lg' (without label, defaults to color interpretation)

// ✅ Use explicit label for clarity
twMerge('text-[length:theme(myCustomScale.value)] text-lg') // → 'text-lg'
```

## Arbitrary properties don't merge with standard classes

tailwind-merge does not resolve conflicts between arbitrary properties and their matching Tailwind classes to keep bundle size small.

```ts
// ❌ These won't conflict with each other
twMerge('p-4 [padding:1rem]') // → 'p-4 [padding:1rem]' (both kept)

// ✅ Use standard Tailwind classes when possible
twMerge('p-4 p-8') // → 'p-8' (correctly merged)
```

**Why this limitation exists**: Parsing arbitrary property names and determining their conflicts would require including CSS property knowledge in the bundle, significantly increasing the library size.

## Arbitrary variants don't merge with standard modifiers

Similar to arbitrary properties, arbitrary variants don't conflict with standard modifiers:

```ts
// ❌ These won't conflict
twMerge('[&:focus]:ring focus:ring-4') // → '[&:focus]:ring focus:ring-4' (both kept)

// ✅ Use standard modifiers when possible
twMerge('focus:ring focus:ring-4') // → 'focus:ring-4' (correctly merged)
```

## Doesn't understand custom CSS

tailwind-merge only understands Tailwind classes and doesn't analyze your custom CSS:

```ts
// Custom classes are preserved but not understood
twMerge('my-custom-padding p-4') // → 'my-custom-padding p-4'
// Even if my-custom-padding sets padding, tailwind-merge can't know that
```

If you have custom classes created with `@apply` or custom CSS that conflict with Tailwind classes, see the [recipes documentation](./recipes.md#extracting-classes-with-tailwinds-apply) for alternatives.

## Performance with extremely long class strings

While tailwind-merge is optimized for typical use cases and includes caching, processing extremely long class strings (1000+ classes) may have performance implications in hot paths:

```ts
// ⚠️ Avoid in frequently called render functions if classList is huge
const veryLongClassList = Array(1000).fill('p-2 p-3').join(' ')
twMerge(veryLongClassList) // Works, but slower with cache misses
```

For most real-world use cases, this is not an issue due to the LRU cache.

---

Next: [Configuration](./configuration.md)

Previous: [Features](./features.md)

[Back to overview](./README.md)
