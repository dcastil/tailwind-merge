/** @type {import('ts-jest').JestConfigWithTsJest} */

export default {
    rootDir: '..',
    preset: 'ts-jest',
    testMatch: ['<rootDir>/@(src|tests)/**/?(*.)test.ts'],
}
