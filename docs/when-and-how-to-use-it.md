# When and how to use it

Like any other package, tailwind-merge comes with opportunities and trade-offs. This document tries to help you decide whether tailwind-merge is the right tool for your use case based on my own experience and the feedback I got from the community.

> [!Note]
> If you're thinking of a major argument that is not covered here, please [let me know](https://github.com/dcastil/tailwind-merge/discussions/new?category=ideas)!

## Reasons not to use it

Generally speaking, there are situations where you _could_ use tailwind-merge but probably shouldn't. Think of tailwind-merge as an escape hatch rather than the primary tool to handle style variants.[^simonswiss-quote]

[^simonswiss-quote]: Don't just take my word for it, [Simon Vrachliotis thinks so too](https://twitter.com/simonswiss/status/1663721037949984768).

### Increases bundle size

tailwind-merge relies on a large config (~5 kB out of the ~7 kB minified and gzipped bundle size) to understand which classes are conflicting. This might be limiting if you have tight bundle size constraints.

### Might give too much freedom to users of a component

With large teams or components that are made available publicly you can expect users of components to use and misuse the component's API in any way the component allows. With this in mind tailwind-merge might give too much freedom to users of a component which could make it harder to maintain and evolve the component over time. With tailwind-merge you give up full control over styling in your components.

### More difficult to refactor highly reusable components

When you allow arbitrary classes to be passed into a component, you can break the styles of the component's users when you refactor the component's internal styles. If you need to be able to refactor a component's styles often, those styles shouldn't be merged with styles from props unless you're willing to refactor the component's uses as well.

### Not using Tailwind CSS or component composition

