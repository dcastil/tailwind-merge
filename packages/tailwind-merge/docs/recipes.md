# Recipes

How to configure tailwind-merge with some common patterns.

## Adding custom scale from Tailwind config to tailwind-merge config

> I have a custom shadow scale with the keys 100, 200 and 300 configured in Tailwind. How do I make tailwind-merge resolve conflicts among those?

We'll be able to do this by creating a custom `twMerge` function with [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge).

First, we need to know whether we want to override or extend the default scale. Let's say we extended the default config by adding the CSS variable `--shadow-100`, `--shadow-200` and `--shadow-300` into the `@theme` layer, meaning that the default variables like `--shadow-sm` stay the same.

Then we check whether our particular theme scale is included in tailwind-merge's theme config object [here](./configuration.md#theme). Because tailwind-merge supports Tailwind's `shadow` theme scale, we can add it to the tailwind-merge config like this:

```js
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            // We only need to define the custom scale values without the `shadow-` prefix when adding them to the theme object
            shadow: ['100', '200', '300'],
        },
    },
})
```

In the hypothetical case of the `shadow` theme scale not being supported in tailwind-merge, we would need to check out the [default config of tailwind-merge](../src/lib/default-config.ts) and search for the class group ID of the box shadow scale. After a quick search we would find that tailwind-merge is using the key `shadow` for that group. We could add our custom classes to that group like this:

```js
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            // In class groups we always need to define the entire class name like `shadow-100`, `shadow-200` and `shadow-300`
            // `{ shadow: ['100', '200', '300'] }` is a short-hand syntax for `'shadow-100', 'shadow-200', 'shadow-300'`
            shadow: [{ shadow: ['100', '200', '300'] }],
        },
    },
})
```

Note that by using the `extend` object we're only adding our custom classes to the existing ones in the config, so `twMerge('shadow-200 shadow-lg')` will return the string `shadow-lg`. If we want to override the class instead, we need to use the `override` object instead.

## Extracting classes with Tailwind's [`@apply`](https://tailwindcss.com/docs/reusing-styles#extracting-classes-with-apply)

> How do I make tailwind-merge resolve conflicts with a custom class created with `@apply`?
>
> ```css
> .btn-primary {
>     @apply py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-700;
> }
> ```

I don't recommend using Tailwind's `@apply` directive for classes that might get processed with tailwind-merge.

tailwind-merge would need to be configured so that it knows about which classes `.btn-primary` is in conflict with. This means: If someone adds another Tailwind class to the `@apply` directive, the tailwind-merge config would need to get modified accordingly, keeping it in sync with the written CSS. This easy-to-miss dependency is fragile and can lead to bugs with incorrect merging behavior.

Instead of creating custom CSS classes, I recommend keeping the collection of Tailwind classes in a string variable in JavaScript and access it whenever you want to apply those styles. This way you can reuse the collection of styles but don't need to touch the tailwind-merge config.

```jsx
// React components with JSX syntax used in this example

import { twMerge } from 'tailwind-merge'

const BTN_PRIMARY_CLASSNAMES = 'py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-700'

function ButtonPrimary(props) {
    return <button {...props} className={twMerge(BTN_PRIMARY_CLASSNAMES, props.className)} />
}
```

## Modifying inputs and output of `twMerge`

> How do I make `twMerge` accept the same argument types as clsx/classnames?

You can wrap `twMerge` in another function which can modify the inputs and/or output.

```js
import { twMerge as twMergeOriginal } from 'tailwind-merge'

function twMerge(...inputs) {
    const modifiedInputs = modifyInputs(inputs)
    return twMergeOriginal(modifiedInputs)
}
```

---

Next: [API reference](./api-reference.md)

Previous: [Configuration](./configuration.md)

[Back to overview](./README.md)
