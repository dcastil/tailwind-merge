# When and how to use it

Like any other package, tailwind-merge comes with opportunities and trade-offs. This document tries to help you decide if tailwind-merge is the right tool for your use case based on my own experience and the feedback I got from the community.

> **Note**
> If you're thinking of a major argument that is not covered here, please [let me know](https://github.com/dcastil/tailwind-merge/discussions/new?category=ideas)!

## When to use it

### Using Tailwind CSS and component composition

I hope this is self-explanatory, but tailwind-merge is probably only useful if you use Tailwind CSS and compose components together in some form. If you have a use case for tailwind-merge outside of thosse boundaries, please [let me know](https://github.com/dcastil/tailwind-merge/discussions/new?category=show-and-tell), I'm curious about it!

### Using highly reusable components

tailwind-merge is a great fit for highly reusable components like in design systems or UI component libraries. If you expect that styles of a component will be modified on multiple levels, e.g. ContextMenuOption -> MenuOption -> BaseOption, with each component passing some modifications to the component it renders, tailwind-merge can help you to keep the API surface between components small.

### Fast development velocity and iteration speed wanted

tailwind-merge allows you to support a wide range of styling use cases without having to explicitly define each of them separately within a component. E.g. you can pass a custom width to a button component, change its text color or position it absolutely with a single `className` prop without the need to define support for custom widths, text colors or positioning within the button component explicitly.

### Preventing premature abstractions

Let's say you have a Button component that you already use in many places. You have a place in your app in which you want to make its background red to signal that the action of the button is destructive. You could modify the Button component to deal with the concept of destructiveness, but then you'd need to make sure that those styles work with all the other permutations of the component which you don't need in the place where the destructive button is used. And maybe you're not even sure whether you'll keep the Button red in this one place, so the time investment of making the Button understand destructiveness doesn't seem worth it.

tailwind-merge allows you to defer the creation of abstractions like destructiveness to the point where you're sure that you need them. You can just pass a `className` prop to the Button component in which you define the red background and be done with it for now. If you later decide that you want to make the Button red in more places, you can still define the logic inside the Button component later.

## When not to use it

### Bundle size constraints

tailwind-merge relies on a large config (~5 kB out of the ~7 kB minified and gzipped bundle size) to understand which classes are conflicting. This might be limiting if you have tight bundle size constraints.

### API surface constraints

With large teams or components that are made available publicly, API surface of components becomes an issue as it will be used and misused in any way the API allows. With this in mind tailwind-merge might give too much freedom to users of a component which could make it harder to maintain and evolve the component over time. If you need full control over styling in your components, tailwind-merge is probably not be the right tool for you.

## How to use it

<!-- TODO: Write content -->

## Alternatives

<!-- TODO: Write content -->

---

Next: [Features](./features.md)

Previous: [What is it for](./what-is-it-for.md)

[Back to overview](./README.md)
