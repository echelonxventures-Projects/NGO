/**
 * Jest config for the NestJS API. Tests are colocated with source as `*.spec.ts`.
 * ts-jest compiles using the workspace tsconfig (decorators + strict mode enabled).
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.{t,j}s', '!**/*.module.ts', '!**/dto/**', '!main.ts'],
  coverageDirectory: '../coverage',
  clearMocks: true,
};
