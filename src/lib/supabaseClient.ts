/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client for use throughout the application.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file or app.config.js'
  );
}

/**
 * Supabase client instance
 * 
 * Configured with:
 * - Auto-refresh tokens
 * - Persistent sessions
 * - No URL detection (for React Native)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
