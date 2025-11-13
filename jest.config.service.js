// Jest config specifically for service/unit tests that don't need React Native environment
// This avoids the jest-expo preset which tries to load expo's native runtime
module.exports = {
  // Don't use jest-expo preset for service tests
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.service.js'],
  testMatch: [
    '**/services/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/services/**/*.(test|spec).(ts|tsx|js)',
    '**/utils/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/utils/**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/utils/testHelpers.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '^expo$': '<rootDir>/__mocks__/expo.ts',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react'
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native|@react-navigation/.*))'
  ]
};

