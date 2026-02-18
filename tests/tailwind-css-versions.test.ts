import { expect, test } from 'vitest'

import { twMerge } from '../src'

test('supports Tailwind CSS v3.3 features', () => {
    expect(twMerge('text-red text-lg/7 text-lg/8')).toBe('text-red text-lg/8')
    expect(
        twMerge(
            'start-0 start-1',
            'end-0 end-1',
            'ps-0 ps-1 pe-0 pe-1',
            'ms-0 ms-1 me-0 me-1',
            'rounded-s-sm rounded-s-md rounded-e-sm rounded-e-md',
            'rounded-ss-sm rounded-ss-md rounded-ee-sm rounded-ee-md',
        ),
    ).toBe(
        'start-1 end-1 ps-1 pe-1 ms-1 me-1 rounded-s-md rounded-e-md rounded-ss-md rounded-ee-md',
    )
    expect(
        twMerge(
            'start-0 end-0 inset-0 ps-0 pe-0 p-0 ms-0 me-0 m-0 rounded-ss rounded-es rounded-s',
        ),
    ).toBe('inset-0 p-0 m-0 rounded-s')
    expect(twMerge('hyphens-auto hyphens-manual')).toBe('hyphens-manual')
    expect(
        twMerge('from-0% from-10% from-[12.5%] via-0% via-10% via-[12.5%] to-0% to-10% to-[12.5%]'),
    ).toBe('from-[12.5%] via-[12.5%] to-[12.5%]')
    expect(twMerge('from-0% from-red')).toBe('from-0% from-red')
    expect(
        twMerge('list-image-none list-image-[url(./my-image.png)] list-image-[var(--value)]'),
    ).toBe('list-image-[var(--value)]')
    expect(twMerge('caption-top caption-bottom')).toBe('caption-bottom')
    expect(twMerge('line-clamp-2 line-clamp-none line-clamp-[10]')).toBe('line-clamp-[10]')
    expect(twMerge('delay-150 delay-0 duration-150 duration-0')).toBe('delay-0 duration-0')
    expect(twMerge('justify-normal justify-center justify-stretch')).toBe('justify-stretch')
    expect(twMerge('content-normal content-center content-stretch')).toBe('content-stretch')
    expect(twMerge('whitespace-nowrap whitespace-break-spaces')).toBe('whitespace-break-spaces')
})

test('supports Tailwind CSS v3.4 features', () => {
    expect(twMerge('h-svh h-dvh w-svw w-dvw')).toBe('h-dvh w-dvw')
    expect(
        twMerge(
            'has-[[data-potato]]:p-1 has-[[data-potato]]:p-2 group-has-[:checked]:grid group-has-[:checked]:flex',
        ),
    ).toBe('has-[[data-potato]]:p-2 group-has-[:checked]:flex')
    expect(twMerge('text-wrap text-pretty')).toBe('text-pretty')
    expect(twMerge('w-5 h-3 size-10 w-12')).toBe('size-10 w-12')
    expect(twMerge('grid-cols-2 grid-cols-subgrid grid-rows-5 grid-rows-subgrid')).toBe(
        'grid-cols-subgrid grid-rows-subgrid',
    )
    expect(twMerge('min-w-0 min-w-50 min-w-px max-w-0 max-w-50 max-w-px')).toBe('min-w-px max-w-px')
    expect(twMerge('forced-color-adjust-none forced-color-adjust-auto')).toBe(
        'forced-color-adjust-auto',
    )
    expect(twMerge('appearance-none appearance-auto')).toBe('appearance-auto')
    expect(twMerge('float-start float-end clear-start clear-end')).toBe('float-end clear-end')
    expect(twMerge('*:p-10 *:p-20 hover:*:p-10 hover:*:p-20')).toBe('*:p-20 hover:*:p-20')
})

