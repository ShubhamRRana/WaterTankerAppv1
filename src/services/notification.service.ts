/**
 * Notification Service
 * 
 * Handles push notifications using expo-notifications and integrates with
 * Supabase notifications table for in-app notifications.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// import { supabase } from './supabase'; // Removed: Supabase dependency
import { SubscriptionManager } from '../utils/subscriptionManager';
import { Notification } from '../types';

// Type for Supabase Realtime payload
interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
}

// Check if device (for simulator/emulator detection)
const isDevice = Platform.OS !== 'web' && !__DEV__;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  userId: string;
  deviceId?: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Notification Service for push notifications and in-app notifications
 */
export class NotificationService {
  private static tokenRegistered = false;
  private static notificationListener: Notifications.Subscription | null = null;
  private static responseListener: Notifications.Subscription | null = null;

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Continue anyway for development

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Register device for push notifications
   */
  static async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });

      const token = tokenData.data;

      // Store token in database
      await this.savePushToken({
        token,
        userId,
        platform: Platform.OS as 'ios' | 'android' | 'web',
      });

      this.tokenRegistered = true;
      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save push notification token to database
   */
  private static async savePushToken(tokenData: PushNotificationToken): Promise<void> {
    try {
      // TODO: Implement push token storage with your new backend
      // Store in user's profile or a separate push_tokens table
      // For now, we'll store it in a simple way
      // You may want to create a push_tokens table for better management
    } catch (error) {
      // Error handling for push token storage
    }
  }

  /**
   * Send a local notification
   */
  static async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      // Error handling for notification sending
    }
  }

  /**
   * Create an in-app notification
   * TODO: Implement with your new backend - Supabase removed
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'booking' | 'payment' | 'system',
    relatedBookingId?: string
  ): Promise<Notification | null> {
    try {
      // TODO: Implement notification creation with your new backend
      
      // Send push notification if token is registered
      if (this.tokenRegistered) {
        await this.sendLocalNotification(title, message, {
          notificationId: 'temp-id',
          type,
          relatedBookingId,
        });
      }

      // Return a temporary notification object
      return {
        id: 'temp-id',
        userId,
        title,
        message,
        type,
        isRead: false,
        relatedBookingId,
        createdAt: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * TODO: Implement with your new backend - Supabase removed
   */
  static async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      // TODO: Implement notification fetching with your new backend
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   * TODO: Implement with your new backend - Supabase removed
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      // TODO: Implement notification update with your new backend
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * TODO: Implement with your new backend - Supabase removed
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      // TODO: Implement notification update with your new backend
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    return SubscriptionManager.subscribe(
      {
        channelName: `notifications:${userId}`,
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
        event: 'INSERT',
        onError: (error) => {
          // Error handling for notification subscription
        },
      },
      async (payload: RealtimePayload<{
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: 'booking' | 'payment' | 'system';
        is_read: boolean;
        related_booking_id?: string;
        created_at: string;
      }>) => {
        try {
          if (payload.eventType === 'INSERT' && payload.new) {
            const notification: Notification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              title: payload.new.title,
              message: payload.new.message,
              type: payload.new.type,
              isRead: payload.new.is_read,
              relatedBookingId: payload.new.related_booking_id,
              createdAt: new Date(payload.new.created_at),
            };

            // Send push notification
            await this.sendLocalNotification(notification.title, notification.message, {
              notificationId: notification.id,
              type: notification.type,
              relatedBookingId: notification.relatedBookingId,
            });

            callback(notification);
          }
        } catch (error) {
          // Error handling for notification processing
        }
      }
    );
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listen for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      }
    );

    // Return cleanup function
    return () => {
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }
      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
    };
  }

  /**
   * Get unread notification count
   * TODO: Implement with your new backend - Supabase removed
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      // TODO: Implement unread count with your new backend
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Delete a notification
   * TODO: Implement with your new backend - Supabase removed
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      // TODO: Implement notification deletion with your new backend
    } catch (error) {
      throw error;
    }
  }
}

