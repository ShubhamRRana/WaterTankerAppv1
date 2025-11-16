// Jest setup file for service/utility tests (Node environment)
// This is a minimal setup that doesn't try to load React Native or Expo

// Load environment variables from .env file (suppress dotenv's console output)
const originalLog = console.log;
console.log = () => {}; // Temporarily suppress console.log
require('dotenv').config();
console.log = originalLog; // Restore console.log

// Define basic globals
global.__DEV__ = true;

// Mock expo packages to prevent runtime execution
jest.mock('expo', () => ({
  registerRootComponent: jest.fn(),
  __esModule: true,
  default: {
    registerRootComponent: jest.fn(),
  },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    },
    manifest: null,
    appOwnership: null,
    executionEnvironment: 'standalone',
  },
}));

// Mock AsyncStorage for service tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((dict) => dict.ios || dict.default),
  },
}));

// Note: Supabase is NOT mocked here globally
// - Integration tests use jest.unmock() to use the real Supabase client
// - Unit tests should mock Supabase themselves if needed
// This allows integration tests to properly connect to the real Supabase instance

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

