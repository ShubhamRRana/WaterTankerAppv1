# Supabase Migration Plan - Water Tanker App

## Overview

This document outlines the complete migration plan from AsyncStorage (local storage) to Supabase for the Water Tanker Booking App. The migration will move all data persistence to a cloud-based PostgreSQL database with real-time capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Schema Design](#database-schema-design)
3. [Migration Steps](#migration-steps)
4. [Data Migration Strategy](#data-migration-strategy)
5. [Authentication Migration](#authentication-migration)
6. [Testing Checklist](#testing-checklist)
7. [Rollback Plan](#rollback-plan)

---

## Prerequisites

### 1. Supabase Account Setup
- Create a Supabase account at https://supabase.com
- Create a new project
- Note down the following credentials:
  - Project URL (e.g., `https://xxxxx.supabase.co`)
  - Anon/Public Key
  - Service Role Key (keep this secret!)
  - Database Password

### 2. Development Environment
- Node.js installed
- npm or yarn package manager
- Supabase CLI (optional, for local development)
- Access to Supabase Dashboard

### 3. Dependencies to Install
```bash
npm install @supabase/supabase-js
```

---

## Database Schema Design

**Multi-Role Support**: This schema supports users who can have multiple roles (e.g., a user can be both a customer and an admin). The design uses a base `users` table for common user data and separate tables for role-specific data, connected via a `user_roles` junction table.

### Table 1: `users`

**Purpose**: Store base user information (one row per person, regardless of roles).

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique user identifier (replaces `uid`) |
| `email` | `text` | UNIQUE, NOT NULL | Primary identifier for authentication |
| `password_hash` | `text` | NOT NULL | Hashed password (temporary, will use Supabase Auth) |
| `name` | `text` | NOT NULL | User's full name |
| `phone` | `text` | NULLABLE | Contact phone number (optional) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Account creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_users_email` on `email` (for fast lookups)

**Notes**:
- One row per person (no role duplication)
- All dates stored as `timestamptz` for timezone support
- `password_hash` is temporary - will migrate to Supabase Auth later
- Roles are managed via `user_roles` junction table

---

### Table 2: `user_roles`

**Purpose**: Junction table to support multi-role users (many-to-many relationship).

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY (part 1), FOREIGN KEY → `users(id)` ON DELETE CASCADE | Reference to user |
| `role` | `text` | PRIMARY KEY (part 2), CHECK (`role` IN ('customer', 'driver', 'admin')) | User role type |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Role assignment timestamp |

**Indexes**:
- `idx_user_roles_user_id` on `user_id` (for user role lookups)
- `idx_user_roles_role` on `role` (for role-based queries)

**Notes**:
- Composite primary key ensures one role per user (no duplicates)
- A user can have multiple rows (one per role)
- Example: User with ID `abc-123` can have rows: `(abc-123, 'customer')` and `(abc-123, 'admin')`

---

### Table 3: `customers`

**Purpose**: Store customer-specific data.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Reference to user |
| `saved_addresses` | `jsonb` | NULLABLE | Array of saved addresses |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Customer profile creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_customers_user_id` on `user_id` (for fast lookups)

**Notes**:
- `saved_addresses` stores JSON array: `[{"id": "...", "address": "123 Main St, City, State 12345", "latitude": 0.0, "longitude": 0.0}]`
- Address is stored as a continuous string, not separated into street, city, state, etc.
- Only created when user has 'customer' role in `user_roles`

---

### Table 4: `drivers`

**Purpose**: Store driver-specific data.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Reference to user |
| `vehicle_number` | `text` | NOT NULL | Vehicle registration number |
| `license_number` | `text` | NOT NULL | Driver license number |
| `license_expiry` | `date` | NOT NULL | License expiration date |
| `driver_license_image_url` | `text` | NOT NULL | URL to license image |
| `vehicle_registration_image_url` | `text` | NOT NULL | URL to registration image |
| `total_earnings` | `numeric(10,2)` | NOT NULL, DEFAULT `0` | Total earnings in INR |
| `completed_orders` | `integer` | NOT NULL, DEFAULT `0` | Number of completed orders |
| `created_by_admin` | `boolean` | NOT NULL, DEFAULT `false` | Whether driver was created by admin |
| `emergency_contact_name` | `text` | NULLABLE | Emergency contact name |
| `emergency_contact_phone` | `text` | NULLABLE | Emergency contact phone |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Driver profile creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_drivers_user_id` on `user_id` (for fast lookups)
- `idx_drivers_vehicle_number` on `vehicle_number` (for unique lookups)

**Notes**:
- Only created when user has 'driver' role in `user_roles`
- Driver-specific fields are NOT NULL (better data integrity than single-table approach)

---

### Table 5: `admins`

**Purpose**: Store admin-specific data.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Reference to user |
| `business_name` | `text` | NULLABLE | Business/agency name |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Admin profile creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_admins_user_id` on `user_id` (for fast lookups)

**Notes**:
- Only created when user has 'admin' role in `user_roles`

---

### Table 6: `bookings`

**Purpose**: Store all water tanker booking orders.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique booking identifier |
| `customer_id` | `uuid` | NOT NULL, FOREIGN KEY → `users(id)` | Reference to customer user |
| `customer_name` | `text` | NOT NULL | Customer name (denormalized for performance) |
| `customer_phone` | `text` | NOT NULL | Customer phone (denormalized) |
| `agency_id` | `uuid` | NULLABLE, FOREIGN KEY → `users(id)` | Reference to admin/agency user |
| `agency_name` | `text` | NULLABLE | Agency name (denormalized) |
| `driver_id` | `uuid` | NULLABLE, FOREIGN KEY → `users(id)` | Reference to driver user |
| `driver_name` | `text` | NULLABLE | Driver name (denormalized) |
| `driver_phone` | `text` | NULLABLE | Driver phone (denormalized) |
| `status` | `text` | NOT NULL, CHECK (`status` IN ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled')) | Booking status |
| `tanker_size` | `integer` | NOT NULL | Tanker size in liters |
| `quantity` | `integer` | NULLABLE, DEFAULT `1` | Number of tankers |
| `base_price` | `numeric(10,2)` | NOT NULL | Base price in INR |
| `distance_charge` | `numeric(10,2)` | NOT NULL | Distance-based charge in INR |
| `total_price` | `numeric(10,2)` | NOT NULL | Total price in INR |
| `delivery_address` | `jsonb` | NOT NULL | Complete address object (JSON) |
| `distance` | `numeric(8,2)` | NOT NULL | Distance in kilometers |
| `scheduled_for` | `timestamptz` | NULLABLE | Scheduled delivery date/time |
| `payment_status` | `text` | NOT NULL, CHECK (`payment_status` IN ('pending', 'completed', 'failed', 'refunded')) | Payment status |
| `payment_id` | `text` | NULLABLE | Payment transaction ID |
| `cancellation_reason` | `text` | NULLABLE | Reason for cancellation |
| `can_cancel` | `boolean` | NOT NULL, DEFAULT `true` | Whether booking can be cancelled |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Booking creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |
| `accepted_at` | `timestamptz` | NULLABLE | When driver accepted booking |
| `delivered_at` | `timestamptz` | NULLABLE | When booking was delivered |

**Indexes**:
- `idx_bookings_customer_id` on `customer_id` (for customer order history)
- `idx_bookings_driver_id` on `driver_id` (for driver orders)
- `idx_bookings_status` on `status` (for filtering by status)
- `idx_bookings_agency_id` on `agency_id` (for agency bookings)
- `idx_bookings_created_at` on `created_at` (for sorting by date)
- `idx_bookings_pending` on `(status, created_at)` WHERE `status = 'pending'` (for available bookings)

**Notes**:
- `delivery_address` stores JSON: `{"address": "123 Main St, City, State 12345", "latitude": 0.0, "longitude": 0.0}`
- Address is stored as a continuous string, not separated into street, city, state, pincode, or landmark
- Foreign keys have `ON DELETE SET NULL` for optional relationships
- Foreign key on `customer_id` has `ON DELETE CASCADE` (if customer deleted, bookings deleted)

---

### Table 7: `vehicles`

**Purpose**: Store vehicle/agency fleet information managed by admins.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique vehicle identifier |
| `agency_id` | `uuid` | NOT NULL, FOREIGN KEY → `users(id)` | Reference to admin/agency user |
| `vehicle_number` | `text` | NOT NULL | Vehicle registration number |
| `insurance_company_name` | `text` | NOT NULL | Insurance company name |
| `insurance_expiry_date` | `date` | NOT NULL | Insurance expiration date |
| `vehicle_capacity` | `integer` | NOT NULL | Vehicle capacity in liters |
| `amount` | `numeric(10,2)` | NOT NULL | Vehicle amount/price in INR |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_vehicles_agency_id` on `agency_id` (for agency fleet queries)
- `idx_vehicles_vehicle_number` on `vehicle_number` (for unique lookups)

**Constraints**:
- Unique constraint on `(agency_id, vehicle_number)` to prevent duplicate vehicles per agency

**Notes**:
- Foreign key on `agency_id` has `ON DELETE CASCADE` (if agency deleted, vehicles deleted)

---

### Table 8: `tanker_sizes`

**Purpose**: Store available tanker sizes and their base pricing (configuration table).

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique tanker size identifier |
| `size` | `integer` | NOT NULL, UNIQUE | Tanker size in liters |
| `base_price` | `numeric(10,2)` | NOT NULL | Base price in INR |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | Whether size is available |
| `display_name` | `text` | NOT NULL | Display name (e.g., "10000 Liters") |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_tanker_sizes_active` on `(is_active, size)` (for active sizes lookup)

**Notes**:
- This is a configuration table, typically managed by admins
- `size` must be unique (only one price per size)

---

### Table 9: `pricing`

**Purpose**: Store distance-based pricing configuration (singleton table).

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique pricing config ID |
| `price_per_km` | `numeric(8,2)` | NOT NULL | Price per kilometer in INR |
| `minimum_charge` | `numeric(8,2)` | NOT NULL | Minimum distance charge in INR |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |
| `updated_by` | `uuid` | NOT NULL, FOREIGN KEY → `users(id)` | Admin who updated pricing |

**Indexes**:
- No additional indexes needed (singleton table)

**Notes**:
- This table should only have one row (singleton pattern)
- Use a trigger or application logic to enforce single row
- `updated_by` references admin user

---

### Table 10: `driver_applications`

**Purpose**: Store driver registration/application requests.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique application identifier |
| `name` | `text` | NOT NULL | Applicant name |
| `phone` | `text` | NOT NULL | Applicant phone |
| `email` | `text` | NULLABLE | Applicant email |
| `vehicle_number` | `text` | NOT NULL | Vehicle registration number |
| `license_number` | `text` | NOT NULL | Driver license number |
| `driver_license_image_url` | `text` | NOT NULL | URL to license image |
| `vehicle_registration_image_url` | `text` | NOT NULL | URL to registration image |
| `status` | `text` | NOT NULL, CHECK (`status` IN ('pending', 'approved', 'rejected')) | Application status |
| `applied_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Application submission timestamp |
| `reviewed_by` | `uuid` | NULLABLE, FOREIGN KEY → `users(id)` | Admin who reviewed |
| `reviewed_at` | `timestamptz` | NULLABLE | Review timestamp |
| `rejection_reason` | `text` | NULLABLE | Reason for rejection |

**Indexes**:
- `idx_driver_applications_status` on `status` (for filtering by status)
- `idx_driver_applications_applied_at` on `applied_at` (for sorting)

**Notes**:
- Foreign key on `reviewed_by` references admin user
- Images stored as URLs (Supabase Storage will be used)

---

### Table 11: `notifications`

**Purpose**: Store in-app notifications for users.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique notification identifier |
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY → `users(id)` | Reference to user |
| `title` | `text` | NOT NULL | Notification title |
| `message` | `text` | NOT NULL | Notification message |
| `type` | `text` | NOT NULL, CHECK (`type` IN ('booking', 'payment', 'system')) | Notification type |
| `is_read` | `boolean` | NOT NULL, DEFAULT `false` | Read status |
| `related_booking_id` | `uuid` | NULLABLE, FOREIGN KEY → `bookings(id)` | Related booking (if applicable) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Creation timestamp |

**Indexes**:
- `idx_notifications_user_id` on `user_id` (for user notifications)
- `idx_notifications_user_unread` on `(user_id, is_read, created_at)` (for unread notifications)
- `idx_notifications_related_booking` on `related_booking_id` (for booking-related notifications)

**Notes**:
- Foreign key on `user_id` has `ON DELETE CASCADE`
- Foreign key on `related_booking_id` has `ON DELETE SET NULL`

---

### Table 12: `bank_accounts`

**Purpose**: Store bank account information for admin users.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique bank account identifier |
| `admin_id` | `uuid` | NOT NULL, FOREIGN KEY → `users(id)` ON DELETE CASCADE | Reference to admin user |
| `account_holder_name` | `text` | NOT NULL | Account holder name |
| `bank_name` | `text` | NOT NULL | Bank name |
| `account_number` | `text` | NOT NULL | Bank account number |
| `ifsc_code` | `text` | NOT NULL | IFSC code (e.g., HDFC0001234) |
| `branch_name` | `text` | NOT NULL | Branch name |
| `is_default` | `boolean` | NOT NULL, DEFAULT `false` | Whether this is the default account |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_bank_accounts_admin_id` on `admin_id` (for admin account lookups)
- `idx_bank_accounts_default` on `(admin_id, is_default)` WHERE `is_default = true` (for default account lookup)

**Constraints**:
- Only one default account per admin (enforced via application logic or trigger)

**Notes**:
- Foreign key on `admin_id` has `ON DELETE CASCADE` (if admin deleted, bank accounts deleted)
- Only admins can manage bank accounts
- Application logic ensures only one account is marked as default per admin

---

## Migration Steps

### Phase 1: Supabase Project Setup

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Fill in project details:
     - Name: `water-tanker-app`
     - Database Password: (generate strong password)
     - Region: Choose closest to your users
   - Wait for project initialization (2-3 minutes)

2. **Get Project Credentials**
   - Navigate to Project Settings → API
   - Copy:
     - Project URL
     - `anon` public key
     - `service_role` key (keep secret!)

3. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Create Environment Configuration**
   - Create `.env` file (add to `.gitignore`)
   - Add credentials:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your-project-url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

---

### Phase 2: Database Schema Creation

1. **Access SQL Editor**
   - Go to Supabase Dashboard → SQL Editor
   - Create new query

2. **Run Schema Creation Script**
   - Execute the SQL script (provided in next section) to create all tables
   - Verify tables are created in Database → Tables

3. **Set Up Row Level Security (RLS)**
   - Enable RLS on all tables
   - Create policies for each table (see RLS Policies section)

4. **Create Indexes**
   - Indexes are included in the schema script
   - Verify indexes in Database → Indexes

5. **Set Up Triggers**
   - Create `updated_at` trigger function
   - Apply trigger to all tables with `updated_at` column

---

### Phase 3: Supabase Client Implementation

1. **Create Supabase Client File**
   - File: `src/lib/supabaseClient.ts`
   - Initialize Supabase client with credentials

2. **Create SupabaseDataAccess Class**
   - File: `src/lib/supabaseDataAccess.ts`
   - Implement `IDataAccessLayer` interface
   - Implement all methods for users, bookings, vehicles

3. **Update Data Access Export**
   - File: `src/lib/index.ts`
   - Export `SupabaseDataAccess` instead of `LocalStorageDataAccess`

---

### Phase 4: Authentication Migration

1. **Set Up Supabase Auth**
   - Enable Email provider in Authentication → Providers
   - Configure email templates (optional)

2. **Migrate User Authentication**
   - Replace password hashing with Supabase Auth
   - Update `auth.service.ts` to use Supabase Auth
   - Migrate existing users to Supabase Auth (see Data Migration section)

3. **Update Session Management**
   - Use Supabase session instead of local storage
   - Update `sessionManager.ts` if needed

---

### Phase 5: Real-time Subscriptions

1. **Enable Realtime**
   - Go to Database → Replication
   - Enable replication for: `bookings`, `notifications`, `users`, `user_roles`, `customers`, `drivers`, `admins`, `bank_accounts`

2. **Update SubscriptionManager**
   - File: `src/utils/subscriptionManager.ts`
   - Replace local subscriptions with Supabase Realtime channels
   - Subscribe to `user_roles` changes for role updates

3. **Test Real-time Updates**
   - Verify bookings update in real-time
   - Verify notifications appear instantly
   - Verify role changes propagate correctly

---

### Phase 6: Storage Setup (Optional)

1. **Create Storage Buckets**
   - Go to Storage → Buckets
   - Create buckets:
     - `profile-images` (public)
     - `driver-documents` (private)
     - `vehicle-documents` (private)

2. **Set Up Storage Policies**
   - Configure RLS policies for each bucket
   - Allow public read for profile images
   - Restrict driver/vehicle documents to owners/admins

---

### Phase 7: Data Migration

1. **Export Local Data**
   - Create migration script to export AsyncStorage data
   - Convert dates to ISO strings
   - Handle nested objects (addresses)

2. **Import to Supabase**
   - Use Supabase client to insert data
   - Handle foreign key relationships
   - Verify data integrity

3. **Test Data Access**
   - Verify all queries work correctly
   - Check data relationships
   - Test filtering and sorting

---

### Phase 8: Testing & Validation

1. **Unit Tests**
   - Update test mocks for Supabase
   - Run existing test suite
   - Fix any failing tests

2. **Integration Tests**
   - Test all CRUD operations
   - Test real-time subscriptions
   - Test authentication flows

3. **User Acceptance Testing**
   - Test all user roles
   - Test booking flow
   - Test payment collection
   - Test notifications

---

## SQL Schema Creation Script

```sql
-- ============================================================================
-- Water Tanker App - Supabase Database Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: users (Base user table - one row per person)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Temporary, will migrate to Supabase Auth
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- Table: user_roles (Junction table for multi-role support)
-- ============================================================================
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Indexes for user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- Table: customers (Customer-specific data)
-- ============================================================================
CREATE TABLE customers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  saved_addresses JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for customers
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- ============================================================================
-- Table: drivers (Driver-specific data)
-- ============================================================================
CREATE TABLE drivers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  driver_license_image_url TEXT NOT NULL,
  vehicle_registration_image_url TEXT NOT NULL,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  created_by_admin BOOLEAN NOT NULL DEFAULT false,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for drivers
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_vehicle_number ON drivers(vehicle_number);

-- ============================================================================
-- Table: admins (Admin-specific data)
-- ============================================================================
CREATE TABLE admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for admins
CREATE INDEX idx_admins_user_id ON admins(user_id);

-- ============================================================================
-- Table: bookings
-- ============================================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  agency_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_name TEXT,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled')),
  tanker_size INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  base_price NUMERIC(10,2) NOT NULL,
  distance_charge NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  delivery_address JSONB NOT NULL,
  distance NUMERIC(8,2) NOT NULL,
  scheduled_for TIMESTAMPTZ,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_id TEXT,
  cancellation_reason TEXT,
  can_cancel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Indexes for bookings
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_agency_id ON bookings(agency_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_pending ON bookings(status, created_at) WHERE status = 'pending';

-- ============================================================================
-- Table: vehicles
-- ============================================================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  insurance_company_name TEXT NOT NULL,
  insurance_expiry_date DATE NOT NULL,
  vehicle_capacity INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, vehicle_number)
);

-- Indexes for vehicles
CREATE INDEX idx_vehicles_agency_id ON vehicles(agency_id);
CREATE INDEX idx_vehicles_vehicle_number ON vehicles(vehicle_number);

-- ============================================================================
-- Table: tanker_sizes
-- ============================================================================
CREATE TABLE tanker_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size INTEGER UNIQUE NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for tanker_sizes
CREATE INDEX idx_tanker_sizes_active ON tanker_sizes(is_active, size) WHERE is_active = true;

-- ============================================================================
-- Table: pricing
-- ============================================================================
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_km NUMERIC(8,2) NOT NULL,
  minimum_charge NUMERIC(8,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Constraint to ensure only one pricing row exists
CREATE UNIQUE INDEX idx_pricing_singleton ON pricing((1));

-- ============================================================================
-- Table: driver_applications
-- ============================================================================
CREATE TABLE driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_number TEXT NOT NULL,
  license_number TEXT NOT NULL,
  driver_license_image_url TEXT NOT NULL,
  vehicle_registration_image_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Indexes for driver_applications
CREATE INDEX idx_driver_applications_status ON driver_applications(status);
CREATE INDEX idx_driver_applications_applied_at ON driver_applications(applied_at DESC);

-- ============================================================================
-- Table: notifications
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'payment', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_related_booking ON notifications(related_booking_id);

-- ============================================================================
-- Table: bank_accounts
-- ============================================================================
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for bank_accounts
CREATE INDEX idx_bank_accounts_admin_id ON bank_accounts(admin_id);
CREATE INDEX idx_bank_accounts_default ON bank_accounts(admin_id, is_default) WHERE is_default = true;

-- ============================================================================
-- Function: update_updated_at_column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers: Auto-update updated_at
-- ============================================================================
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tanker_sizes_updated_at
  BEFORE UPDATE ON tanker_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at
  BEFORE UPDATE ON pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initial Data: Default Tanker Sizes
-- ============================================================================
INSERT INTO tanker_sizes (size, base_price, is_active, display_name) VALUES
  (10000, 600, true, '10000 Liters'),
  (15000, 900, true, '15000 Liters');

-- ============================================================================
-- Initial Data: Default Pricing
-- ============================================================================
-- Note: This requires an admin user to exist first
-- Run this after creating your first admin user
-- INSERT INTO pricing (price_per_km, minimum_charge, updated_by)
-- VALUES (5, 50, 'admin-user-id-here');

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all user roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Customers policies
CREATE POLICY "Customers can view their own customer data"
  ON customers FOR SELECT
  USING (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Customers can update their own customer data"
  ON customers FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Drivers policies
CREATE POLICY "Drivers can view their own driver data"
  ON drivers FOR SELECT
  USING (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Drivers can update their own driver data"
  ON drivers FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all driver data"
  ON drivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update driver data"
  ON drivers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Admins policies
CREATE POLICY "Admins can view their own admin data"
  ON admins FOR SELECT
  USING (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update their own admin data"
  ON admins FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Bookings policies
CREATE POLICY "Customers can view their own bookings"
  ON bookings FOR SELECT
  USING (
    customer_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role IN ('admin', 'driver')
    )
  );

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    customer_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'customer'
    )
  );

CREATE POLICY "Customers can update their own bookings"
  ON bookings FOR UPDATE
  USING (customer_id::text = auth.uid()::text);

CREATE POLICY "Drivers can update assigned bookings"
  ON bookings FOR UPDATE
  USING (
    driver_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Vehicles policies
CREATE POLICY "Agencies can manage their own vehicles"
  ON vehicles FOR ALL
  USING (
    agency_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Tanker sizes policies (read-only for all, write for admins)
CREATE POLICY "Everyone can view active tanker sizes"
  ON tanker_sizes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tanker sizes"
  ON tanker_sizes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Pricing policies
CREATE POLICY "Everyone can view pricing"
  ON pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can update pricing"
  ON pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Driver applications policies
CREATE POLICY "Anyone can create driver applications"
  ON driver_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all applications"
  ON driver_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON driver_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Bank accounts policies
CREATE POLICY "Admins can view their own bank accounts"
  ON bank_accounts FOR SELECT
  USING (
    admin_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create their own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (
    admin_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update their own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (
    admin_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their own bank accounts"
  ON bank_accounts FOR DELETE
  USING (
    admin_id::text = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );
```

---

## Query Examples for Multi-Role Schema

### Get User with All Roles
```sql
SELECT 
  u.*,
  array_agg(ur.role) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com'
GROUP BY u.id;
```

### Login: Check if User Has Specific Role
```sql
SELECT u.*, ur.role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com' 
  AND ur.role = 'customer';
```

### Get Customer Data for User
```sql
SELECT u.*, c.saved_addresses
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.role = 'customer'
JOIN customers c ON u.id = c.user_id
WHERE u.id = $1;
```

### Get Driver Data
```sql
SELECT u.*, d.*
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.role = 'driver'
JOIN drivers d ON u.id = d.user_id;
```

### Get All Roles for Current User (for role selection)
```sql
SELECT role
FROM user_roles
WHERE user_id = $1
ORDER BY created_at;
```

### Create Multi-Role User
```sql
-- 1. Create base user
INSERT INTO users (email, password_hash, name, phone)
VALUES ('user@example.com', 'hashed_password', 'John Doe', '1234567890')
RETURNING id;

-- 2. Add roles
INSERT INTO user_roles (user_id, role) VALUES
  (user_id, 'customer'),
  (user_id, 'admin');

-- 3. Create role-specific entries
INSERT INTO customers (user_id, saved_addresses) 
VALUES (user_id, '[]'::jsonb);

INSERT INTO admins (user_id, business_name) 
VALUES (user_id, 'My Business');
```

---

## Row Level Security (RLS) Policies Summary

### Users Table
- Users can view and update their own profile
- Admins can view all users

### User Roles Table
- Users can view their own roles
- Admins can view all user roles

### Customers Table
- Customers can view and update their own customer data
- Admins can view all customer data

### Drivers Table
- Drivers can view and update their own driver data
- Admins can view and update all driver data

### Admins Table
- Admins can view and update their own admin data
- Admins can view all admin data

### Bookings Table
- Customers can view, create, and update their own bookings
- Drivers can view and update assigned bookings
- Admins can view and update all bookings

### Vehicles Table
- Agencies (admins) can manage their own vehicles
- Admins can manage all vehicles

### Tanker Sizes Table
- Everyone can view active sizes
- Only admins can create/update/delete sizes

### Pricing Table
- Everyone can view pricing
- Only admins can update pricing

### Driver Applications Table
- Anyone can create applications
- Only admins can view and update applications

### Notifications Table
- Users can view and update their own notifications
- System can create notifications for any user

### Bank Accounts Table
- Admins can view, create, update, and delete their own bank accounts
- Only admins can manage bank accounts
- Each admin can have multiple bank accounts, but only one can be marked as default

---

## Data Migration Strategy

### Step 1: Export Local Data

Create a migration script (`scripts/migrate-to-supabase.ts`):

```typescript
// Pseudo-code structure
1. Read all data from AsyncStorage
2. Convert Date objects to ISO strings
3. Handle nested JSON (addresses)
4. Map old `uid` to new `id` (UUID)
5. Group users by email (for multi-role consolidation)
6. Export to JSON file
```

### Step 2: Data Transformation

**Important**: Your current implementation stores separate user records for each role (same email, different `uid`). The new schema consolidates these into one user with multiple roles.

**Transformation Steps**:
- Group users by email address
- For each unique email:
  - Create ONE `users` row with common data (email, name, phone, etc.)
  - Create multiple `user_roles` rows (one per role)
  - Create role-specific table entries (`customers`, `drivers`, `admins`) based on roles
- Convert `uid` (string) → `id` (UUID) and maintain mapping
- Convert `Date` objects → ISO strings
- Handle nested JSON (addresses in `customers` table)
- Map old user IDs to new user IDs for foreign keys in `bookings`, `vehicles`, etc.

**Example Transformation**:
```
Old (AsyncStorage):
- User 1: email="john@example.com", role="customer", uid="abc-123"
- User 2: email="john@example.com", role="admin", uid="def-456"

New (Supabase):
- users: { id="new-uuid-1", email="john@example.com", name="John", ... }
- user_roles: 
  - { user_id="new-uuid-1", role="customer" }
  - { user_id="new-uuid-1", role="admin" }
- customers: { user_id="new-uuid-1", saved_addresses=[...] }
- admins: { user_id="new-uuid-1", business_name="..." }
```

### Step 3: Import to Supabase

**Order of Operations**:
1. Insert users (base table) - one per unique email
2. Insert user_roles (junction table) - multiple per user if multi-role
3. Insert customers (role-specific data)
4. Insert drivers (role-specific data)
5. Insert admins (role-specific data)
6. Insert bookings (with updated foreign key references)
7. Insert vehicles (with updated foreign key references)
8. Insert configuration data (tanker sizes, pricing)
9. Insert notifications (with updated user references)

### Step 4: Verify Data Integrity

- Check foreign key relationships
- Verify multi-role users have correct entries in `user_roles` and role-specific tables
- Verify date conversions
- Test queries match expected results
- Compare record counts:
  - Old: N user records (may have duplicates by email)
  - New: M unique users (M ≤ N), with N role entries in `user_roles`
- Test login flow with multi-role users

---

## Authentication Migration

### Current State
- Email + password stored in `users` table (separate records per role)
- Password hashed locally
- Session stored in AsyncStorage
- Multi-role users have separate user records (same email, different `uid`)

### Target State
- Use Supabase Auth for authentication
- Email + password managed by Supabase (one auth user per email)
- Session managed by Supabase client
- Multi-role support via `user_roles` junction table

### Migration Steps

1. **Enable Supabase Auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates

2. **Migrate Existing Users**
   - Group users by email (consolidate multi-role users)
   - For each unique email:
     - Create ONE user in Supabase Auth using `auth.admin.createUser()`
     - Set password using `auth.admin.updateUserById()` (use password from any role record)
     - Create ONE `users` table record
     - Create `user_roles` entries for each role the user has
     - Create role-specific table entries (`customers`, `drivers`, `admins`)

3. **Update Auth Service**
   - Replace local auth with Supabase Auth methods:
     - `signInWithPassword(email, password, preferredRole?)` - authenticates user with optional preferred role
     - If `preferredRole` is provided, login directly with that role (even if user has multiple roles)
     - If `preferredRole` is not provided and user has multiple roles, return error asking to select role first
     - `loginWithRole()` - selects specific role context (used when preferredRole is provided)
     - `signUp()` - creates user and role entry
     - `signOut()` - clears session
     - `getSession()` - gets current session

4. **Update Login Flow**
   - User selects role from RoleEntryScreen before login
   - RoleEntryScreen navigates to Login with `preferredRole` parameter
   - Login screen uses `preferredRole` directly - no role selection screen after login
   - Even if user has multiple roles with same credentials, only the selected role is used
   - Store selected role in session/context

5. **Remove Password Hash Column**
   - After migration complete, remove `password_hash` from `users` table
   - Users will authenticate via Supabase Auth only

---

## Implementation Details Addendum (Gaps Filled)

### Required Data Access Interfaces
All methods below must be implemented in `SupabaseDataAccess` to keep parity with the current `IDataAccessLayer`:
- `IUserDataAccess`: getCurrentUser, saveUser, removeUser, getUserById, getUsers, saveUserToCollection, updateUserProfile, subscribeToUserUpdates, subscribeToAllUsersUpdates
- `IBookingDataAccess`: saveBooking, updateBooking, getBookings, getBookingById, getBookingsByCustomer, getBookingsByDriver, getAvailableBookings, subscribeToBookingUpdates
- `IVehicleDataAccess`: saveVehicle, updateVehicle, getVehicles, getVehicleById, deleteVehicle, getVehiclesByAgency, subscribeToVehicleUpdates, subscribeToAgencyVehiclesUpdates
- `IDataAccessLayer`: users, bookings, vehicles, generateId, initialize

### TypeScript ↔ Database Mapping (multi-role)
- `User` discriminated union (`CustomerUser | DriverUser | AdminUser`) maps to:
  - `users` (base fields: id, email, name, phone, created_at, updated_at)
  - `user_roles` (one row per role)
  - Role tables: `customers`, `drivers`, `admins` for role-specific fields
- `role` in app state is derived from `user_roles`, not stored on `users`
- Mapping example (read): fetch `users` + `user_roles` + role table for chosen role, then assemble the union type
- Mapping example (write): insert/update base row in `users`, insert roles in `user_roles`, insert/update role table as needed

### Supabase Client Setup (Expo)
Create `src/lib/supabaseClient.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Environment Variables
Add to `.env` (and surface via app.config.js if needed):
- `EXPO_PUBLIC_SUPABASE_URL=...`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=...`
- Optional (server-side scripts only): `SUPABASE_SERVICE_ROLE_KEY=...`

### Real-time Subscription Patterns
- Bookings: subscribe to `bookings` table for `INSERT` and `UPDATE`; filter by `customer_id`, `driver_id`, or `agency_id` for scoped updates.
- Roles: subscribe to `user_roles` for `INSERT`/`DELETE` where `user_id = auth.uid()` to detect role changes.
- Notifications: subscribe to `notifications` for `INSERT` where `user_id = auth.uid()`.
- Channel naming: `realtime:bookings:<user_id>`, `realtime:user_roles:<user_id>`, `realtime:notifications:<user_id>`.

### Date Serialization
- Outgoing (TS → DB): convert `Date` to ISO string (UTC) for all TIMESTAMPTZ columns.
- Incoming (DB → TS): parse to `Date` objects in the data access layer before returning to the app.
- Ensure consistent timezone handling (store UTC, display local in UI).

### Storage Buckets (RLS examples)
Policies to add per bucket:
- `profile-images` (public read): allow `SELECT` for all; `INSERT/UPDATE/DELETE` only when `auth.uid() = owner_id` or admin.
- `driver-documents` (private): allow `SELECT/INSERT/UPDATE/DELETE` when `auth.uid() = owner_id` or admin.
- `vehicle-documents` (private): allow `SELECT/INSERT/UPDATE/DELETE` when `auth.uid() = owner_id` or admin.

### Error Handling Pattern
- Map Supabase errors to existing error types (e.g., `DataAccessError`).
- Handle network errors and RLS policy violations explicitly.
- Include context: operation name, table, userId/role where applicable.

### Additional Multi-Role Query Examples
- Get user with roles and role data for a selected role:
```sql
SELECT u.*, ur.role, c.*, d.*, a.*
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN customers c ON c.user_id = u.id AND ur.role = 'customer'
LEFT JOIN drivers d ON d.user_id = u.id AND ur.role = 'driver'
LEFT JOIN admins a ON a.user_id = u.id AND ur.role = 'admin'
WHERE u.id = $1 AND ur.role = $2;
```
- Check role existence quickly:
```sql
SELECT 1 FROM user_roles WHERE user_id = $1 AND role = $2 LIMIT 1;
```

### Data Migration Script Structure (suggested)
- File: `scripts/migrate-to-supabase.ts`
- Key steps:
  1) Read AsyncStorage export
  2) Group users by email; build base `users` + `user_roles` + role tables
  3) Build ID map: old uid → new uuid
  4) Remap foreign keys in bookings, vehicles, notifications, etc.
  5) Serialize dates to ISO; normalize addresses to JSON
  6) Insert in order (users → user_roles → role tables → bookings → vehicles → config → notifications)
  7) Verify counts and FK integrity; log progress

