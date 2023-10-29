# Limitations

## Don't use classes that look like Tailwind classes but apply different styles

tailwind-merge applies some heuristics to detect the type of a class even if that particular class does not exist in the default Tailwind config. E.g. the class `text-1000xl` does not exist in Tailwind CSS by default but is treated like a `font-size` class in tailwind-merge because it starts with `text-` followed by an optional number and a T-shirt size, like all the other `font-size` classes.

This behavior has the advantage that you're less likely to need to configure tailwind-merge if you're only changing or extending some scales in your Tailwind config. But it also means that tailwind-merge treats classes that look like Tailwind classes as Tailwind classes although they might not be defined in your Tailwind config.

## You need to use label in arbitrary `background-position` and `background-size` classes

tailwind-merge detects the type of class by parsing the class name. When using a class like `bg-[30%_30%]`, tailwind-merge can't know whether the class is a `background-position` or `background-size` class.

Therefore it is necessary to always prepend arbitrary values of `background-position` classes with the label `position:` as in `bg-[position:30%_30%]`. The same applies to `background-size` classes which need to be prepended with `length:`, `size:` or `percentage:`.

---

Next: [Configuration](./configuration.md)

Previous: [Features](./features.md)

[Back to overview](./README.md)
