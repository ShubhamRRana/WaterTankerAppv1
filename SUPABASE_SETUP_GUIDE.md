# Supabase Integration Setup Guide

## Table of Contents
1. [Creating a Supabase Account](#creating-a-supabase-account) ✅ **COMPLETED**
2. [Creating a Supabase Project](#creating-a-supabase-project) ✅ **COMPLETED**
3. [Finding Your Supabase Credentials](#finding-your-supabase-credentials) ✅ **COMPLETED**
4. [Setting Up Environment Variables](#setting-up-environment-variables) ✅ **COMPLETED**
5. [Project Configuration Files](#project-configuration-files) ✅ **COMPLETED**
6. [Installing Dependencies](#installing-dependencies) ✅ **COMPLETED**
7. [Creating Supabase Client](#creating-supabase-client) ✅ **COMPLETED**
8. [Verifying Setup](#verifying-setup) ✅ **COMPLETED**
9. [Phase 2: Supabase Integration - Next Steps](#phase-2-supabase-integration---next-steps) ⏳ **READY TO START**
   - [1. Supabase Setup (Complete Foundation)](#1-supabase-setup-complete-foundation)
   - [2. Service Layer Migration](#2-service-layer-migration)
   - [3. Store Updates](#3-store-updates)
   - [4. Data Migration](#4-data-migration)

---

## ✅ Setup Status: Phase 1 Complete

**All initial setup steps (1-8) have been completed successfully!**

- ✅ Supabase account and project created
- ✅ Credentials configured and secured
- ✅ Environment variables set up (`.env` and `.env.example`)
- ✅ Configuration files created (`src/constants/supabase.ts`, `src/services/supabase.ts`)
- ✅ Dependencies installed (`@supabase/supabase-js`, `dotenv`, `expo-constants`)
- ✅ Supabase client created and exported
- ✅ Setup verified and ready for Phase 2

**Next Step:** Proceed to [Phase 2: Supabase Integration](#phase-2-supabase-integration---next-steps) - Database Schema Creation and Service Migration.

---

## Creating a Supabase Account

### Step 1: Sign Up for Supabase

1. **Visit the Supabase Website**
   - Go to [https://supabase.com](https://supabase.com)
   - Click the **"Start your project"** or **"Sign Up"** button (usually in the top right corner)

2. **Choose Your Sign-Up Method**
   - You can sign up using:
     - **GitHub** (Recommended for developers)
     - **Google** account
     - **Email** address

3. **Complete Registration**
   - If using email: Enter your email address and create a password
   - Verify your email address if required
   - Accept the terms of service

4. **Access Your Dashboard**
   - After signing up, you'll be redirected to your Supabase dashboard
   - The dashboard shows all your projects (initially empty)

---

## Creating a Supabase Project

### Step 1: Create New Project

1. **Navigate to Project Creation**
   - In your Supabase dashboard, click the **"New Project"** button
   - Or click **"Create a new project"** if this is your first project

2. **Fill in Project Details**

   **Project Name:**
   - Enter a descriptive name (e.g., `water-tanker-app` or `water-tanker-production`)
   - This name will appear in your dashboard

   **Database Password:**
   - **IMPORTANT**: Create a strong password for your database
   - **SAVE THIS PASSWORD** - You'll need it for database connections
   - Store it securely (password manager recommended)
   - Password requirements:
     - Minimum 12 characters
     - Mix of uppercase, lowercase, numbers, and special characters

   **Region:**
   - Select the region closest to your users
   - For India: Choose **"Southeast Asia (Singapore)"** or **"South Asia (Mumbai)"** if available
   - This affects latency and data residency

   **Pricing Plan:**
   - For development: Choose **"Free"** tier (generous free tier)
   - For production: Review paid plans based on your needs

3. **Create Project**
   - Click **"Create new project"**
   - Wait 1-2 minutes for project provisioning
   - You'll see a loading screen with progress updates

4. **Project Ready**
   - Once ready, you'll be redirected to your project dashboard

---

## Finding Your Supabase Credentials

### Step 1: Access Project Settings

1. **Navigate to Settings**
   - In your project dashboard, click the **⚙️ Settings** icon (gear icon) in the left sidebar
   - Or click on your project name → **Settings**

2. **Go to API Settings**
   - In the Settings menu, click **"API"** (under Project Settings)

### Step 2: Locate Your Credentials

You'll see several important values on the API settings page:

#### 1. **Project URL**
   - **Location**: Top of the page, labeled **"Project URL"**
   - **Format**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Example**: `https://abcdefghijklmnop.supabase.co`
   - **Usage**: This is your Supabase project endpoint
   - **Copy this value** - You'll need it for `EXPO_PUBLIC_SUPABASE_URL`

#### 2. **anon/public Key**
   - **Location**: Under "Project API keys" section, labeled **"anon"** or **"public"**
   - **Format**: Long string starting with `eyJ...`
   - **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Usage**: This key is safe to use in client-side code (React Native app)
   - **Security**: Protected by Row Level Security (RLS) policies
   - **Copy this value** - You'll need it for `EXPO_PUBLIC_SUPABASE_ANON_KEY`

#### 3. **service_role Key** (Server-Side Only)
   - **Location**: Under "Project API keys" section, labeled **"service_role"**
   - **Format**: Long string starting with `eyJ...`
   - **⚠️ WARNING**: This key bypasses RLS policies
   - **Usage**: Only for server-side operations, admin functions, or migration scripts
   - **Security**: **NEVER** expose this in client-side code or commit to version control
   - **Copy this value** - Store securely, you'll need it for `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

#### 4. **Project Reference ID**
   - **Location**: Under "Project Settings" → "General"
   - **Format**: Short alphanumeric string
   - **Usage**: Used in some Supabase CLI commands

### Step 3: Additional Useful Information

**Database Connection String:**
- **Location**: Settings → **"Database"** → **"Connection string"**
- **Format**: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`
- **Usage**: For direct database connections (migrations, scripts)
- **Note**: Replace `[YOUR-PASSWORD]` with the database password you created

**Database Host:**
- Found in the connection string
- Format: `db.xxxxxxxxxxxxx.supabase.co`

**Database Port:**
- Usually `5432` (PostgreSQL default)

---

## Setting Up Environment Variables

### Understanding Expo Environment Variables

In Expo projects, environment variables that need to be accessible in your React Native code must be prefixed with `EXPO_PUBLIC_`. This tells Expo to bundle them into your app.

### Step 1: Create Environment Files

Create environment variable files in your project root:

#### 1. **`.env`** (Local Development - Git Ignored)
   - Contains your actual credentials
   - **NEVER commit this file to Git**
   - Used for local development

#### 2. **`.env.example`** (Template - Git Committed)
   - Template showing required variables (without actual values)
   - Safe to commit to Git
   - Helps team members know what variables are needed

### Step 2: Create `.env` File

1. **Create the file** in your project root directory:
   ```
   WaterTankerAppv1/
   ├── .env          ← Create this file (Git ignored - contains REAL credentials)
   ├── .env.example  ← Create this file (Git committed - contains PLACEHOLDERS only)
   ├── app.json
   ├── package.json
   └── ...
   ```

2. **Add your Supabase credentials** to `.env`:
   ```env
   # Supabase Configuration
   # ⚠️ IMPORTANT: This file contains REAL credentials and is Git ignored
   # Replace the placeholder values below with your actual Supabase credentials
   
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   
   # Server-side only (for migration scripts, not used in app)
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Replace the placeholder values in `.env` with your REAL credentials**:
   - Replace `https://your-project-id.supabase.co` with your actual Project URL
   - Replace `your-anon-key-here` with your actual anon/public key
   - Replace `your-service-role-key-here` with your actual service_role key

### Step 3: Create `.env.example` File

**⚠️ CRITICAL SECURITY WARNING:**
- `.env.example` is **committed to Git** (it's NOT in `.gitignore`)
- `.env.example` must **ONLY contain PLACEHOLDER values**, never real credentials
- This file serves as a template for other developers
- **NEVER paste your actual Supabase credentials into `.env.example`**

Create a template file that shows what variables are needed (with placeholders only):

```env
# Supabase Configuration
# Get these values from: Supabase Dashboard → Settings → API
# 
# ⚠️ SECURITY: This file is committed to Git!
# ⚠️ NEVER put real credentials here - only placeholder values!
# ⚠️ Copy this file to .env and replace placeholders with your actual values

EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side only (for migration scripts, not used in app)
# ⚠️ NEVER commit the actual service_role key to Git
# ⚠️ This is a placeholder - replace with real value only in .env file
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Key Differences:**
- **`.env`**: Contains REAL credentials, Git ignored, never committed
- **`.env.example`**: Contains PLACEHOLDER values only, committed to Git, safe to share

### Step 4: Update `.gitignore`

Ensure `.env` is in your `.gitignore` file to prevent committing secrets:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# But keep the example file
!.env.example
```

### Step 5: Install Environment Variable Loader

Expo doesn't automatically load `.env` files. Install a package to load them:

```bash
npm install dotenv
```

Or use Expo's built-in support (Expo SDK 49+):

```bash
npm install expo-constants
```

**Note**: For Expo projects, you may need to use `expo-constants` or configure `app.config.js` to load environment variables. See the "Alternative: Using app.config.js" section below.

---

## Project Configuration Files

### File Structure

Your project should have the following structure for Supabase configuration:

```
WaterTankerAppv1/
├── .env                    # Environment variables (Git ignored)
├── .env.example            # Environment template (Git committed)
├── app.json                # Expo configuration
├── app.config.js           # Expo config (if using env vars)
├── src/
│   ├── constants/
│   │   ├── config.ts       # App configuration (existing)
│   │   └── supabase.ts     # Supabase configuration (NEW - to create)
│   └── services/
│       └── supabase.ts     # Supabase client (NEW - to create)
└── ...
```

### File 1: `src/constants/supabase.ts` (NEW)

This file will read environment variables and export Supabase configuration:

```typescript
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

export const SUPABASE_CONFIG = {
  /**
   * Supabase project URL
   * Format: https://your-project-id.supabase.co
   */
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',

  /**
   * Supabase anonymous/public key
   * Safe to use in client-side code (protected by RLS)
   */
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  /**
   * Service role key (server-side only)
   * ⚠️ NEVER use this in client-side code
   * Only for admin operations, migrations, or server-side scripts
   */
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
```

### File 2: `src/services/supabase.ts` (NEW)

This file will create and export the Supabase client:

```typescript
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
```

### File 3: Update `app.config.js` (Optional - For Better Env Var Support)

If you want better environment variable support in Expo, create or update `app.config.js`:

```javascript
// app.config.js

require('dotenv').config(); // Load .env file

module.exports = {
  expo: {
    name: 'water-tanker-app',
    slug: 'water-tanker-app',
    version: '1.0.0',
    // ... other config from app.json ...
    
    // Make environment variables available
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
```

Then update `src/constants/supabase.ts` to use `expo-constants`:

```typescript
import Constants from 'expo-constants';

export const SUPABASE_CONFIG = {
  url: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};
```

**Note**: If you use `app.config.js`, you'll need to rename `app.json` or merge its contents into `app.config.js`.

---

## Installing Dependencies

### Step 1: Install Supabase Client

Install the Supabase JavaScript client library:

```bash
npm install @supabase/supabase-js
```

### Step 2: Install Additional Packages (Optional but Recommended)

For better environment variable support:

```bash
npm install dotenv
```

For accessing environment variables in Expo:

```bash
npm install expo-constants
```

### Step 3: Verify Installation

Check that packages are installed:

```bash
npm list @supabase/supabase-js
```

You should see the package version listed.

---

## Creating Supabase Client

### Step 1: Create Configuration File

Create `src/constants/supabase.ts` with the content from the "Project Configuration Files" section above.

### Step 2: Create Supabase Service File

Create `src/services/supabase.ts` with the content from the "Project Configuration Files" section above.

### Step 3: Export from Index Files (Optional but Recommended)

Update `src/services/index.ts` to export the Supabase client:

```typescript
// src/services/index.ts

export * from './auth.service';
export * from './booking.service';
export * from './localStorage';
export * from './location.service';
export * from './payment.service';
export { supabase, checkSupabaseConnection } from './supabase'; // Add this line
```

Update `src/constants/config.ts` or create a new export:

```typescript
// In src/constants/config.ts, add at the end:

export * from './supabase'; // If you create supabase.ts in constants
```

---

## Verifying Setup

### Step 1: Check Environment Variables

Create a simple test to verify your environment variables are loaded:

```typescript
// src/utils/testSupabaseConfig.ts (temporary test file)

import { SUPABASE_CONFIG, isSupabaseConfigured } from '../constants/supabase';

export const testSupabaseConfig = () => {
  console.log('=== Supabase Configuration Test ===');
  console.log('URL:', SUPABASE_CONFIG.url ? '✅ Set' : '❌ Missing');
  console.log('Anon Key:', SUPABASE_CONFIG.anonKey ? '✅ Set' : '❌ Missing');
  console.log('Service Role Key:', SUPABASE_CONFIG.serviceRoleKey ? '✅ Set' : '⚠️ Optional');
  console.log('Is Configured:', isSupabaseConfigured() ? '✅ Yes' : '❌ No');
  console.log('====================================');
};
```

Call this function in your `App.tsx` temporarily:

```typescript
// In App.tsx, add at the top of the component:

import { testSupabaseConfig } from './src/utils/testSupabaseConfig';

// Inside your App component:
useEffect(() => {
  testSupabaseConfig();
}, []);
```

### Step 2: Test Supabase Connection

Create a connection test:

```typescript
// src/utils/testSupabaseConnection.ts (temporary test file)

import { checkSupabaseConnection } from '../services/supabase';

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
```

### Step 3: Run Your App

1. **Start the development server**:
   ```bash
   npm start
   ```

2. **Check the console** for:
   - Environment variable warnings
   - Connection test results
   - Any Supabase-related errors

3. **If you see warnings about missing variables**:
   - Verify `.env` file exists in project root
   - Check that variable names start with `EXPO_PUBLIC_`
   - Restart the Expo development server after creating/updating `.env`

### Step 4: Common Issues and Solutions

**Issue: Environment variables not loading**
- **Solution**: 
  - Ensure `.env` file is in project root (same level as `package.json`)
  - Restart Expo dev server after creating/updating `.env`
  - For Expo, variables must start with `EXPO_PUBLIC_`
  - Consider using `app.config.js` with `expo-constants` for better support

**Issue: "Invalid API key" error**
- **Solution**:
  - Verify you copied the correct key (anon key, not service_role)
  - Check for extra spaces or line breaks in `.env` file
  - Ensure the key is the full string (very long)

**Issue: "Invalid URL" error**
- **Solution**:
  - Verify the URL format: `https://your-project-id.supabase.co`
  - Ensure no trailing slash
  - Check for typos in project ID

**Issue: Connection timeout**
- **Solution**:
  - Check your internet connection
  - Verify the Supabase project is active (not paused)
  - Check if you're behind a firewall/proxy

---

## Phase 2: Supabase Integration - Next Steps

Once your Supabase setup is verified, proceed with Phase 2 integration. This phase aligns with the refactoring strategy and includes 4 main components:

### 1. Supabase Setup (Complete Foundation)

**Project Creation and Configuration:**
- ✅ Project creation (completed in steps above)
- ✅ Environment variables configured (completed in steps above)
- ✅ Supabase client created (completed in steps above)

**Database Schema Creation:**
- Create tables (users, bookings, addresses, vehicles, drivers, etc.)
- Define relationships and foreign keys
- Create indexes for performance optimization
- Set up database constraints and validations

**RLS Policies Implementation:**
- Set up Row Level Security (RLS) policies for all tables
- Define policies for each user role (customer, driver, admin)
- Ensure data isolation and security at the database level
- Test RLS policies with different user roles

**Resources:**
- Refer to `SUPABASE_MIGRATION_PLAN.md` for detailed schema design
- Use Supabase Dashboard → SQL Editor for schema creation
- Test RLS policies in Supabase Dashboard → Authentication → Policies

---

### 2. Service Layer Migration

**AuthService → Supabase Auth:**
- Replace localStorage-based authentication with Supabase Auth
- Migrate user registration to `supabase.auth.signUp()`
- Migrate login to `supabase.auth.signInWithPassword()`
- Implement session management with `supabase.auth.getSession()`
- Handle password reset flows with Supabase Auth
- Update user profile management to use Supabase Auth

**BookingService → Supabase with Realtime:**
- Replace AsyncStorage booking storage with Supabase database
- Migrate booking CRUD operations to Supabase queries
- Implement real-time subscriptions for booking status updates
- Use Supabase Realtime for live booking updates
- Replace polling mechanism with WebSocket subscriptions

**LocationService → Supabase (with proper React Native support):**
- Store location data in Supabase database
- Implement location tracking with Supabase
- Use Supabase Realtime for live location updates
- Ensure proper React Native geolocation integration
- Handle location permissions and errors

**PaymentService → Keep simple for now (COD focus):**
- Maintain current COD (Cash on Delivery) implementation
- Store payment records in Supabase database
- Prepare structure for future payment gateway integration
- Keep payment logic simple and focused on COD

**Resources:**
- Refer to existing service files: `src/services/auth.service.ts`, `src/services/booking.service.ts`, `src/services/location.service.ts`, `src/services/payment.service.ts`
- Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Supabase Realtime documentation: https://supabase.com/docs/guides/realtime

---

### 3. Store Updates

**Update Zustand Stores to Work with Supabase:**
- Update `authStore` to use Supabase Auth instead of localStorage
- Update `bookingStore` to fetch from Supabase database
- Update `userStore` to sync with Supabase user profiles
- Update any other stores that interact with data storage
- Ensure stores handle Supabase errors gracefully

**Add Real-time Subscriptions:**
- Set up Supabase Realtime subscriptions in stores
- Subscribe to booking status changes
- Subscribe to location updates for drivers
- Subscribe to user profile updates
- Implement subscription cleanup on component unmount

**Update State Management Patterns:**
- Replace AsyncStorage reads with Supabase queries
- Replace AsyncStorage writes with Supabase mutations
- Implement optimistic updates where appropriate
- Add loading and error states for Supabase operations
- Ensure state synchronization across app

**Resources:**
- Refer to existing store files: `src/stores/authStore.ts`, `src/stores/bookingStore.ts`, `src/stores/userStore.ts`
- Supabase Realtime subscriptions: https://supabase.com/docs/guides/realtime/subscriptions
- Zustand documentation: https://github.com/pmndrs/zustand

---

### 4. Data Migration

**Create Migration Scripts:**
- Create scripts to read data from AsyncStorage
- Transform data to match Supabase schema
- Handle data type conversions (dates, enums, etc.)
- Create validation scripts to ensure data integrity
- Implement rollback mechanisms for failed migrations

**Migrate Existing Data:**
- Export all data from AsyncStorage (users, bookings, addresses, etc.)
- Transform and validate data format
- Import data into Supabase database
- Handle duplicate entries and conflicts
- Preserve data relationships and references

**Validate Data Integrity:**
- Verify all data was migrated successfully
- Check data relationships are intact
- Validate data types and constraints
- Compare record counts (before vs after)
- Test app functionality with migrated data
- Ensure no data loss occurred

**Resources:**
- Create migration scripts in `scripts/migrate-to-supabase.ts`
- Use Supabase service_role key for migration (server-side only)
- Test migration with sample data first
- Backup AsyncStorage data before migration

---

## Implementation Order

Follow this order for Phase 2 implementation:

1. **Start with Supabase Setup** (Item 1)
   - Create database schema
   - Implement RLS policies
   - Test database structure

2. **Then Service Layer Migration** (Item 2)
   - Start with AuthService (foundation for other services)
   - Then BookingService (core functionality)
   - Then LocationService (depends on auth)
   - Finally PaymentService (simplest)

3. **Update Stores** (Item 3)
   - Update stores after services are migrated
   - Add real-time subscriptions
   - Test state management

4. **Data Migration** (Item 4)
   - Migrate data after all services are updated
   - Validate data integrity
   - Test with migrated data

---

## Additional Resources

- **Detailed Migration Plan**: Refer to `SUPABASE_MIGRATION_PLAN.md` for step-by-step implementation
- **Refactoring Strategy**: See `REFACTORING_VS_SUPABASE_STRATEGY.md` for overall approach
- **Supabase Documentation**: https://supabase.com/docs
- **Supabase React Native Guide**: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

---

## Security Best Practices

### ✅ DO:
- ✅ Use `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your app (safe for client-side)
- ✅ Rely on Row Level Security (RLS) policies for data protection
- ✅ Store `SUPABASE_SERVICE_ROLE_KEY` only in server-side code or secure environment
- ✅ Use `.env.example` as a template with **PLACEHOLDER values only** (e.g., `your-project-id.supabase.co`)
- ✅ Add `.env` to `.gitignore` to prevent committing real credentials
- ✅ Keep `.env.example` in Git (it's safe because it only has placeholders)
- ✅ Rotate keys if they're accidentally exposed
- ✅ Double-check `.env.example` before committing to ensure it has no real credentials

### ❌ DON'T:
- ❌ Commit `.env` file to Git (it contains real credentials)
- ❌ Put real credentials in `.env.example` (it's committed to Git!)
- ❌ Use `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- ❌ Share your service_role key publicly
- ❌ Hardcode credentials in source code
- ❌ Commit credentials to version control
- ❌ Copy-paste real values from `.env` into `.env.example`

---

## Quick Reference: Where to Find Credentials

| Credential | Location in Supabase Dashboard |
|------------|-------------------------------|
| **Project URL** | Settings → API → Project URL |
| **anon/public Key** | Settings → API → Project API keys → anon/public |
| **service_role Key** | Settings → API → Project API keys → service_role |
| **Database Password** | The password you set when creating the project (save it securely!) |
| **Connection String** | Settings → Database → Connection string |

---

## Summary Checklist

- [x] ✅ Created Supabase account
- [x] ✅ Created Supabase project
- [x] ✅ Saved database password securely
- [x] ✅ Located Project URL from Settings → API
- [x] ✅ Located anon/public key from Settings → API
- [x] ✅ Located service_role key from Settings → API (for server-side use)
- [x] ✅ Created `.env` file in project root
- [x] ✅ Added `EXPO_PUBLIC_SUPABASE_URL` to `.env`
- [x] ✅ Added `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `.env`
- [x] ✅ Added `SUPABASE_SERVICE_ROLE_KEY` to `.env` (optional, server-side only)
- [x] ✅ Created `.env.example` template file
- [x] ✅ Verified `.env` is in `.gitignore`
- [x] ✅ Installed `@supabase/supabase-js` package
- [x] ✅ Created `src/constants/supabase.ts` configuration file
- [x] ✅ Created `src/services/supabase.ts` client file
- [x] ✅ Tested environment variable loading
- [x] ✅ Tested Supabase connection
- [x] ✅ Verified no credentials are committed to Git

---

**Congratulations!** 🎉 Your Supabase setup is complete. You're now ready to proceed with database schema creation and service migration.

---

## 🚀 Next Steps: Phase 2 Integration

Now that the initial setup is complete, proceed with Phase 2 integration:

1. **Database Schema Creation** - Create tables, relationships, and indexes
2. **RLS Policies Implementation** - Set up Row Level Security for data protection
3. **Service Layer Migration** - Migrate AuthService, BookingService, LocationService, and PaymentService
4. **Store Updates** - Update Zustand stores to work with Supabase
5. **Data Migration** - Migrate existing data from AsyncStorage to Supabase

See the [Phase 2: Supabase Integration - Next Steps](#phase-2-supabase-integration---next-steps) section below for detailed instructions.

---

*Last Updated: 2024-12-19*
*Document Version: 1.2*
*Phase 1 Status: ✅ 100% Complete - All 8 setup steps completed*
*Updated to align with Phase 2 items from REFACTORING_VS_SUPABASE_STRATEGY.md*