### Supabase Auth Flow (role-aware)
- `signInWithPassword(email, password, preferredRole?)`
  - If `preferredRole` provided, validate role exists in `user_roles` and return session + role context.
  - If multiple roles and none provided, return list of roles; UI should prompt before proceeding.
- Link Auth user to `users` row via `id = auth.user.id`.
- Sessions: use Supabase client session; remove local AsyncStorage session.

### Testing Strategy Additions
- Unit: mock Supabase client; test DAL methods for happy-path/error-path.
- Integration: run against a test Supabase project or local Supabase; verify RLS policies with auth context.
- Realtime: simulate inserts/updates and assert subscription callbacks fire.
- Auth: test multi-role login selection and RLS-guarded queries.

---

## Testing Checklist

### Pre-Migration
- [ ] Supabase project created
- [ ] Credentials saved securely
- [ ] Dependencies installed
- [ ] Environment variables configured

### Schema Creation
- [ ] All tables created
- [ ] All indexes created
- [ ] All foreign keys working
- [ ] Triggers functioning
- [ ] RLS policies applied

### Data Access Layer
- [ ] SupabaseDataAccess class created
- [ ] All interface methods implemented
- [ ] Error handling in place
- [ ] Date serialization working

### Authentication
- [ ] Supabase Auth configured
- [ ] Users can sign up
- [ ] Users can sign in
- [ ] Session management working
- [ ] Multi-role support working (users can have multiple roles in database)
- [ ] RoleEntryScreen allows users to select role before login
- [ ] Login uses selected role directly (no role selection screen after login)
- [ ] Users with multiple roles login with selected role only (even if credentials are same)

