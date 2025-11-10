// src/constants/supabase.ts

/**
 * Supabase Configuration
 * 
 * Reads environment variables and provides Supabase connection settings.
 * 
 * Environment variables required:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import Constants from 'expo-constants';



// For Expo, we can access env vars through process.env
// Make sure they're prefixed with EXPO_PUBLIC_

export const SUPABASE_CONFIG = {

    url: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  };
  
  // Validation: Ensure required variables are set
  if (!SUPABASE_CONFIG.url) {
    console.warn('⚠️ EXPO_PUBLIC_SUPABASE_URL is not set. Supabase will not work.');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    console.warn('⚠️ EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase will not work.');
  }
  
  // Export a helper to check if Supabase is configured
  export const isSupabaseConfigured = (): boolean => {
    return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  };