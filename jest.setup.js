// Jest setup file for React Native testing
// Note: @testing-library/react-native v12.4+ includes matchers by default

// CRITICAL: Set up expo's global registry BEFORE any expo imports
// This prevents expo from trying to execute its native runtime
if (typeof global !== 'undefined') {
  global.__ExpoImportMetaRegistry = new Map();
}

// Define React Native globals for tests
global.__DEV__ = true;

// Mock expo package FIRST to prevent runtime execution before any other imports
// This must be hoisted before jest-expo preset tries to load expo
jest.mock('expo', () => {
  // Return a simple mock object without requiring the actual expo module
  return {
    registerRootComponent: jest.fn(),
    __esModule: true,
    default: {
      registerRootComponent: jest.fn(),
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules - using manual mock from __mocks__ directory
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: null,
    manifest: null,
    appOwnership: null,
    executionEnvironment: 'standalone',
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 28.6139,
      longitude: 77.2090,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    }
  })),
  watchPositionAsync: jest.fn(() => ({
    remove: jest.fn()
  })),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true))
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() }))
}));

// Mock Supabase client (database operations only, no auth)
jest.mock('./src/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn()
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() }))
    })),
    rpc: jest.fn(),
    removeChannel: jest.fn()
  }
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