test('supports Tailwind CSS v4.0 features', () => {
    expect(twMerge('transform-3d transform-flat')).toBe('transform-flat')
    expect(twMerge('rotate-12 rotate-x-2 rotate-none rotate-y-3')).toBe(
        'rotate-x-2 rotate-none rotate-y-3',
    )
    expect(twMerge('perspective-dramatic perspective-none perspective-midrange')).toBe(
        'perspective-midrange',
    )
    expect(twMerge('perspective-origin-center perspective-origin-top-left')).toBe(
        'perspective-origin-top-left',
    )
    expect(twMerge('bg-linear-to-r bg-linear-45')).toBe('bg-linear-45')
    expect(twMerge('bg-linear-to-r bg-radial-[something] bg-conic-10')).toBe('bg-conic-10')
    expect(twMerge('ring-4 ring-orange inset-ring inset-ring-3 inset-ring-blue')).toBe(
        'ring-4 ring-orange inset-ring-3 inset-ring-blue',
    )
    expect(twMerge('field-sizing-content field-sizing-fixed')).toBe('field-sizing-fixed')
    expect(twMerge('scheme-normal scheme-dark')).toBe('scheme-dark')
    expect(twMerge('font-stretch-expanded font-stretch-[66.66%] font-stretch-50%')).toBe(
        'font-stretch-50%',
    )
    expect(twMerge('col-span-full col-2 row-span-3 row-4')).toBe('col-2 row-4')
    expect(twMerge('via-red-500 via-(--mobile-header-gradient)')).toBe(
        'via-(--mobile-header-gradient)',
    )
    expect(twMerge('via-red-500 via-(length:--mobile-header-gradient)')).toBe(
        'via-red-500 via-(length:--mobile-header-gradient)',
    )
})

test('supports Tailwind CSS v4.1 features', () => {
    expect(twMerge('items-baseline items-baseline-last')).toBe('items-baseline-last')
    expect(twMerge('self-baseline self-baseline-last')).toBe('self-baseline-last')
    expect(twMerge('place-content-center place-content-end-safe place-content-center-safe')).toBe(
        'place-content-center-safe',
    )
    expect(twMerge('items-center-safe items-baseline items-end-safe')).toBe('items-end-safe')
    expect(twMerge('wrap-break-word wrap-normal wrap-anywhere')).toBe('wrap-anywhere')
    expect(twMerge('text-shadow-none text-shadow-2xl')).toBe('text-shadow-2xl')
    expect(
        twMerge(
            'text-shadow-none text-shadow-md text-shadow-red text-shadow-red-500 shadow-red shadow-3xs',
        ),
    ).toBe('text-shadow-md text-shadow-red-500 shadow-red shadow-3xs')
    expect(twMerge('mask-add mask-subtract')).toBe('mask-subtract')
    expect(
        twMerge(
            // mask-image
            'mask-(--foo) mask-[foo] mask-none',
            // mask-image-linear-pos
            'mask-linear-1 mask-linear-2',
            // mask-image-linear-from-pos
            'mask-linear-from-[position:test] mask-linear-from-3',
            // mask-image-linear-to-pos
            'mask-linear-to-[position:test] mask-linear-to-3',
            // mask-image-linear-from-color
            'mask-linear-from-color-red mask-linear-from-color-3',
            // mask-image-linear-to-color
            'mask-linear-to-color-red mask-linear-to-color-3',
            // mask-image-t-from-pos
            'mask-t-from-[position:test] mask-t-from-3',
            // mask-image-t-to-pos
            'mask-t-to-[position:test] mask-t-to-3',
            // mask-image-t-from-color
            'mask-t-from-color-red mask-t-from-color-3',
            // mask-image-radial
            'mask-radial-(--test) mask-radial-[test]',
            // mask-image-radial-from-pos
            'mask-radial-from-[position:test] mask-radial-from-3',
            // mask-image-radial-to-pos
            'mask-radial-to-[position:test] mask-radial-to-3',
            // mask-image-radial-from-color
            'mask-radial-from-color-red mask-radial-from-color-3',
        ),
    ).toBe(
        'mask-none mask-linear-2 mask-linear-from-3 mask-linear-to-3 mask-linear-from-color-3 mask-linear-to-color-3 mask-t-from-3 mask-t-to-3 mask-t-from-color-3 mask-radial-[test] mask-radial-from-3 mask-radial-to-3 mask-radial-from-color-3',
    )
    expect(
        twMerge(
            // mask-image
            'mask-(--something) mask-[something]',
            // mask-position
            'mask-top-left mask-center mask-(position:--var) mask-[position:1px_1px] mask-position-(--var) mask-position-[1px_1px]',
        ),
    ).toBe('mask-[something] mask-position-[1px_1px]')
    expect(
        twMerge(
            // mask-image
            'mask-(--something) mask-[something]',
            // mask-size
            'mask-auto mask-[size:foo] mask-(size:--foo) mask-size-[foo] mask-size-(--foo) mask-cover mask-contain',
        ),
    ).toBe('mask-[something] mask-contain')
    expect(twMerge('mask-type-luminance mask-type-alpha')).toBe('mask-type-alpha')
    expect(twMerge('shadow-md shadow-lg/25 text-shadow-md text-shadow-lg/25')).toBe(
        'shadow-lg/25 text-shadow-lg/25',
    )
    expect(
        twMerge('drop-shadow-some-color drop-shadow-[#123456] drop-shadow-lg drop-shadow-[10px_0]'),
    ).toBe('drop-shadow-[#123456] drop-shadow-[10px_0]')
    expect(twMerge('drop-shadow-[#123456] drop-shadow-some-color')).toBe('drop-shadow-some-color')
    expect(twMerge('drop-shadow-2xl drop-shadow-[shadow:foo]')).toBe('drop-shadow-[shadow:foo]')
})

