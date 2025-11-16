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

const FALLBACK_SUPABASE_URL = 'http://localhost:54321';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key';
const isTestEnv = process.env.NODE_ENV === 'test';
const shouldUseFallback =
  isTestEnv && (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey);

const supabaseUrl = shouldUseFallback
  ? FALLBACK_SUPABASE_URL
  : SUPABASE_CONFIG.url;
const supabaseAnonKey = shouldUseFallback
  ? FALLBACK_SUPABASE_ANON_KEY
  : SUPABASE_CONFIG.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials are not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

if (shouldUseFallback) {
  console.warn(
    'Supabase credentials missing in test environment; using fallback localhost configuration.'
  );
}

// Create the Supabase client (database operations only, no auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Enable real-time subscriptions
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

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