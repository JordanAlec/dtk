import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // source files use .js extensions in imports; map them to .ts for jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: { ignoreCodes: [151002] },
    }],
  },
  testMatch: ['**/*.test.ts'],
};

export default config;
