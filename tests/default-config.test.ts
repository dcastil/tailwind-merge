import { getDefaultConfig, Config } from '../src'

test('default config has correct types', () => {
    const defaultConfig = getDefaultConfig()
    const genericConfig: Config = defaultConfig

    expect(defaultConfig).toBe(genericConfig)
    expect(defaultConfig.cacheSize).toBe(500)
    // @ts-expect-error
    expect(defaultConfig.nonExistent).toBeUndefined()
    expect(defaultConfig.classGroups.display[0]).toBe('block')
    expect(defaultConfig.classGroups.overflow[0].overflow[0]).toBe('auto')
    // @ts-expect-error
    expect(defaultConfig.classGroups.overflow[0].nonExistent).toBeUndefined()
})
