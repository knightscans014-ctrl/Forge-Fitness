module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/engine/__tests__'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  globalSetup: '<rootDir>/jest.globalSetup.js',
};
