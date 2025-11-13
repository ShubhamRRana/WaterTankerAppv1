/**
 * Notification Service
 * 
 * Handles push notifications using expo-notifications and integrates with
 * Supabase notifications table for in-app notifications.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
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
      if (!isDevice && __DEV__) {
        console.warn('Notifications may not work properly on simulator/emulator');
        // Continue anyway for development
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
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
      console.error('Error requesting notification permissions:', error);
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
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push notification token to database
   */
  private static async savePushToken(tokenData: PushNotificationToken): Promise<void> {
    try {
      // Store in user's profile or a separate push_tokens table
      // For now, we'll store it in a simple way
      // You may want to create a push_tokens table for better management
      const { error } = await supabase
        .from('users')
        .update({
          // Store token in a JSON field or create a separate table
          // For MVP, we can add a push_token field to users table
        })
        .eq('id', tokenData.userId);

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
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
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Create an in-app notification in Supabase
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'booking' | 'payment' | 'system',
    relatedBookingId?: string
  ): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          related_booking_id: relatedBookingId,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) return null;

      // Send push notification if token is registered
      if (this.tokenRegistered) {
        await this.sendLocalNotification(title, message, {
          notificationId: data.id,
          type,
          relatedBookingId,
        });
      }

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: data.is_read,
        relatedBookingId: data.related_booking_id,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!data) return [];

      return data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        message: item.message,
        type: item.type,
        isRead: item.is_read,
        relatedBookingId: item.related_booking_id,
        createdAt: new Date(item.created_at),
      }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
          console.error(`Error in notification subscription for ${userId}:`, error);
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
          console.error('Error processing notification:', error);
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
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      return count ?? 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