test('supports Tailwind CSS v4.1.5 features', () => {
    expect(twMerge('h-12 h-lh')).toBe('h-lh')
    expect(twMerge('min-h-12 min-h-lh')).toBe('min-h-lh')
    expect(twMerge('max-h-12 max-h-lh')).toBe('max-h-lh')
})

test('supports Tailwind CSS v4.2 features', () => {
    // Logical inset utilities

    expect(twMerge('inset-s-1 inset-s-2')).toBe('inset-s-2')
    expect(twMerge('inset-e-1 inset-e-2')).toBe('inset-e-2')
    expect(twMerge('inset-bs-1 inset-bs-2')).toBe('inset-bs-2')
    expect(twMerge('inset-be-1 inset-be-2')).toBe('inset-be-2')

    expect(twMerge('start-1 inset-s-2')).toBe('inset-s-2')
    expect(twMerge('inset-s-1 start-2')).toBe('start-2')
    expect(twMerge('end-1 inset-e-2')).toBe('inset-e-2')
    expect(twMerge('inset-e-1 end-2')).toBe('end-2')

    expect(twMerge('inset-s-1 inset-e-2 inset-bs-3 inset-be-4 inset-0')).toBe('inset-0')
    expect(twMerge('inset-0 inset-s-1 inset-bs-1')).toBe('inset-0 inset-s-1 inset-bs-1')

    expect(twMerge('inset-y-1 inset-bs-2 inset-be-3')).toBe('inset-y-1 inset-bs-2 inset-be-3')
    expect(twMerge('top-1 inset-bs-2 bottom-3 inset-be-4')).toBe(
        'top-1 inset-bs-2 bottom-3 inset-be-4',
    )

    // Logical spacing utilities

    expect(twMerge('pbs-1 pbs-2')).toBe('pbs-2')
    expect(twMerge('pbe-1 pbe-2')).toBe('pbe-2')
    expect(twMerge('mbs-1 mbs-2')).toBe('mbs-2')
    expect(twMerge('mbe-1 mbe-2')).toBe('mbe-2')

    expect(twMerge('pt-1 pbs-2')).toBe('pt-1 pbs-2')
    expect(twMerge('pb-1 pbe-2')).toBe('pb-1 pbe-2')
    expect(twMerge('mt-1 mbs-2')).toBe('mt-1 mbs-2')
    expect(twMerge('mb-1 mbe-2')).toBe('mb-1 mbe-2')

    expect(twMerge('p-0 pbs-1 pbe-1')).toBe('p-0 pbs-1 pbe-1')
    expect(twMerge('pbs-1 pbe-1 p-0')).toBe('p-0')
    expect(twMerge('m-0 mbs-1 mbe-1')).toBe('m-0 mbs-1 mbe-1')
    expect(twMerge('mbs-1 mbe-1 m-0')).toBe('m-0')

    expect(twMerge('py-1 pbs-2 pbe-3')).toBe('py-1 pbs-2 pbe-3')
    expect(twMerge('my-1 mbs-2 mbe-3')).toBe('my-1 mbs-2 mbe-3')

    // Logical scroll spacing utilities

    expect(twMerge('scroll-pbs-1 scroll-pbs-2')).toBe('scroll-pbs-2')
    expect(twMerge('scroll-pbe-1 scroll-pbe-2')).toBe('scroll-pbe-2')
    expect(twMerge('scroll-mbs-1 scroll-mbs-2')).toBe('scroll-mbs-2')
    expect(twMerge('scroll-mbe-1 scroll-mbe-2')).toBe('scroll-mbe-2')

    expect(twMerge('scroll-pt-1 scroll-pbs-2')).toBe('scroll-pt-1 scroll-pbs-2')
    expect(twMerge('scroll-pb-1 scroll-pbe-2')).toBe('scroll-pb-1 scroll-pbe-2')
    expect(twMerge('scroll-mt-1 scroll-mbs-2')).toBe('scroll-mt-1 scroll-mbs-2')
    expect(twMerge('scroll-mb-1 scroll-mbe-2')).toBe('scroll-mb-1 scroll-mbe-2')

    expect(twMerge('scroll-p-0 scroll-pbs-1 scroll-pbe-1')).toBe('scroll-p-0 scroll-pbs-1 scroll-pbe-1')
    expect(twMerge('scroll-pbs-1 scroll-pbe-1 scroll-p-0')).toBe('scroll-p-0')
    expect(twMerge('scroll-m-0 scroll-mbs-1 scroll-mbe-1')).toBe('scroll-m-0 scroll-mbs-1 scroll-mbe-1')
    expect(twMerge('scroll-mbs-1 scroll-mbe-1 scroll-m-0')).toBe('scroll-m-0')

    expect(twMerge('scroll-py-1 scroll-pbs-2 scroll-pbe-3')).toBe('scroll-py-1 scroll-pbs-2 scroll-pbe-3')
    expect(twMerge('scroll-my-1 scroll-mbs-2 scroll-mbe-3')).toBe('scroll-my-1 scroll-mbs-2 scroll-mbe-3')

    // Logical border block utilities

    expect(twMerge('border-bs-1 border-bs-2')).toBe('border-bs-2')
    expect(twMerge('border-be-1 border-be-2')).toBe('border-be-2')
    expect(twMerge('border-bs-red border-bs-blue')).toBe('border-bs-blue')
    expect(twMerge('border-be-red border-be-blue')).toBe('border-be-blue')

    expect(twMerge('border-2 border-bs-4 border-be-6')).toBe('border-2 border-bs-4 border-be-6')
    expect(twMerge('border-bs-4 border-be-6 border-2')).toBe('border-2')
    expect(twMerge('border-red border-bs-blue border-be-green')).toBe(
        'border-red border-bs-blue border-be-green',
    )
    expect(twMerge('border-bs-blue border-be-green border-red')).toBe('border-red')

    expect(twMerge('border-y-2 border-bs-4 border-be-6')).toBe('border-y-2 border-bs-4 border-be-6')
    expect(twMerge('border-t-2 border-bs-4 border-b-6 border-be-8')).toBe(
        'border-t-2 border-bs-4 border-b-6 border-be-8',
    )
    expect(twMerge('border-y-red border-bs-blue border-be-green')).toBe(
        'border-y-red border-bs-blue border-be-green',
    )

    // Logical size utilities

    expect(twMerge('inline-1/2 inline-3/4')).toBe('inline-3/4')
    expect(twMerge('block-1/2 block-3/4')).toBe('block-3/4')
    expect(twMerge('min-inline-auto min-inline-full')).toBe('min-inline-full')
    expect(twMerge('max-inline-none max-inline-10')).toBe('max-inline-10')
    expect(twMerge('min-block-auto min-block-lh min-block-10')).toBe('min-block-10')
    expect(twMerge('max-block-none max-block-lh max-block-10')).toBe('max-block-10')

    expect(twMerge('w-10 inline-20')).toBe('w-10 inline-20')
    expect(twMerge('h-10 block-20')).toBe('h-10 block-20')
    expect(twMerge('size-10 inline-20 block-30')).toBe('size-10 inline-20 block-30')
    expect(twMerge('min-w-10 min-inline-20')).toBe('min-w-10 min-inline-20')
    expect(twMerge('max-h-10 max-block-20')).toBe('max-h-10 max-block-20')
})
