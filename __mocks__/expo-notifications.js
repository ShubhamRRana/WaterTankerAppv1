// Mock for expo-notifications
// Provides mock implementations of expo-notifications functions for testing

const AndroidImportance = {
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

const setNotificationHandler = jest.fn((handler) => {
  // Store handler for testing if needed
});

const getPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

const requestPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
  granted: true,
  canAskAgain: true,
  expires: 'never',
}));

const setNotificationChannelAsync = jest.fn(async (channelId, channel) => {
  // Mock implementation
});

const getExpoPushTokenAsync = jest.fn(async (options) => ({
  data: 'ExponentPushToken[test-token-12345]',
  type: 'expo',
}));

const scheduleNotificationAsync = jest.fn(async (notificationRequest) => {
  return 'notification-id-123';
});

const addNotificationReceivedListener = jest.fn((listener) => {
  // Return a subscription object
  const subscription = {
    remove: jest.fn(),
  };
  return subscription;
});

const addNotificationResponseReceivedListener = jest.fn((listener) => {
  // Return a subscription object
  const subscription = {
    remove: jest.fn(),
  };
  return subscription;
});

// Mock Notification type
const createMockNotification = (overrides = {}) => ({
  request: {
    identifier: 'notification-id',
    content: {
      title: 'Test Title',
      body: 'Test Body',
      data: {},
      sound: true,
    },
    trigger: null,
    ...overrides.request,
  },
  date: new Date(),
  ...overrides,
});

// Mock NotificationResponse type
const createMockNotificationResponse = (overrides = {}) => ({
  notification: createMockNotification(),
  actionIdentifier: 'DEFAULT',
  userText: undefined,
  ...overrides,
});

module.exports = {
  __esModule: true,
  default: {
    AndroidImportance,
    setNotificationHandler,
    getPermissionsAsync,
    requestPermissionsAsync,
    setNotificationChannelAsync,
    getExpoPushTokenAsync,
    scheduleNotificationAsync,
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
  },
  AndroidImportance,
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  getExpoPushTokenAsync,
  scheduleNotificationAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
};

