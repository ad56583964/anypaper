/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.exclude/',
    '.exclude'
  ],
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)']
}; 