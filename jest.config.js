/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run setup before any test module is loaded so env vars are set
  // before better-sqlite3 and other singletons initialise
  setupFiles: ['./tests/setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  // Map .js imports (used in source) to the TypeScript source files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          lib: ['ES2022', 'DOM'],
        },
      },
    ],
  },
  // Ensure Jest exits after tests complete even if open handles remain
  // (e.g. keep-alive HTTPS sockets from fetchBuffer network calls)
  forceExit: true,
};
