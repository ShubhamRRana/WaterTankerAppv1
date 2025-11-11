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

// For Expo, we can access env vars through process.env
// Make sure they're prefixed with EXPO_PUBLIC_

// In test environment, only use process.env to avoid importing expo-constants
// which triggers Expo's runtime
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!isTestEnvironment) {
  // Only import expo-constants when not in test environment
  try {
    const Constants = require('expo-constants').default;
    supabaseUrl = Constants?.expoConfig?.extra?.supabaseUrl || supabaseUrl;
    supabaseAnonKey = Constants?.expoConfig?.extra?.supabaseAnonKey || supabaseAnonKey;
  } catch (e) {
    // If expo-constants is not available, fall back to process.env
  }
}

export const SUPABASE_CONFIG = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
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