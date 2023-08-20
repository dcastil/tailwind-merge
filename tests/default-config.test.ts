import { getDefaultConfig } from '../src'
import { Config, DefaultClassGroupIds, DefaultThemeGroupIds } from '../src/lib/types'

test('default config has correct types', () => {
    const defaultConfig = getDefaultConfig()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const genericConfig: Config<DefaultClassGroupIds, DefaultThemeGroupIds> = defaultConfig

    expect(defaultConfig.cacheSize).toBe(500)
    // @ts-expect-error
    expect(defaultConfig.nonExistent).toBeUndefined()
    expect(defaultConfig.classGroups.display[0]).toBe('block')
    expect(defaultConfig.classGroups.overflow[0].overflow[0]).toBe('auto')
    // @ts-expect-error
    expect(defaultConfig.classGroups.overflow[0].nonExistent).toBeUndefined()
})
