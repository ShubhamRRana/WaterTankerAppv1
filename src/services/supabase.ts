// src/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants/supabase';

/**
 * Supabase Client
 * 
 * Singleton instance of the Supabase client for database and auth operations.
 * 
 * Usage:
 * ```typescript
 * import { supabase } from '../services/supabase';
 * 
 * // Query data
 * const { data, error } = await supabase.from('users').select('*');
 * 
 * // Auth operations
 * const { data, error } = await supabase.auth.signInWithPassword({...});
 * ```
 */

// Create the Supabase client
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      // Automatically refresh the session
      autoRefreshToken: true,
      // Persist the session in AsyncStorage
      persistSession: true,
      // Don't detect session in URL (not needed for React Native)
      detectSessionInUrl: false,
    },
    // Enable real-time subscriptions
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Export a helper to check connection
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('_supabase_migrations').select('version').limit(1);
    // If we get here without error, connection is working
    return !error;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};