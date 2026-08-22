import { expect, test } from 'vitest'

import { fromTheme, getDefaultConfig } from '../src'
import {
    AnyConfig,
    ClassGroup,
    ThemeGetter,
    createClassGroupUtils,
    createParseClassName,
} from '../src/unstable-do-not-import'

// Everything tested here is unstable by contract (see docs/versioning.md): it exists for tooling built on tailwind-merge internals and can change in any release. These tests only guard that the entry point exposes what the tooling currently relies on.

test('createClassGroupUtils has correct inputs and outputs', () => {
    const classGroupUtils = createClassGroupUtils(getDefaultConfig())

    expect(classGroupUtils.getClassGroupId).toStrictEqual(expect.any(Function))
    expect(classGroupUtils.getConflictingClassGroupIds).toStrictEqual(expect.any(Function))
    expect(classGroupUtils.getClassGroupId('bg-red-500')).toBe('bg-color')
    expect(classGroupUtils.getClassGroupId('not-a-tailwind-class-at-all')).toBeUndefined()
    expect(classGroupUtils.getConflictingClassGroupIds('px', false)).toContain('pr')
})

test('createParseClassName parses like the runtime, prefix included', () => {
    const parseClassName = createParseClassName(getDefaultConfig())
    expect(parseClassName('hover:bg-red-500/50!')).toStrictEqual({
        modifiers: ['hover'],
        hasImportantModifier: true,
        baseClassName: 'bg-red-500/50',
        maybePostfixModifierPosition: 10,
        isExternal: undefined,
    })

    const parsePrefixed = createParseClassName({ ...getDefaultConfig(), prefix: 'tw' })
    expect(parsePrefixed('tw:p-4').baseClassName).toBe('p-4')
    expect(parsePrefixed('p-4').isExternal).toBe(true)
})

test('exports the config-shape types', () => {
    const noRun = () => {
        const anyConfig: AnyConfig = getDefaultConfig()
        const themeGetter: ThemeGetter = fromTheme('spacing')
        const classGroup: ClassGroup<string> = ['some-class', themeGetter]

        return { anyConfig, classGroup }
    }

    expect(noRun).toStrictEqual(expect.any(Function))
})
