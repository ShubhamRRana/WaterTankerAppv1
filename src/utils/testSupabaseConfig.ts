// src/utils/testSupabaseConfig.ts (temporary test file)

import { SUPABASE_CONFIG, isSupabaseConfigured } from '../constants/supabase';
import { checkSupabaseConnection } from '../services/supabase';

export const testSupabaseConfig = () => {
  console.log('=== Supabase Configuration Test ===');
  console.log('URL:', SUPABASE_CONFIG.url ? '✅ Set' : '❌ Missing');
  console.log('Anon Key:', SUPABASE_CONFIG.anonKey ? '✅ Set' : '❌ Missing');
  console.log('Service Role Key:', SUPABASE_CONFIG.serviceRoleKey ? '✅ Set' : '⚠️ Optional');
  console.log('Is Configured:', isSupabaseConfigured() ? '✅ Yes' : '❌ No');
  console.log('====================================');
};

export const testSupabaseConnection = async () => {
    console.log('Testing Supabase connection...');
    const isConnected = await checkSupabaseConnection();
    if (isConnected) {
      console.log('✅ Supabase connection successful!');
    } else {
      console.log('❌ Supabase connection failed. Check your credentials.');
    }
    return isConnected;
  };