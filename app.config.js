/**
 * EAS dev client — iOS (when Apple Developer / EAS credentials are ready):
 *   eas build --profile development --platform ios
 * Optional local build (macOS + Xcode):
 *   npx expo run:ios
 */

// Load .env file if dotenv is available (may not be available during EAS build config)
// EAS CLI uses require() to load this config, so we use a try-catch with require
try {
  require('dotenv/config');
} catch (e) {
  // dotenv not available — env vars should be set via system/env or EAS secrets
}

const appJson = require('./app.json');

export default {
  expo: {
    ...appJson.expo,
    scheme: appJson.expo.scheme ?? 'wta',
    extra: {
      ...appJson.expo.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      passwordResetRedirectUrl: process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL,
    },
    android: {
      ...appJson.expo.android,
      package: 'in.tankerhub.admin',
    },
    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: 'in.tankerhub.admin',
    },
    plugins: [
      ...(appJson.expo.plugins ?? []),
      '@react-native-community/datetimepicker',
    ],
  },
};