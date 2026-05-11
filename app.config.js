/**
 * EAS dev client — iOS (when Apple Developer / EAS credentials are ready):
 *   eas build --profile development --platform ios
 * Optional local build (macOS + Xcode):
 *   npx expo run:ios
 */

// app.config.js

// Load .env file if dotenv is available (may not be available during EAS build config)
// EAS CLI uses require() to load this config, so we use a try-catch with require
try {
  // Use require for compatibility with EAS CLI's CommonJS loader
  require('dotenv/config');
} catch (e) {
  // dotenv not available, environment variables should be set via system/env
  // This is expected during EAS build configuration - env vars should be set in EAS secrets
}

export default {
  expo: {
    name: 'Water Tanker - Admin',
    slug: 'water-tanker-admin',
    version: '1.0.0',
    // ... other config from app.json ...
    
    // Make environment variables available
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        "projectId": "43ee633d-249c-4382-bf4f-6fb8211c928a"
      }
    },
    android: {
      package: "com.watertanker.app"
    },
    ios: {
      bundleIdentifier: "com.watertanker.app"
    },
    plugins: ["@react-native-community/datetimepicker"],
  },
};