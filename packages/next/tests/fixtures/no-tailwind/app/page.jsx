import { twMerge } from '@tailwind-merge/next/runtime'

export default function Page() {
    return <p id="server" data-merged={twMerge('text-huge text-sm')} data-padding={twMerge('p-2 p-4')}>no tailwind</p>
}
