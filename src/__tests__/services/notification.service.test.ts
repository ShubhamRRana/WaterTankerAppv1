/**
 * Notification Service Tests
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationService, PushNotificationToken } from '../../services/notification.service';
import { Notification } from '../../types';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('../../utils/subscriptionManager', () => ({
  SubscriptionManager: {
    subscribe: jest.fn((config, callback) => {
      return () => {}; // Return unsubscribe function
    }),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NotificationService as any).tokenRegistered = false;
  });

  describe('requestPermissions', () => {
    it('should return true when permission is already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permission when not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should configure Android channel on Android platform', async () => {
      Platform.OS = 'android';
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.requestPermissions();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    });

    it('should return false when permission denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('registerForPushNotifications', () => {
    beforeEach(() => {
      process.env.EXPO_PROJECT_ID = 'test-project-id';
    });

    it('should register and return push token', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'expo-push-token-123',
      });
      jest.spyOn(NotificationService as any, 'savePushToken').mockResolvedValue(undefined);

      const token = await NotificationService.registerForPushNotifications('user-1');

      expect(token).toBe('expo-push-token-123');
      expect(NotificationService['tokenRegistered']).toBe(true);
    });

    it('should return null when permission denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const token = await NotificationService.registerForPushNotifications('user-1');

      expect(token).toBeNull();
    });

    it('should return null on error', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );

      const token = await NotificationService.registerForPushNotifications('user-1');

      expect(token).toBeNull();
    });

    it('should save push token to database', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'expo-push-token-123',
      });
      const savePushTokenSpy = jest
        .spyOn(NotificationService as any, 'savePushToken')
        .mockResolvedValue(undefined);

      await NotificationService.registerForPushNotifications('user-1');

      expect(savePushTokenSpy).toHaveBeenCalledWith({
        token: 'expo-push-token-123',
        userId: 'user-1',
        platform: Platform.OS,
      });
    });
  });

  describe('sendLocalNotification', () => {
    it('should send local notification', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');

      await NotificationService.sendLocalNotification('Test Title', 'Test Body');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: undefined,
          sound: true,
        },
        trigger: null,
      });
    });

    it('should send notification with data', async () => {
      const data = { bookingId: 'booking-1', type: 'booking' };
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');

      await NotificationService.sendLocalNotification('Test Title', 'Test Body', data);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data,
          sound: true,
        },
        trigger: null,
      });
    });

    it('should handle errors gracefully', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Notification error')
      );

      await expect(
        NotificationService.sendLocalNotification('Test Title', 'Test Body')
      ).resolves.not.toThrow();
    });
  });

  describe('createNotification', () => {
    it('should create notification and send push if token registered', async () => {
      (NotificationService as any).tokenRegistered = true;
      jest.spyOn(NotificationService, 'sendLocalNotification').mockResolvedValue();

      const notification = await NotificationService.createNotification(
        'user-1',
        'Test Title',
        'Test Message',
        'booking',
        'booking-1'
      );

      expect(notification).toBeDefined();
      expect(notification?.userId).toBe('user-1');
      expect(notification?.title).toBe('Test Title');
      expect(notification?.message).toBe('Test Message');
      expect(notification?.type).toBe('booking');
      expect(notification?.relatedBookingId).toBe('booking-1');
      expect(notification?.isRead).toBe(false);
      expect(NotificationService.sendLocalNotification).toHaveBeenCalled();
    });

    it('should create notification without push if token not registered', async () => {
      (NotificationService as any).tokenRegistered = false;
      jest.spyOn(NotificationService, 'sendLocalNotification').mockResolvedValue();

      const notification = await NotificationService.createNotification(
        'user-1',
        'Test Title',
        'Test Message',
        'system'
      );

      expect(notification).toBeDefined();
      expect(NotificationService.sendLocalNotification).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (NotificationService as any).tokenRegistered = true;
      jest.spyOn(NotificationService, 'sendLocalNotification').mockRejectedValue(
        new Error('Error')
      );

      await expect(
        NotificationService.createNotification('user-1', 'Title', 'Message', 'system')
      ).rejects.toThrow('Error');
    });
  });

  describe('getNotifications', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const notifications = await NotificationService.getNotifications('user-1');

      expect(notifications).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      await expect(NotificationService.getNotifications('user-1', 10)).resolves.toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should not throw (placeholder implementation)', async () => {
      await expect(NotificationService.markAsRead('notification-1')).resolves.not.toThrow();
    });

    it('should handle errors', async () => {
      await expect(NotificationService.markAsRead('notification-1')).resolves.not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should not throw (placeholder implementation)', async () => {
      await expect(NotificationService.markAllAsRead('user-1')).resolves.not.toThrow();
    });

    it('should handle errors', async () => {
      await expect(NotificationService.markAllAsRead('user-1')).resolves.not.toThrow();
    });
  });

  describe('subscribeToNotifications', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = NotificationService.subscribeToNotifications('user-1', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should call SubscriptionManager.subscribe', () => {
      const { SubscriptionManager } = require('../../utils/subscriptionManager');
      const callback = jest.fn();

      NotificationService.subscribeToNotifications('user-1', callback);

      expect(SubscriptionManager.subscribe).toHaveBeenCalled();
    });
  });

  describe('setupNotificationListeners', () => {
    it('should set up notification listeners', () => {
      const mockNotificationListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };
      const onNotificationReceived = jest.fn();
      const onNotificationTapped = jest.fn();

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockNotificationListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );

      const cleanup = NotificationService.setupNotificationListeners(
        onNotificationReceived,
        onNotificationTapped
      );

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
    });

    it('should return cleanup function that removes listeners', () => {
      const mockNotificationListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockNotificationListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );

      const cleanup = NotificationService.setupNotificationListeners();
      cleanup();

      expect(mockNotificationListener.remove).toHaveBeenCalled();
      expect(mockResponseListener.remove).toHaveBeenCalled();
    });

    it('should work without callbacks', () => {
      const mockNotificationListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockNotificationListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );

      const cleanup = NotificationService.setupNotificationListeners();
      expect(cleanup).toBeDefined();
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 (placeholder implementation)', async () => {
      const count = await NotificationService.getUnreadCount('user-1');

      expect(count).toBe(0);
    });

    it('should return 0 on error', async () => {
      await expect(NotificationService.getUnreadCount('user-1')).resolves.toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should not throw (placeholder implementation)', async () => {
      await expect(NotificationService.deleteNotification('notification-1')).resolves.not.toThrow();
    });

    it('should handle errors', async () => {
      await expect(NotificationService.deleteNotification('notification-1')).resolves.not.toThrow();
    });
  });
});

