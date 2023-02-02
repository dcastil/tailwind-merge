# Recipes

How to configure tailwind-merge with some common patterns.

## Adding custom scale from Tailwind config to tailwind-merge config

> I have a custom shadow scale with the keys 100, 200 and 300 configured in Tailwind. How do I make tailwind-merge resolve conflicts among those?

You'll be able to do this by creating a custom `twMerge` functon with [`extendTailwindMerge`](./api-reference.md#extendtailwindmerge).

First, check whether your particular theme scale is included in tailwind-merge's theme config object [here](./configuration.md#theme). In the hypothetical case that tailwind-merge supported Tailwind's `boxShadow` theme scale, you could add it to the tailwind-merge config like this:

```js
const customTwMerge = extendTailwindMerge({
    theme: {
        // The `boxShadow` key isn't actually supported
        boxShadow: [{ shadow: ['100', '200', '300'] }],
    },
})
```

In the case of the `boxShadow` scale, tailwind-merge doesn't include it in the theme object. Instead, we need to check out the [default config of tailwind-merge](../src/lib/default-config.ts) and search for the class group ID of the box shadow scale. After a quick search we find that tailwind-merge is using the key `shadow` for that group. We can add our custom classes to that group like this:

```js
const customTwMerge = extendTailwindMerge({
    classGroups: {
        shadow: [{ shadow: ['100', '200', '300'] }],
    },
})
```

Note that by using `extendTailwindMerge` we're only adding our custom classes to the existing ones in the config, so `twMerge('shadow-200 shadow-lg')` will return the string `shadow-lg`. In most cases that's fine because you won't use that class in your project.

If you expect classes like `shadow-lg` to be input in `twMerge` and don't want the class to cause incorrect merges, you can explicitly override the class group with [`createTailwindMerge`](./api-reference.md#createtailwindmerge), removing the default classes.

```js
const customTwMerge = createTailwindMerge(() => {
    const config = getDefaultConfig()
    config.classGroups.shadow = [{ shadow: ['100', '200', '300'] }]
    return config
})
```

## Extracting classes with Tailwind's [`@apply`](https://tailwindcss.com/docs/reusing-styles#extracting-classes-with-apply)

> How do I make tailwind-merge resolve conflicts with a custom class created with `@apply`?
>
> ```css
> .btn-primary {
>     @apply py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-700;
> }
> ```

I don't recommend using Tailwind's `@apply` directive for classes that might get processed with tailwind-merge.

tailwind-merge would need to be configured so that it knows about which classes `.btn-primary` is in conflict with. This means: If someone adds another Tailwind class to the `@apply` directive, the tailwind-merge config would need to get modified accordignly, keeping it in sync with the written CSS. This easy-to-miss dependency is fragile and can lead to bugs with incorrect merging behavior.

Instead of creating custom CSS classes, I recommend keeping the collection of Tailwind classes in a string variable in JavaScript and access it whenever you want to apply those styles. This way you can reuse the collection of styles but don't need to touch the tailwind-merge config.

```jsx
// React components with JSX syntax used in this example

const BTN_PRIMARY_CLASSNAMES = 'py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-700'

function ButtonPrimary(props) {
    return <button {...props} className={twMerge(BTN_PRIMARY_CLASSNAMES, props.className)} />
}
```

## Modifying inputs and output of `twMerge`

> How do I make `twMerge` accept the same argument types as clsx/classnames?

You can wrap `twMerge` in another function which can modify the inputs and/or output.

```js
function customTwMerge(...inputs) {
    const modifiedInputs = modifyInputs(inputs)
    return twMerge(modifiedInputs)
}
```

---

Next: [API reference](./api-reference.md)

Previous: [Configuration](./configuration.md)
