# Database Schema Summary

## Overview

This document summarizes the database schema created for the Water Tanker Booking App Supabase migration.

## Files Created

1. **`001_initial_schema.sql`** - Creates all database tables, indexes, and triggers
2. **`002_row_level_security.sql`** - Implements RLS policies for security
3. **`DATABASE_SETUP.md`** - Setup instructions and troubleshooting guide

## Database Tables

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User profiles (customers, drivers, admins) | Linked to Supabase Auth, role-based fields |
| `addresses` | Saved customer addresses | One default per user, location coordinates |
| `bookings` | Delivery orders | Links customers, drivers, agencies, JSONB address |
| `vehicles` | Agency vehicles | Managed by admin users |
| `tanker_sizes` | Configurable tanker options | Base pricing, active/inactive status |
| `pricing` | Global pricing config | Single row, distance-based pricing |
| `driver_applications` | Driver registration requests | Approval workflow |
| `notifications` | In-app notifications | User-specific, linked to bookings |

## Key Features

### 1. Type Safety
- Custom ENUMs for status values (booking_status, payment_status, user_role, etc.)
- Ensures data consistency at the database level

### 2. Relationships
- Foreign keys with appropriate CASCADE/SET NULL actions
- Links users to Supabase Auth via `auth_id`
- Proper referential integrity

### 3. Performance
- Indexes on frequently queried columns
- Partial indexes for filtered queries (e.g., active drivers, pending bookings)
- Composite indexes for multi-column queries

### 4. Data Integrity
- Triggers for automatic `updated_at` timestamps
- Trigger to ensure single default address per user
- Unique constraints where appropriate
- Single-row constraint for pricing table

### 5. Security (RLS)
- Row Level Security enabled on all tables
- Role-based access policies
- Users can only access their own data
- Admins have full access
- Drivers can see available bookings

## Helper Functions

Created in `002_row_level_security.sql`:

- `auth.user_id()` - Get current authenticated user ID
- `public.get_user_role()` - Get current user's role
- `public.is_admin()` - Check if user is admin
- `public.is_driver()` - Check if user is driver
- `public.is_customer()` - Check if user is customer
- `public.get_user_id()` - Get user record ID (from users table)

## Default Data

### Pricing
- `price_per_km`: ₹5.00
- `minimum_charge`: ₹50.00

### Tanker Sizes
- 1000 Liters - ₹200.00
- 2000 Liters - ₹350.00
- 3000 Liters - ₹500.00
- 5000 Liters - ₹750.00

## Access Patterns

### Customers
- ✅ Read/update own profile
- ✅ Create and manage own bookings
- ✅ Manage own addresses
- ✅ Read driver profiles (for booking context)
- ✅ Read own notifications

### Drivers
- ✅ Read/update own profile
- ✅ View available bookings (pending status)
- ✅ Accept and manage assigned bookings
- ✅ Read customer profiles (for booking context)
- ✅ Read own notifications

### Admins
- ✅ Full access to all users
- ✅ Manage all bookings
- ✅ Manage vehicles for their agency
- ✅ Manage tanker sizes and pricing
- ✅ Approve/reject driver applications
- ✅ Read all notifications

## Indexes Summary

### Users Table
- `auth_id` (unique)
- `role`
- `phone` (unique)
- Partial: Available drivers
- Partial: Approved drivers

### Addresses Table
- `user_id`
- Partial: Default addresses
- `latitude` and `longitude` (for location queries)

### Bookings Table
- `customer_id`
- `driver_id`
- `agency_id`
- `status`
- `payment_status`
- `created_at` (DESC)
- `scheduled_for`
- Partial: Available bookings
- Partial: Driver active bookings

### Other Tables
- Appropriate indexes on foreign keys
- Indexes on status fields for filtering
- Indexes on timestamps for sorting

## Next Steps

After running the migrations:

1. ✅ Verify all tables are created
2. ✅ Verify RLS is enabled
3. ✅ Test helper functions
4. ✅ Verify default data is inserted
5. ⏭️ Update application code to use Supabase
6. ⏭️ Migrate existing data (if any)
7. ⏭️ Test authentication flow
8. ⏭️ Test booking creation and management

## Notes

- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- UUIDs used for all primary keys
- JSONB used for flexible address storage in bookings
- Decimal types used for monetary values (precision: 10, scale: 2)
- Boolean defaults set appropriately for each field

## Migration Order

**Important:** Run migrations in this order:

1. `001_initial_schema.sql` - Creates structure
2. `002_row_level_security.sql` - Adds security policies

Do not skip steps or run out of order, as RLS policies depend on the tables existing.

