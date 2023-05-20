# Features

## Optimized for speed

-   Results get cached by default, so you don't need to worry about wasteful re-renders. The library uses a [LRU cache](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) which stores up to 500 different results. The cache size can be modified or opt-out of by using [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge).
-   Expensive computations happen upfront so that `twMerge` calls without a cache hit stay fast.
-   These computations are called lazily on the first call to `twMerge` to prevent it from impacting app startup performance if it isn't used initially.

## Last conflicting class wins

```ts
twMerge('p-5 p-2 p-4') // → 'p-4'
```

## Allows refinements

```ts
twMerge('p-3 px-5') // → 'p-3 px-5'
twMerge('inset-x-4 right-4') // → 'inset-x-4 right-4'
```

## Resolves non-trivial conflicts

```ts
twMerge('inset-x-px -inset-1') // → '-inset-1'
twMerge('bottom-auto inset-y-6') // → 'inset-y-6'
twMerge('inline block') // → 'block'
```

## Supports modifiers and stacked modifiers

```ts
twMerge('p-2 hover:p-4') // → 'p-2 hover:p-4'
twMerge('hover:p-2 hover:p-4') // → 'hover:p-4'
twMerge('hover:focus:p-2 focus:hover:p-4') // → 'focus:hover:p-4'
```

## Supports arbitrary values

```ts
twMerge('bg-black bg-[color:var(--mystery-var)]') // → 'bg-[color:var(--mystery-var)]'
twMerge('grid-cols-[1fr,auto] grid-cols-2') // → 'grid-cols-2'
```

## Supports arbitrary properties

```ts
twMerge('[mask-type:luminance] [mask-type:alpha]') // → '[mask-type:alpha]'
twMerge('[--scroll-offset:56px] lg:[--scroll-offset:44px]')
// → '[--scroll-offset:56px] lg:[--scroll-offset:44px]'

// Don't do this!
twMerge('[padding:1rem] p-8') // → '[padding:1rem] p-8'
```

> **Warning**
> Watch out for mixing arbitrary properties which could be expressed as Tailwind classes. tailwind-merge does not resolve conflicts between arbitrary properties and their matching Tailwind classes to keep the bundle size small.

## Supports arbitrary variants

```ts
twMerge('[&:nth-child(3)]:py-0 [&:nth-child(3)]:py-4') // → '[&:nth-child(3)]:py-4'
twMerge('dark:hover:[&:nth-child(3)]:py-0 hover:dark:[&:nth-child(3)]:py-4')
// → 'hover:dark:[&:nth-child(3)]:py-4'

// Don't do this!
twMerge('[&:focus]:ring focus:ring-4') // → '[&:focus]:ring focus:ring-4'
```

> **Warning**
> Similarly to arbitrary properties, tailwind-merge does not resolve conflicts between arbitrary variants and their matching predefined modifiers for bundle size reasons.

## Supports important modifier

```ts
twMerge('!p-3 !p-4 p-5') // → '!p-4 p-5'
twMerge('!right-2 !-inset-x-1') // → '!-inset-x-1'
```

## Supports postfix modifiers

```ts
twMerge('text-sm leading-6 text-lg/7') // → 'text-lg/7'
```

## Preserves non-Tailwind classes

```ts
twMerge('p-5 p-2 my-non-tailwind-class p-4') // → 'my-non-tailwind-class p-4'
```

## Supports custom colors out of the box

```ts
twMerge('text-red text-secret-sauce') // → 'text-secret-sauce'
```

## Ignores falsy values

```ts
twMerge('some-class', undefined, null, false, 0) // → 'some-class'
```

## Supports arrays and nested arrays

```ts
twMerge('some-class', [undefined, ['another-class', false]], ['third-class'])
// → 'some-class another-class third-class'
```

Why no object support? [Read here](https://github.com/dcastil/tailwind-merge/discussions/137#discussioncomment-3481605).

---

Next: [Configuration](./configuration.md)

Previous: [What is it for](./what-is-it-for.md)
