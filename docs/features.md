# Features

## Merging behavior

tailwind-merge is designed to be predictable and intuitive. It follows a set of rules to determine which class wins when there are conflicts. Here is a brief overview of the conflict resolution tailwind-merge can do.

### Last conflicting class wins

```ts
twMerge('p-5 p-2 p-4') // → 'p-4'
```

### Allows refinements

```ts
twMerge('p-3 px-5') // → 'p-3 px-5'
twMerge('inset-x-4 right-4') // → 'inset-x-4 right-4'
```

### Resolves non-trivial conflicts

```ts
twMerge('inset-x-px -inset-1') // → '-inset-1'
twMerge('bottom-auto inset-y-6') // → 'inset-y-6'
twMerge('inline block') // → 'block'
```

### Supports modifiers and stacked modifiers

```ts
twMerge('p-2 hover:p-4') // → 'p-2 hover:p-4'
twMerge('hover:p-2 hover:p-4') // → 'hover:p-4'
twMerge('hover:focus:p-2 focus:hover:p-4') // → 'focus:hover:p-4'
```

The order of standard modifiers does not matter for tailwind-merge.

### Supports arbitrary values

```ts
twMerge('bg-black bg-[color:var(--mystery-var)]') // → 'bg-[color:var(--mystery-var)]'
twMerge('grid-cols-[1fr,auto] grid-cols-2') // → 'grid-cols-2'
```

### Supports arbitrary properties

```ts
twMerge('[mask-type:luminance] [mask-type:alpha]') // → '[mask-type:alpha]'
twMerge('[--scroll-offset:56px] lg:[--scroll-offset:44px]')
// → '[--scroll-offset:56px] lg:[--scroll-offset:44px]'

// Don't do this!
twMerge('[padding:1rem] p-8') // → '[padding:1rem] p-8'
```

> **Warning**
> Watch out for using arbitrary properties which could be expressed as Tailwind classes. tailwind-merge does not resolve conflicts between arbitrary properties and their matching Tailwind classes to keep the bundle size small.

### Supports arbitrary variants

```ts
twMerge('[&:nth-child(3)]:py-0 [&:nth-child(3)]:py-4') // → '[&:nth-child(3)]:py-4'
twMerge('dark:hover:[&:nth-child(3)]:py-0 hover:dark:[&:nth-child(3)]:py-4')
// → 'hover:dark:[&:nth-child(3)]:py-4'

// Don't do this!
twMerge('[&:focus]:ring focus:ring-4') // → '[&:focus]:ring focus:ring-4'
```

> **Warning**
> Similarly to arbitrary properties, tailwind-merge does not resolve conflicts between arbitrary variants and their matching predefined modifiers for bundle size reasons.

The order of standard modifiers before and after an arbitrary variant in isolation (all modifiers before are one group, all modifiers after are another group) does not matter for tailwind-merge. However, it does matter whether a standard modifier is before or after an arbitrary variant both for Tailwind CSS and tailwind-merge because the resulting CSS selectors are different.

### Supports important modifier

```ts
twMerge('!p-3 !p-4 p-5') // → '!p-4 p-5'
twMerge('!right-2 !-inset-x-1') // → '!-inset-x-1'
```

### Supports postfix modifiers

```ts
twMerge('text-sm leading-6 text-lg/7') // → 'text-lg/7'
```

### Preserves non-Tailwind classes

```ts
twMerge('p-5 p-2 my-non-tailwind-class p-4') // → 'my-non-tailwind-class p-4'
```

### Supports custom colors out of the box

```ts
twMerge('text-red text-secret-sauce') // → 'text-secret-sauce'
```

## Composition

tailwind-merge has some features that simplify composing class strings together.

### Supports multiple arguments

```ts
twMerge('some-class', 'another-class yet-another-class', 'so-many-classes')
// → 'some-class another-class yet-another-class so-many-classes'
```

### Supports conditional classes

```ts
twMerge('some-class', undefined, null, false, 0) // → 'some-class'
twMerge('my-class', false && 'not-this', null && 'also-not-this', true && 'but-this')
// → 'some-class but-this'
```

### Supports arrays and nested arrays

```ts
twMerge('some-class', [undefined, ['another-class', false]], ['third-class'])
// → 'some-class another-class third-class'
twMerge('hi', true && ['hello', ['hey', false]], false && ['bye'])
// → 'hi hello hey'
```

Why no object support? [Read here](https://github.com/dcastil/tailwind-merge/discussions/137#discussioncomment-3481605).

## Performance

tailwind-merge is optimized for speed when running in the browser. This includes the speed of loading the code and the speed of running the code.

### Results are cached

Results get cached by default, so you don't need to worry about wasteful re-renders. The library uses a computationally lightweight [LRU cache](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) which stores up to 500 different results by default. The cache is applied after all arguments are [joined](./api-reference.md#twjoin) together to a single string. This means that if you call `twMerge` repeatedly with different arguments that result in the same string when joined, the cache will be hit.

The cache size can be modified or opt-out of by using [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge).

### Data structures are reused between calls

Expensive computations happen upfront so that `twMerge` calls without a cache hit stay fast.

### Lazy initialization

The initial computations are called lazily on the first call to `twMerge` to prevent it from impacting app startup performance if it isn't used initially.

---

Next: [Configuration](./configuration.md)

Previous: [What is it for](./what-is-it-for.md)
