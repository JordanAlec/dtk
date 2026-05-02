import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // source files import with .js extensions; map them back to .ts for jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: { ignoreCodes: [151002] },
    }],
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};

export default config;
