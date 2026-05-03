import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: { ignoreCodes: [151002] },
    }],
  },
  testMatch: [
    '<rootDir>/cli/**/*.test.ts',
    '<rootDir>/templates/init/src/**/*.test.ts',
    '<rootDir>/templates/plugins/**/*.test.ts',
  ],
};

export default config;
