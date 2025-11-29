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

### Table 1: `users`

**Purpose**: Store all user accounts (customers, drivers, admins) with role-specific attributes.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Unique user identifier (replaces `uid`) |
| `email` | `text` | UNIQUE, NOT NULL | Primary identifier for authentication |
| `password_hash` | `text` | NOT NULL | Hashed password (temporary, will use Supabase Auth) |
| `name` | `text` | NOT NULL | User's full name |
| `phone` | `text` | NULLABLE | Contact phone number (optional) |
| `profile_image_url` | `text` | NULLABLE | URL to profile image |
| `role` | `text` | NOT NULL, CHECK (`role` IN ('customer', 'driver', 'admin')) | User role type |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Account creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Role-Specific Columns** (nullable, populated based on role):

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `saved_addresses` | `jsonb` | NULLABLE | Array of saved addresses (for customers) |
| `vehicle_number` | `text` | NULLABLE | Vehicle registration number (for drivers) |
| `license_number` | `text` | NULLABLE | Driver license number (for drivers) |
| `license_expiry` | `date` | NULLABLE | License expiration date (for drivers) |
| `driver_license_image_url` | `text` | NULLABLE | URL to license image (for drivers) |
| `vehicle_registration_image_url` | `text` | NULLABLE | URL to registration image (for drivers) |
| `is_approved` | `boolean` | NULLABLE, DEFAULT `false` | Driver approval status (for drivers) |
| `is_available` | `boolean` | NULLABLE, DEFAULT `false` | Driver availability status (for drivers) |
| `total_earnings` | `numeric(10,2)` | NULLABLE, DEFAULT `0` | Total earnings in INR (for drivers) |
| `completed_orders` | `integer` | NULLABLE, DEFAULT `0` | Number of completed orders (for drivers) |
| `created_by_admin` | `boolean` | NULLABLE, DEFAULT `false` | Whether driver was created by admin |
| `emergency_contact_name` | `text` | NULLABLE | Emergency contact name (for drivers) |
| `emergency_contact_phone` | `text` | NULLABLE | Emergency contact phone (for drivers) |
| `business_name` | `text` | NULLABLE | Business/agency name (for admins) |

**Indexes**:
- `idx_users_email` on `email` (for fast lookups)
- `idx_users_role` on `role` (for filtering by role)
- `idx_users_driver_approved` on `(role, is_approved)` WHERE `role = 'driver'` (for finding available drivers)

**Notes**:
- `saved_addresses` will store JSON array: `[{"id": "...", "street": "...", "city": "...", ...}]`
- All dates stored as `timestamptz` for timezone support
- `password_hash` is temporary - will migrate to Supabase Auth later

---

### Table 2: `bookings`

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
| `is_immediate` | `boolean` | NOT NULL, DEFAULT `false` | Whether booking is immediate |
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
- `delivery_address` stores JSON: `{"id": "...", "street": "...", "city": "...", "state": "...", "pincode": "...", "landmark": "...", "latitude": 0.0, "longitude": 0.0, "isDefault": false}`
- Foreign keys have `ON DELETE SET NULL` for optional relationships
- Foreign key on `customer_id` has `ON DELETE CASCADE` (if customer deleted, bookings deleted)

---

### Table 3: `vehicles`

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

### Table 4: `tanker_sizes`

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

### Table 5: `pricing`

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

### Table 6: `driver_applications`

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

### Table 7: `notifications`

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
   - Enable replication for: `bookings`, `notifications`, `users`

2. **Update SubscriptionManager**
   - File: `src/utils/subscriptionManager.ts`
   - Replace local subscriptions with Supabase Realtime channels

3. **Test Real-time Updates**
   - Verify bookings update in real-time
   - Verify notifications appear instantly

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
-- Table: users
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Temporary, will migrate to Supabase Auth
  name TEXT NOT NULL,
  phone TEXT,
  profile_image_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Customer-specific fields
  saved_addresses JSONB,
  
  -- Driver-specific fields
  vehicle_number TEXT,
  license_number TEXT,
  license_expiry DATE,
  driver_license_image_url TEXT,
  vehicle_registration_image_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT false,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  created_by_admin BOOLEAN DEFAULT false,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Admin-specific fields
  business_name TEXT
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_driver_approved ON users(role, is_approved) WHERE role = 'driver';

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
  is_immediate BOOLEAN NOT NULL DEFAULT false,
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
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Bookings policies
CREATE POLICY "Customers can view their own bookings"
  ON bookings FOR SELECT
  USING (
    customer_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role IN ('admin', 'driver')
    )
  );

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (customer_id::text = auth.uid()::text);

CREATE POLICY "Customers can update their own bookings"
  ON bookings FOR UPDATE
  USING (customer_id::text = auth.uid()::text);

CREATE POLICY "Drivers can update assigned bookings"
  ON bookings FOR UPDATE
  USING (
    driver_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Vehicles policies
CREATE POLICY "Agencies can manage their own vehicles"
  ON vehicles FOR ALL
  USING (
    agency_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
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
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
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
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
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
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON driver_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
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
```

---

## Row Level Security (RLS) Policies Summary

### Users Table
- Users can view and update their own profile
- Admins can view all users
- Drivers can view customer profiles (for bookings)

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
5. Export to JSON file
```

### Step 2: Data Transformation

- Convert `uid` (string) → `id` (UUID)
- Convert `Date` objects → ISO strings
- Flatten nested objects where needed
- Handle role-specific fields

### Step 3: Import to Supabase

- Insert users first (to establish foreign keys)
- Insert bookings (with proper foreign key references)
- Insert vehicles
- Insert configuration data (tanker sizes, pricing)
- Insert notifications

### Step 4: Verify Data Integrity

- Check foreign key relationships
- Verify date conversions
- Test queries match expected results
- Compare record counts

---

## Authentication Migration

### Current State
- Email + password stored in `users` table
- Password hashed locally
- Session stored in AsyncStorage

### Target State
- Use Supabase Auth for authentication
- Email + password managed by Supabase
- Session managed by Supabase client

### Migration Steps

1. **Enable Supabase Auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates

2. **Migrate Existing Users**
   - For each user in local storage:
     - Create user in Supabase Auth using `auth.admin.createUser()`
     - Set password using `auth.admin.updateUserById()`
     - Link to `users` table record

3. **Update Auth Service**
   - Replace local auth with Supabase Auth methods:
     - `signInWithPassword()`
     - `signUp()`
     - `signOut()`
     - `getSession()`

4. **Remove Password Hash Column**
   - After migration complete, remove `password_hash` from `users` table
   - Users will authenticate via Supabase Auth only

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
- [ ] Multi-role support working

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

- All timestamps use `TIMESTAMPTZ` for timezone support
- JSONB columns used for flexible nested data (addresses)
- Foreign keys ensure data integrity
- RLS policies provide security at database level
- Indexes optimize query performance
- Triggers automate `updated_at` maintenance

---

## Support & Resources

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- React Native + Supabase: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

---

*Last Updated: [Current Date]*
*Version: 1.0*

