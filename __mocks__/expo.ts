// Manual mock for expo package to prevent runtime execution
// This mock prevents expo from executing its native runtime code during tests

// Mock the registerRootComponent function
export const registerRootComponent = jest.fn();

// Export default for ES6 imports
export default {
  registerRootComponent: jest.fn(),
};

// Prevent expo from trying to access native modules
if (typeof global !== 'undefined') {
  // Mock expo's internal registry to prevent runtime initialization
  (global as any).__ExpoImportMetaRegistry = new Map();
}
