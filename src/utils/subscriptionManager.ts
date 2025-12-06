/**
 * Subscription Manager
 * 
 * Manages real-time subscriptions for database changes using Supabase Realtime.
 */

import { supabase } from '../lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SubscriptionConfig {
  channelName: string;
  table: string;
  filter?: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onError?: (error: Error) => void;
}

export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
}

/**
 * Subscription Manager for real-time database subscriptions
 * Uses Supabase Realtime channels for database change notifications
 */
export class SubscriptionManager {
  private static channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to real-time database changes
   * 
   * @param config - Subscription configuration
   * @param callback - Callback function to handle payload updates
   * @returns Unsubscribe function
   */
  static subscribe<T = any>(
    config: SubscriptionConfig,
    callback: (payload: RealtimePayload<T>) => void | Promise<void>
  ): () => void {
    // Get or create channel for this subscription
    let channel = this.channels.get(config.channelName);
    
    if (!channel) {
      channel = supabase
        .channel(config.channelName)
        .on(
          'postgres_changes',
          {
            event: config.event === '*' ? '*' : config.event.toLowerCase() as any,
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            const realtimePayload: RealtimePayload<T> = {
              eventType: payload.eventType.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE',
              new: payload.new as T,
              old: payload.old as T,
            };
            
            try {
              callback(realtimePayload);
            } catch (error) {
              if (config.onError) {
                config.onError(error instanceof Error ? error : new Error(String(error)));
              } else {
                console.error('Subscription callback error:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to ${config.channelName}`);
          } else if (status === 'CHANNEL_ERROR') {
            const error = new Error(`Failed to subscribe to ${config.channelName}`);
            if (config.onError) {
              config.onError(error);
            } else {
              console.error('Subscription error:', error);
            }
          }
        });
      
      this.channels.set(config.channelName, channel);
    }

    // Return unsubscribe function
    return () => {
      const channel = this.channels.get(config.channelName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(config.channelName);
      }
    };
  }

  /**
   * Unsubscribe from a specific channel
   */
  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  static unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}

