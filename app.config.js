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
    },
  },
};