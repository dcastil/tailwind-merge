# tailwind-merge

Utility function to efficiently merge [Tailwind CSS](https://tailwindcss.com) classes in JS without style conflicts.

```ts
import { twMerge } from 'tailwind-merge'

twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]')
// → 'hover:bg-dark-red p-3 bg-[#B91C1C]'
```

-   Supports Tailwind v2.0.0 up to v2.2.4

## What is it for

If you use Tailwind with a component-based UI renderer like [React](https://reactjs.org) or [Vue](https://vuejs.org), you're probably familiar with this situation:

```jsx
import React from 'react'

function MyGenericInput(props) {
    const className = `px-2 py-1 ${props.className || ''}`
    return <input {...props} className={className} />
}

function MySlightlyModifiedInput(props) {
    return (
        <MyGenericInput
            {...props}
            className="p-3" // ← Only want to change some padding
        />
}
```

When the `MySlightlyModifiedInput` is rendered, an input with the className `px-2 py-1 p-3` gets created. But because of the way the [CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade) works, the styles of the `p-3` class are ignored. The order of the classes in the `className` string doesn't matter at all and the only way to apply the `p-3` styles is to remove both `px-2` and `py-1`.

This is where tailwind-merge comes in.

```jsx
function MyGenericInput(props) {
    // ↓ Now `props.className` can override conflicting classes
    const className = twMerge('px-2 py-1', props.className)
    return <input {...props} className={className} />
}
```

tailwind-merge makes sure to override conflicting classes and keeps everything else untouched. In the case of hte `MySlightlyModifiedInput`, the input now only renders the class `p-3`.

## Features

### Optimized for speed

I didn't run any performance benchmarks so far, but you should be able to merge a lot of classes per second. Some aspects of the library:

-   Results get cached by default, so you don't need to worry about wasteful rerenders. The library uses a [LRU cache](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) which stores 500 different results. The cache size can be modified or being opt-out of by using `createTailwinfMerge()`.
-   Expensive computations of data structures happen on demand.

### Last conflicting class wins

```ts
twMerge('p-5 p-2 p-4') // → 'p-4'
```

### Resolves non-trivial conflicts

```ts
twMerge('inset-x-px -inset-1') // → '-inset-1'
twMerge('bottom-auto inset-y-6') // → 'inset-y-6'
twMerge('inline block') // → 'block'
```

### Supports prefixes and stacked prefixes

```ts
twMerge('p-2 hover:p-4') // → 'p-2 hover:p-4'
twMerge('hover:p-2 hover:p-4') // → 'hover:p-4'
twMerge('hover:focus:p-2 focus:hover:p-4') // → 'focus:hover:p-4'
```

### Supports custom values

```ts
twMerge('bg-black bg-[color:var(--mystery-var)]') // → 'bg-[color:var(--mystery-var)]'
twMerge('grid-cols-[1fr,auto] grid-cols-2') // → 'grid-cols-2'
```

### Preserves non-Tailwind-related classes

```ts
twMerge('p-5 p-2 my-non-tailwind-class p-4') // → 'my-non-tailwind-class p-4'
```

### Supports custom colors out of the box

```ts
twMerge('text-red text-secret-sauce') // → 'text-secret-sauce'
```

## API reference

Reference to all exports of tailwind-merge.

### `twMerge`

```ts
function twMerge(...classLists: Array<string | undefined>): string
```

Default function to use if you're using the default Tailwind config or are close enough to the default config. You can use this function if all of the following points apply to you Tailwind config:

-   Only using variants known to Tailwind
-   Only using default color names or color names which don't clash with Tailwind class names
-   Only deviating by number values from number-based Tailwind classes

If some of these points don't apply to you, it makes sense to test whether `twMerge()` still works as intended with your custom classes. Otherwise, you can create your own custom merge function with `createTailwindMerge()`.

### `createTailwindMerge`

```ts
function createTailwindMerge(createConfig: CreateConfig): TailwindMerge
```

Function to create merge function with custom config.

You need to provide a function which resolves to the config tailwind-merge should use for the new merge function. You can either extend from the default config or create a new one from scratch.

```ts
const customTwMerge = createTailwindMerge((getDefaultConfig) => {
    const defaultConfig = getDefaultConfig()

    return {
        cacheSize: 0, // ← Disabling cache
        prefixes: [
            ...defaultConfig.prefixes,
            'my-custom-prefix', // ← Adding custom prefix
        ],
        // ↓ Here you define class groups with a common start in all class names
        dynamicClasses: {
            ...defaultConfig.dynamicClasses,
            // ↓ It's important that keys at this level don't have dashes in them.
            foo: [
                // ↓ Creates group of classes which have conflicting styles
                //   Classes here: foo-1, foo-2, foo-bar-baz-1, foo-bar-baz-2
                ['1', '2', { 'bar-baz': ['1', '2'] }],
            ],
            bar: [
                // ↓ Another group with classes bar-auto, bar-1000, bar-1001, …
                ['auto', (value) => Number(value) > 1000],
            ],
        },
        // ↓ Same like `dynamicClasses`, just for classes with no common starting characters
        standaloneClasses: [
            ...defaultConfig.standaloneClasses,
            // ↓ Same structure like in `dynamicClasses`, but only strings allowed
            ['my-custom-class', 'other-class-same-group'],
        ],
        // ↓ Here you can define additional conflicts across different groups
        conflictingGroups: {
            ...defaultConfig.conflictingGroups,
            // ↓ Path to class group which creates a conflict with …
            'dynamicClasses.foo.0': [
                // ↓ … classes from group at this path
                'dynamicClasses.bar.0',
            ],
        },
    }
})
```
