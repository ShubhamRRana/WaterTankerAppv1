# Database Setup Guide

This guide explains how to set up the Supabase database schema for the Water Tanker Booking App.

## Prerequisites

1. **Supabase Project Created**: You should have a Supabase project set up at [supabase.com](https://supabase.com)
2. **Project Credentials**: Your Supabase URL and anon key should be in your `.env` file
3. **Supabase CLI** (Optional): For local development and migrations

## Setup Steps

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Initial Schema Migration

1. Open the file `supabase/migrations/001_initial_schema.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

**What this does:**
- Creates all required tables (users, addresses, bookings, vehicles, etc.)
- Sets up indexes for performance
- Creates triggers for automatic `updated_at` timestamps
- Inserts default pricing and tanker sizes

**Expected Output:**
- Success message if all commands execute correctly
- If you see errors, check the error messages and ensure you have the necessary permissions

### Step 3: Run Row Level Security (RLS) Migration

1. Open the file `supabase/migrations/002_row_level_security.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run**

**What this does:**
- Enables Row Level Security on all tables
- Creates helper functions for role checking
- Sets up security policies for:
  - Users can only access their own data
  - Admins can access all data
  - Drivers can see available bookings
  - Customers can create and manage their bookings

**Expected Output:**
- Success message confirming all policies are created

### Step 4: Verify Setup

Run these queries in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check if policies are created
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check default data
SELECT * FROM pricing;
SELECT * FROM tanker_sizes;
```

## Database Schema Overview

### Core Tables

#### `users`
- Stores all user profiles (customers, drivers, admins)
- Linked to Supabase Auth via `auth_id`
- Contains role-specific fields (nullable)

#### `addresses`
- Saved delivery addresses for customers
- Linked to users via `user_id`
- Supports default address (one per user)

#### `bookings`
- Main booking/order table
- Links customers, drivers, and agencies
- Stores delivery address as JSONB
- Tracks status, payment, and timestamps

#### `vehicles`
- Vehicles managed by admin agencies
- Linked to admin users via `agency_id`

#### `tanker_sizes`
- Configurable tanker sizes with base pricing
- Can be activated/deactivated

#### `pricing`
- Global pricing configuration
- Single row (updated over time)
- Contains `price_per_km` and `minimum_charge`

#### `driver_applications`
- Driver registration requests
- Tracks approval status

#### `notifications`
- In-app notifications for users
- Linked to bookings for context

## Row Level Security (RLS) Policies

### User Access Patterns

**Customers:**
- Can read/update their own profile
- Can create and manage their own bookings
- Can manage their own addresses
- Can read driver profiles (for booking context)

**Drivers:**
- Can read/update their own profile
- Can see available bookings (pending status)
- Can accept and manage assigned bookings
- Can read customer profiles (for booking context)

**Admins:**
- Can read/update all users
- Can manage all bookings
- Can manage vehicles for their agency
- Can manage tanker sizes and pricing
- Can approve/reject driver applications

## Using Supabase CLI (Optional)

If you prefer using the Supabase CLI for migrations:

### Install Supabase CLI

```bash
npm install -g supabase
```

### Link Your Project

```bash
supabase link --project-ref your-project-ref
```

### Run Migrations

```bash
supabase db push
```

This will apply all migrations in the `supabase/migrations/` directory.

## Troubleshooting

### Error: "permission denied for schema public"

**Solution:** Ensure you're running migrations as the database owner or with proper permissions. In Supabase dashboard, you should have admin access.

### Error: "relation already exists"

**Solution:** The table already exists. You can either:
1. Drop the existing table (if it's empty/test data)
2. Skip the CREATE TABLE statement and only run the parts you need

### Error: "function already exists"

**Solution:** Similar to above - the function already exists. You can use `CREATE OR REPLACE FUNCTION` instead.

### RLS Policies Not Working

**Check:**
1. RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. User is authenticated: Check `auth.uid()` returns a value
4. User has a record in `users` table linked to `auth.users`

## Next Steps

After setting up the database:

1. **Test Connection**: Use the test utility in `src/utils/testSupabaseConfig.ts`
2. **Migrate Auth Service**: Update `src/services/auth.service.ts` to use Supabase Auth
3. **Migrate Booking Service**: Update `src/services/booking.service.ts` to use Supabase
4. **Update Stores**: Modify Zustand stores to work with Supabase

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Migration Files

- `001_initial_schema.sql` - Creates all tables, indexes, and triggers
- `002_row_level_security.sql` - Sets up RLS policies and helper functions

## Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- UUIDs are used for all primary keys
- Foreign keys have appropriate `ON DELETE` actions
- Indexes are created for common query patterns
- Triggers automatically update `updated_at` columns