### Real-time
- [ ] Realtime enabled on tables
- [ ] Subscriptions working
- [ ] Updates propagate correctly

### Data Migration
- [ ] Local data exported
- [ ] Data transformed correctly
- [ ] Data imported to Supabase
- [ ] Data integrity verified

### Functional Testing
- [ ] Customer can create booking
- [ ] Driver can accept booking
- [ ] Admin can manage users
- [ ] Admin can manage vehicles
- [ ] Admin can manage bank accounts
- [ ] Notifications working
- [ ] Payment collection working

### Performance Testing
- [ ] Queries perform well
- [ ] Indexes being used
- [ ] Real-time updates fast
- [ ] No memory leaks

---

## Rollback Plan

### If Migration Fails

1. **Keep Local Storage Implementation**
   - Don't delete `LocalStorageDataAccess` class
   - Keep it as fallback option

2. **Feature Flag**
   - Add feature flag to switch between storage backends
   - `USE_SUPABASE=true/false` in environment

3. **Gradual Migration**
   - Migrate one feature at a time
   - Test thoroughly before moving to next

4. **Data Backup**
   - Export Supabase data regularly
   - Keep local storage data until migration verified

### Rollback Steps

1. Change feature flag to `USE_SUPABASE=false`
2. App will use `LocalStorageDataAccess`
3. Fix issues in Supabase implementation
4. Re-enable Supabase when ready

