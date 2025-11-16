/**
 * Integration tests for Notification Service with Supabase
 * 
 * NOTE: These tests require a test Supabase instance.
 * Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
 * 
 * NOTE: Push notification tests may not work in test environment.
 * These tests focus on database operations (creating, fetching notifications).
 * 
 * To run integration tests:
 * npm test -- --testPathPattern=integration
 */

// Unmock Supabase to use real client for integration tests
jest.unmock('../../supabase');

import { NotificationService } from '../../notification.service';
import { AuthService } from '../../auth.service';
import { UserService } from '../../user.service';
import { supabase } from '../../supabase';
import { Notification } from '../../../types';

// Skip integration tests if test credentials are not provided
const shouldRunIntegrationTests = process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Increase timeout for integration tests (real API calls take longer)
jest.setTimeout(30000); // 30 seconds

// Track created test users for cleanup
const createdTestUsers: string[] = [];

// Helper function to generate unique phone number
const generateTestPhone = (prefix: string = '987'): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp.slice(-6)}${random}`;
};

// Helper function to wait for session establishment
const waitForSession = async (maxWaitMs: number = 3000): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
};

// Mock expo-notifications for testing
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-push-token' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

describe('NotificationService Integration Tests', () => {
  let testUserId: string;
  let testUserPhone: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping integration tests - EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
      return;
    }

    // Create test user
    testUserPhone = generateTestPhone('98765');
    const userResult = await AuthService.register(
      testUserPhone,
      'TestPassword123',
      'Test User',
      'customer'
    );

    if (userResult.success && userResult.user) {
      testUserId = userResult.user.uid;
      createdTestUsers.push(testUserId);
      
      // Login to establish authenticated session for RLS policies
      await AuthService.login(testUserPhone, 'TestPassword123');
      await waitForSession();
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    
    // Reset rate limiter to prevent test failures due to rate limiting
    const { rateLimiter } = require('../../../utils/rateLimiter');
    rateLimiter.resetAll();
    
    // Ensure we're logged in
    if (testUserPhone) {
      try {
        await AuthService.login(testUserPhone, 'TestPassword123');
        await waitForSession();
      } catch (error) {
        // Ignore login errors
      }
    }
  });

  afterEach(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up test data after each test
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return;
    // Clean up all created test users
    for (const userId of createdTestUsers) {
      try {
        await UserService.deleteUser(userId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdTestUsers.length = 0;
    // Logout
    try {
      await AuthService.logout();
    } catch (error) {
      // Ignore logout errors
    }
  });

  (shouldRunIntegrationTests ? describe : describe.skip)('Real Supabase Integration', () => {
    it('should create a notification', async () => {
      const notification = await NotificationService.createNotification(
        testUserId,
        'Test Notification',
        'This is a test notification',
        'booking',
        undefined // Don't use invalid UUID, use undefined instead
      );

      expect(notification).toBeDefined();
      expect(notification?.userId).toBe(testUserId);
      expect(notification?.title).toBe('Test Notification');
      expect(notification?.message).toBe('This is a test notification');
      expect(notification?.isRead).toBe(false);
    });

    it('should get notifications for user', async () => {
      // Create a test notification first
      await NotificationService.createNotification(
        testUserId,
        'Test Notification 2',
        'This is another test notification',
        'system'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get notifications for user
      const notifications = await NotificationService.getNotifications(testUserId);

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      notifications.forEach(notification => {
        expect(notification.userId).toBe(testUserId);
      });
    });

    it('should get unread notifications count', async () => {
      // Create unread notification
      await NotificationService.createNotification(
        testUserId,
        'Unread Notification',
        'This is an unread notification',
        'booking'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get unread count
      const unreadCount = await NotificationService.getUnreadCount(testUserId);

      expect(typeof unreadCount).toBe('number');
      expect(unreadCount).toBeGreaterThanOrEqual(0);
    });

    it('should mark notification as read', async () => {
      // Create a notification
      const notification = await NotificationService.createNotification(
        testUserId,
        'Notification to Read',
        'This notification will be marked as read',
        'system'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!notification) {
        throw new Error('Failed to create notification');
      }

      // Mark as read
      await NotificationService.markAsRead(notification.id);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it's marked as read
      const notifications = await NotificationService.getNotifications(testUserId);
      const updatedNotification = notifications.find(n => n.id === notification.id);

      expect(updatedNotification).toBeDefined();
      expect(updatedNotification?.isRead).toBe(true);
    });

    it('should mark notification as unread', async () => {
      // Create and mark as read first
      const notification = await NotificationService.createNotification(
        testUserId,
        'Notification to Unread',
        'This notification will be marked as unread',
        'system'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!notification) {
        throw new Error('Failed to create notification');
      }

      await NotificationService.markAsRead(notification.id);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark as unread (update directly via Supabase since there's no markAsUnread method)
      const { supabase } = require('../../supabase');
      await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('id', notification.id);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it's marked as unread
      const notifications = await NotificationService.getNotifications(testUserId);
      const updatedNotification = notifications.find(n => n.id === notification.id);

      expect(updatedNotification).toBeDefined();
      expect(updatedNotification?.isRead).toBe(false);
    });

    it('should mark all notifications as read', async () => {
      // Create multiple notifications
      for (let i = 0; i < 3; i++) {
        await NotificationService.createNotification(
          testUserId,
          `Notification ${i + 1}`,
          `Test notification ${i + 1}`,
          'system'
        );
      }
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mark all as read
      await NotificationService.markAllAsRead(testUserId);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all are read
      const notifications = await NotificationService.getNotifications(testUserId);
      const unreadNotifications = notifications.filter(n => !n.isRead);

      expect(unreadNotifications.length).toBe(0);
    });
  });
});

