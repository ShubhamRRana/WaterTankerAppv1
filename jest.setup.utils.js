// Minimal Jest setup file for utility tests
// This file runs before utility test files that don't require React Native

// Define __DEV__ for tests (used in config.ts)
global.__DEV__ = false;

process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';

// Mock expo-constants for node test environment (prevents ESM parsing issues).
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
  default: { expoConfig: { extra: {} } },
}));

// Mock AsyncStorage for tests that use it (like localStorageDataAccess)
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    setItem: jest.fn((key, value) => {
      return Promise.resolve((storage[key] = value));
    }),
    getItem: jest.fn((key) => {
      return Promise.resolve(storage[key] || null);
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => {
      return Promise.resolve(Object.keys(storage));
    }),
    multiGet: jest.fn((keys) => {
      return Promise.resolve(keys.map(key => [key, storage[key] || null]));
    }),
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
  };
});

// Note: Supabase client is mocked on a per-test basis
// Test files that need Supabase mocks should use jest.mock() in their test files
// A manual mock is available at src/lib/__mocks__/supabaseClient.ts for reference

// Suppress console errors in tests (optional - remove if you want to see them)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

