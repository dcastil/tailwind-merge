<div align="center">
    <br />
    <a href="https://github.com/dcastil/tailwind-merge">
        <img src="../assets/logo.svg" alt="tailwind-merge" height="150px" />
    </a>
</div>

# tailwind-merge

Utility function to efficiently merge [Tailwind CSS](https://tailwindcss.com) classes in JS without style conflicts.

```ts
import { twMerge } from 'tailwind-merge'

twMerge('px-2 py-1 bg-red hover:bg-dark-red', 'p-3 bg-[#B91C1C]')
// → 'hover:bg-dark-red p-3 bg-[#B91C1C]'
```

- Supports Tailwind v4.0 up to v4.1 (if you use Tailwind v3, use [tailwind-merge v2.6.0](https://github.com/dcastil/tailwind-merge/tree/v2.6.0))
- Works in all modern browsers and maintained Node versions
- Fully typed
- [Check bundle size on Bundlephobia](https://bundlephobia.com/package/tailwind-merge)

## Get started

- [What is it for](./what-is-it-for.md)
- [When and how to use it](./when-and-how-to-use-it.md)
- [Features](./features.md)
- [Limitations](./limitations.md)
- [Configuration](./configuration.md)
- [Recipes](./recipes.md)
- [API reference](./api-reference.md)
- [Writing plugins](./writing-plugins.md)
- [Versioning](./versioning.md)
- [Contributing](./contributing.md)
- [Similar packages](./similar-packages.md)
