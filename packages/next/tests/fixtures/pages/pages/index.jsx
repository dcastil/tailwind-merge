import { twMerge } from '@tailwind-merge/next/runtime'

export default function Home() {
    return (
        <p id="page" data-merged={twMerge('text-huge text-sm')} data-tracking={twMerge('tracking-tight tracking-widest')}>
            pages
        </p>
    )
}
