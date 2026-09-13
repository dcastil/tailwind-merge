import * as runtime from '@tailwind-merge/next/runtime'

// Padding class names assembled at runtime stay invisible to Tailwind's scanner (which reads comments too, so they are not spelled out here either): with pruning they count as unused and pass through `twMerge` unmerged, which is how the tests tell a pruned config from the full one.
const padding = (size) => ['p', size].join('-')

/** Renders what the runtime module does with a few class lists, for both a server and a client component to show. `data-exports` lists the module's export names so tests can compare the served surface with the fallback file's. */
export function Merged({ id }) {
    const { twMerge } = runtime
    return (
        <p
            id={id}
            data-merged={twMerge('text-huge text-sm')}
            data-big={twMerge('text-big text-sm')}
            data-padding={twMerge(padding(2), padding(4))}
            data-exports={Object.keys(runtime).sort().join(',')}
        >
            {id}
        </p>
    )
}
