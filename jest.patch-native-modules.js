// This file patches NativeModules to ensure UIManager is always an object
// The issue: jest-expo's setup.js line 122 calls Object.defineProperty on UIManager
// but UIManager might be null/undefined, causing "Object.defineProperty called on non-object"

const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');

// CRITICAL: Ensure UIManager is always a plain object (not null/undefined)
// Use a getter/setter to ensure it's always an object even if something tries to set it to null
const originalUIManager = mockNativeModules.UIManager;
let uiManagerFallback = (originalUIManager && typeof originalUIManager === 'object' && originalUIManager !== null) 
  ? originalUIManager 
  : {};

Object.defineProperty(mockNativeModules, 'UIManager', {
  configurable: true,
  enumerable: true,
  get: function() {
    return uiManagerFallback;
  },
  set: function(value) {
    // Always ensure we have a valid object
    uiManagerFallback = (value && typeof value === 'object' && value !== null) ? value : {};
  }
});

// Initialize with a plain object
mockNativeModules.UIManager = uiManagerFallback;

// Ensure NativeUnimoduleProxy exists and has viewManagersMetadata
if (!mockNativeModules.NativeUnimoduleProxy || typeof mockNativeModules.NativeUnimoduleProxy !== 'object' || mockNativeModules.NativeUnimoduleProxy === null) {
  mockNativeModules.NativeUnimoduleProxy = {};
}
if (!mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata || typeof mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata !== 'object' || mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata === null) {
  mockNativeModules.NativeUnimoduleProxy.viewManagersMetadata = {};
}

module.exports = mockNativeModules;

