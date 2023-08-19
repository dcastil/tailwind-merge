/** @type {import('ts-jest').JestConfigWithTsJest} */
// eslint-disable-next-line import/no-default-export
export default {
    rootDir: '..',
    preset: 'ts-jest',
    testMatch: ['<rootDir>/@(src|tests)/**/?(*.)test.ts'],
}
