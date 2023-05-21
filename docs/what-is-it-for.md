# What is it for

If you use Tailwind with a component-based UI renderer like [React](https://reactjs.org) or [Vue](https://vuejs.org), you're probably familiar with the situation that you want to change some styles of a component, but only in one place.

```jsx
// React components with JSX syntax used in this example

function MyGenericInput(props) {
    const className = `border rounded px-2 py-1 ${props.className || ''}`
    return <input {...props} className={className} />
}

function MySlightlyModifiedInput(props) {
    return (
        <MyGenericInput
            {...props}
            className="p-3" // ← Only want to change some padding
        />
    )
}
```

When the `MySlightlyModifiedInput` is rendered, an input with the className `border rounded px-2 py-1 p-3` gets created. But because of the way the [CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade) works, the styles of the `p-3` class are ignored. The order of the classes in the `className` string doesn't matter at all and the only way to apply the `p-3` styles is to remove both `px-2` and `py-1`.

This is where tailwind-merge comes in.

```jsx
function MyGenericInput(props) {
    // ↓ Now `props.className` can override conflicting classes
    const className = twMerge('border rounded px-2 py-1', props.className)
    return <input {...props} className={className} />
}
```

tailwind-merge overrides conflicting classes and keeps everything else untouched. In the case of the `MySlightlyModifiedInput`, the input now only renders the classes `border rounded p-3`.

---

Next: [Features](./features.md)

[Back to overview](./README.md)