---

## Post-Migration Tasks

1. **Remove Local Storage Code** (after verification)
   - Delete `LocalStorageDataAccess` class
   - Remove AsyncStorage dependencies (if not used elsewhere)
   - Clean up unused code

2. **Optimize Queries**
   - Review query performance
   - Add additional indexes if needed
   - Optimize RLS policies

3. **Set Up Monitoring**
   - Monitor Supabase usage
   - Set up alerts for errors
   - Track performance metrics

4. **Documentation**
   - Update README with Supabase setup
   - Document environment variables
   - Create runbook for common issues

---

## Estimated Timeline

- **Phase 1-2**: 2-3 hours (Setup + Schema)
- **Phase 3**: 4-6 hours (Implementation)
- **Phase 4**: 2-3 hours (Authentication)
- **Phase 5**: 2-3 hours (Real-time)
- **Phase 6**: 1-2 hours (Storage, optional)
- **Phase 7**: 2-4 hours (Data Migration)
- **Phase 8**: 4-6 hours (Testing)

**Total**: 17-27 hours

---

## Notes

- **Multi-Role Support**: Users can have multiple roles (e.g., customer + admin) stored in the database via the `user_roles` junction table and separate role-specific tables (`customers`, `drivers`, `admins`). However, the login flow requires users to select a role from RoleEntryScreen before login, and only that selected role is used for the session.
- **Single-Role Login**: Even if a user has multiple roles with the same credentials, they must select a role from RoleEntryScreen first. The login process uses only the selected role - there is no role selection screen after login.
- **Data Consolidation**: During migration, users with the same email but different roles will be consolidated into one `users` row with multiple `user_roles` entries.
- All timestamps use `TIMESTAMPTZ` for timezone support
- JSONB columns used for flexible nested data (addresses)
- Foreign keys ensure data integrity
- RLS policies provide security at database level
- Indexes optimize query performance
- Triggers automate `updated_at` maintenance
- Role-specific tables only contain relevant columns (no nullable fields for unrelated roles)

---

## Support & Resources

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- React Native + Supabase: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

---

*Last Updated: [Current Date]*
*Version: 1.0*

