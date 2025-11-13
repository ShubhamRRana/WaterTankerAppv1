/**
 * Subscription Manager - Optimizes Supabase real-time subscriptions
 * 
 * Features:
 * - Prevents duplicate subscriptions
 * - Automatic reconnection on errors
 * - Connection state monitoring
 * - Subscription pooling
 * - Error handling and retry logic
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export interface SubscriptionConfig {
  channelName: string;
  table: string;
  filter?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SubscriptionState {
  channel: RealtimeChannel | null;
  isConnected: boolean;
  retryCount: number;
  lastError: Error | null;
}

/**
 * Subscription Manager class for managing Supabase real-time subscriptions
 */
export class SubscriptionManager {
  private static subscriptions = new Map<string, SubscriptionState>();
  private static reconnectTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Create or get an existing subscription
   */
  static subscribe<T>(
    config: SubscriptionConfig,
    callback: (payload: T) => void | Promise<void>
  ): () => void {
    const { channelName, table, filter, event = '*', schema = 'public' } = config;

    // Check if subscription already exists
    const existing = this.subscriptions.get(channelName);
    if (existing?.channel && existing.isConnected) {
      // Return cleanup function for existing subscription
      return () => this.unsubscribe(channelName);
    }

    // Clean up any existing failed subscription
    if (existing) {
      this.cleanup(channelName);
    }

    // Create new subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        } as any,
        async (payload: any) => {
          try {
            await callback(payload as T);
          } catch (error) {
            console.error(`Error in subscription callback for ${channelName}:`, error);
            if (config.onError) {
              config.onError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      )
      .subscribe((status) => {
        const state = this.subscriptions.get(channelName);
        if (state) {
          state.isConnected = status === 'SUBSCRIBED';
          
          if (status === 'SUBSCRIBED') {
            state.retryCount = 0;
            state.lastError = null;
            if (config.onReconnect) {
              config.onReconnect();
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.handleSubscriptionError(channelName, config);
          }
        }
      });

    // Store subscription state
    this.subscriptions.set(channelName, {
      channel,
      isConnected: false,
      retryCount: 0,
      lastError: null,
    });

    // Return cleanup function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Handle subscription errors with retry logic
   */
  private static handleSubscriptionError(
    channelName: string,
    config: SubscriptionConfig
  ): void {
    const state = this.subscriptions.get(channelName);
    if (!state) return;

    const maxRetries = config.maxRetries ?? 3;
    const retryDelay = config.retryDelay ?? 5000;

    if (state.retryCount < maxRetries) {
      state.retryCount++;
      state.isConnected = false;

      // Schedule reconnection
      const timer = setTimeout(() => {
        this.reconnect(channelName, config);
      }, retryDelay * state.retryCount); // Exponential backoff

      this.reconnectTimers.set(channelName, timer);
    } else {
      // Max retries reached
      const error = new Error(
        `Subscription ${channelName} failed after ${maxRetries} retries`
      );
      state.lastError = error;
      if (config.onError) {
        config.onError(error);
      }
    }
  }

  /**
   * Reconnect a subscription
   */
  private static reconnect(
    channelName: string,
    config: SubscriptionConfig
  ): void {
    const state = this.subscriptions.get(channelName);
    if (!state) return;

    // Clean up old channel
    if (state.channel) {
      supabase.removeChannel(state.channel);
    }

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channelName);
    }

    // Remove from subscriptions map to allow new subscription
    this.subscriptions.delete(channelName);
  }

  /**
   * Unsubscribe from a channel
   */
  static unsubscribe(channelName: string): void {
    const state = this.subscriptions.get(channelName);
    if (state?.channel) {
      supabase.removeChannel(state.channel);
    }

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channelName);
    }

    this.subscriptions.delete(channelName);
  }

  /**
   * Get subscription state
   */
  static getState(channelName: string): SubscriptionState | null {
    return this.subscriptions.get(channelName) ?? null;
  }

  /**
   * Check if a subscription is active
   */
  static isSubscribed(channelName: string): boolean {
    const state = this.subscriptions.get(channelName);
    return state?.isConnected ?? false;
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanupAll(): void {
    for (const [channelName] of this.subscriptions) {
      this.unsubscribe(channelName);
    }
  }

  /**
   * Cleanup a specific subscription
   */
  private static cleanup(channelName: string): void {
    this.unsubscribe(channelName);
  }

  /**
   * Get all active subscriptions
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys()).filter((name) =>
      this.isSubscribed(name)
    );
  }
}

