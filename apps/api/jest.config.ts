import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Resolve the contracts workspace package to its TypeScript source directly
    '^@approvals/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
  // Suppress console.log in tests unless DEBUG=1
  silent: process.env.DEBUG !== '1',
};

export default config;