tailwind-merge is probably only useful if you use Tailwind CSS and compose components together in some form. If you have a use case for tailwind-merge outside of those boundaries, please [let me know](https://github.com/dcastil/tailwind-merge/discussions/new?category=show-and-tell), I'm curious about it!

## Reasons to use it

### Easy to compose components through multiple levels

tailwind-merge is a great fit for highly composed components, like in design systems or UI component libraries. If you expect that styles of a component will be modified on multiple levels, e.g. ContextMenuOption → MenuOption → BaseOption, with each component passing some modifications to the component it renders, tailwind-merge can help you to keep the API surface between components small.

### Enables fast development velocity and iteration speed

tailwind-merge allows you to support a wide range of styling use cases without having to explicitly define each of them separately within a component. E.g. you can pass a custom width to a button component, change its text color or position it absolutely with a single `className` prop without the need to define support for custom widths, text colors or positioning within the button component explicitly.

### Preventing premature abstractions

Let's say you have a Button component that you already use in many places. You have a place in your app in which you want to make its background red to signal that the action of the button is destructive. You could modify the Button component to deal with the concept of destructiveness (e.g. by passing a `variant` prop with the value `destructive`), but then you'd need to make sure that those styles work with all the other permutations of the component which you don't need in the place where the destructive button is used. And maybe you're not even sure whether you'll keep the Button red in this one place, so the time investment of making the Button understand destructiveness doesn't seem worth it.

tailwind-merge allows you to defer the creation of abstractions like destructiveness to the point where you're sure that you need them. You can just pass a `className` prop to the Button component in which you define the red background and be done with it for now. If you later decide that you want to make the Button red in more places, you can still define the logic inside the Button component later.

## How to use it

### Joining internal classes

If you want to merge classes that are all defined within a component, prefer using the [`twJoin`](./api-reference.md#twjoin) function over [`twMerge`](./api-reference.md#twmerge). As the name suggests, `twJoin` only joins the class strings together and doesn't deal with conflicting classes.

```jsx
// React components with JSX syntax used in this example

import { twJoin } from 'tailwind-merge'

function MyComponent({ forceHover, disabled, isMuted }) {
    return (
        <div
            className={twJoin(
                TYPOGRAPHY_STYLES_LABEL_SMALL,
                'grid w-max gap-2',
                forceHover ? 'bg-gray-200' : ['bg-white', !disabled && 'hover:bg-gray-200'],
                isMuted && 'text-gray-600',
            )}
        >
            {/* More code… */}
        </div>
    )
}
```

Joining classes instead of merging forces you to write your code in a way so that no merge conflicts appear which seems like more work at first. But it has two big advantages:

1. It's much more performant because no conflict resolution is computed. `twJoin` has the same performance characteristics as other class joining libraries like [`clsx`](https://www.npmjs.com/package/clsx).

2. It's usually easier to reason about. When you can't override classes, you naturally start to put classes that are in conflict with each other closer together through conditionals like ternaries. Also when a condition within the `twJoin` call is truthy, you can be sure that this class will be applied without the need to check whether conflicting classes appear in a later argument. Not relying on overrides makes it easier to understand which classes are in conflict with each other and which classes are applied in which cases.

But there are also exceptions to (2) in which using `twMerge` for purely internally defined classes is preferable, especially in some complicated cases. So just take this as a rule of thumb.

### Merging internal classes with `className` prop

The primary purpose of tailwind-merge is to merge a `className` prop with the default classes of a component.

```jsx
// React components with JSX syntax used in this example

import { twMerge } from 'tailwind-merge'

function MyComponent({ forceHover, disabled, isMuted, className }) {
    return (
        <div
            className={twMerge(
                TYPOGRAPHY_STYLES_LABEL_SMALL,
                'grid w-max gap-2',
                forceHover ? 'bg-gray-200' : ['bg-white', !disabled && 'hover:bg-gray-200'],
                isMuted && 'text-gray-600',
                className,
            )}
        >
            {/* More code… */}
        </div>
    )
}
```

You don't need to worry about potentially expensive re-renders here because tailwind-merge [caches results](./features.md#results-are-cached) so that a re-render with the same props and state becomes computationally lightweight as far as the call to `twMerge` goes.

If you use a custom Tailwind CSS config, don't forget to [configure tailwind-merge](./configuration.md#usage-with-custom-tailwind-config) as well.

## Alternatives

In case the disadvantages of tailwind-merge weigh in too much for your use case, here are some alternatives that might be a better fit.

### Adding props that toggle internal styles

This is the good-old way of styling components and is also probably your default. E.g. think of a variant prop that toggles between primary and secondary styles of a button. The `variant` prop is already toggling between internal styles of the component and you can use the same pattern to define any number of styling use cases to a component. If you have a one-off use case to give the button a full width, you can add a `isFullWidth` prop to the button component which toggles the `w-full` class internally.

```jsx
// React components with JSX syntax used in this example

function Button({ variant = 'primary', isFullWidth, ...props }) {
    return <button {...props} className={join(BUTTON_VARIANTS[variant], isFullWidth && 'w-full')} />
}

const BUTTON_VARIANTS = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-200 text-black',
}

function join(...args) {
    return args.filter(Boolean).join(' ')
}
```

### Using Tailwind's important modifier

If you have too many different one-off use cases to add a prop for each of them to a component, you can use Tailwind's [important modifier](https://tailwindcss.com/docs/configuration#important-modifier) to override internal styles.

```jsx
// React components with JSX syntax used in this example

function MyComponent() {
    return (
        <>
            <Button className="w-full">No danger</Button>
            <Button className="w-full bg-red-500!" >Danger!</Button>
        </>
    )
}

function Button({ className ...props }) {
    return <button {...props} className={join('bg-blue-500 text-white', className)} />
}

function join(...args) {
    return args.filter(Boolean).join(' ')
}
```

The main downside of this approach is that it only works one level deep (you can't override the `bg-red-500!` class in the example above). But if you don't need to be able to override styles through multiple levels of composition, this might be the most lightweight approach possible.


### Using Tailwind's custom variant

Instead of increasing specificity with important modifier, you can also decrease specificity of base classes using Tailwind's [custom variant](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-variants).

For example, you can create a custom variant that wraps the selector with [`:where()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:where):

```css
@custom-variant component (:where(&));
```

And use the variant in the component's base classes:

```jsx
// React components with JSX syntax used in this example

function MyComponent() {
    return (
        <>
            <Button className="w-full">No danger</Button>
            // .bg-red-500 works as expected since it has higher specificity
            <Button className="w-full bg-red-500">Danger!</Button>
        </>
    )
}

function Button({ className ...props }) {
    return <button {...props} className={join('component:bg-blue-500 component:text-white', className)} />
}

function join(...args) {
    return args.filter(Boolean).join(' ')
}
```

---

Next: [Features](./features.md)

Previous: [What is it for](./what-is-it-for.md)

[Back to overview](./README.md)
