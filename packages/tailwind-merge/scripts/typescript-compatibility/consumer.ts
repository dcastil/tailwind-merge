import { ClassNameValue, Config, extendTailwindMerge, twMerge } from '../../dist/types'

const className: ClassNameValue = ['px-2', false, ['p-4']]
const mergedClassName: string = twMerge(className)
const config: Config<'custom-group', 'custom-theme'> = {
    cacheSize: 0,
    theme: {
        'custom-theme': [],
    },
    classGroups: {
        'custom-group': [],
    },
    conflictingClassGroups: {},
    conflictingClassGroupModifiers: {},
    orderSensitiveModifiers: [],
}
const customTwMerge = extendTailwindMerge<'custom-group', 'custom-theme'>({
    extend: {
        theme: config.theme,
        classGroups: config.classGroups,
    },
})

twMerge(mergedClassName)
customTwMerge('custom-group')
