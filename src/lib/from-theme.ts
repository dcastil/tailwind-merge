import {
    DefaultThemeGroupIds as DefaultThemeGroupIdsOuter,
    NoInfer,
    ThemeGetter,
    ThemeObject,
} from './types'

export function fromTheme<
    AdditionalThemeGroupIds extends string = never,
    DefaultThemeGroupIds extends string = DefaultThemeGroupIdsOuter,
>(key: NoInfer<DefaultThemeGroupIds | AdditionalThemeGroupIds>): ThemeGetter {
    const themeGetter = (theme: ThemeObject<DefaultThemeGroupIds | AdditionalThemeGroupIds>) =>
        theme[key] || []

    themeGetter.isThemeGetter = true as const

    return themeGetter
}
