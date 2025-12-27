// app.config.js

import 'dotenv/config'; // Load .env file

export default {
  expo: {
    name: 'water-tanker-app',
    slug: 'water-tanker-app',
    version: '1.0.0',
    // ... other config from app.json ...
    
    // Make environment variables available
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        "projectId": "d87af120-6b69-4668-908e-002561c55444"
      }
    },
    android: {
      package: "com.watertanker.app"
    },
  },
};