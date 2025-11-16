/**
 * Subscription Manager
 * 
 * Manages real-time subscriptions for database changes.
 * 
 * Note: This is a placeholder implementation since Supabase has been removed.
 * Real-time subscriptions are not available with local storage.
 * This provides a compatible interface that returns a no-op unsubscribe function.
 */

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
 */
export class SubscriptionManager {
  /**
   * Subscribe to real-time database changes
   * 
   * @param config - Subscription configuration
   * @param callback - Callback function to handle payload updates
   * @returns Unsubscribe function
   * 
   * Note: This is a placeholder implementation. Real-time subscriptions
   * are not available with local storage. Returns a no-op unsubscribe function.
   */
  static subscribe<T = any>(
    config: SubscriptionConfig,
    callback: (payload: RealtimePayload<T>) => void | Promise<void>
  ): () => void {
    // Placeholder implementation - real-time subscriptions not available
    // with local storage. Return a no-op unsubscribe function for compatibility.
    return () => {
      // No-op unsubscribe function
    };
  }
}

