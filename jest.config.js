// Enable legacy OpenSSL provider for DES support (JasyptEncryptor)
// Required for Node.js 17+ which uses OpenSSL 3.0
// Node 16 and below use OpenSSL 1.1 and don't support this flag
const nodeMajor = parseInt(process.version.split('.')[0].slice(1), 10);
if (nodeMajor >= 17 && !process.env.NODE_OPTIONS?.includes('--openssl-legacy-provider')) {
  process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --openssl-legacy-provider';
}

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/cli.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
