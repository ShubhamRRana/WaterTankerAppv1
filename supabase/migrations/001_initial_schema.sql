-- ============================================================================
-- Water Tanker Booking App - Initial Database Schema
-- ============================================================================
-- This migration creates all tables, indexes, and basic structure for the app
-- Run this in your Supabase SQL Editor or via Supabase CLI
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: PostGIS extension can be enabled for advanced location-based queries if needed
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'driver', 'admin');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Driver application status
CREATE TYPE driver_application_status AS ENUM ('pending', 'approved', 'rejected');

-- Notification type
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'system');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
-- Stores all users (customers, drivers, admins) with role-based attributes
-- Uses Supabase Auth for authentication, this table stores additional profile data
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth
  role user_role NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  profile_image TEXT,
  
  -- Customer-specific fields (nullable)
  -- saved_addresses handled in separate addresses table
  
  -- Driver-specific fields (nullable)
  vehicle_number TEXT,
  license_number TEXT,
  license_expiry DATE,
  driver_license_image TEXT,
  vehicle_registration_image TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  created_by_admin BOOLEAN DEFAULT false,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Admin-specific fields (nullable)
  business_name TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_driver_available ON users(role, is_available) WHERE role = 'driver' AND is_available = true;
CREATE INDEX idx_users_driver_approved ON users(role, is_approved) WHERE role = 'driver';

-- ----------------------------------------------------------------------------
-- Addresses Table
-- ----------------------------------------------------------------------------
-- Stores saved addresses for customers
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for addresses table
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = true;
-- Location indexes for distance queries (can be enhanced with PostGIS if needed)
CREATE INDEX idx_addresses_latitude ON addresses(latitude);
CREATE INDEX idx_addresses_longitude ON addresses(longitude);

-- Trigger to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE addresses 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_address
BEFORE INSERT OR UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_address();

-- ----------------------------------------------------------------------------
-- Tanker Sizes Table
-- ----------------------------------------------------------------------------
-- Configurable tanker sizes with pricing
CREATE TABLE tanker_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  size INTEGER NOT NULL, -- in liters
  base_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(size)
);

-- Indexes for tanker_sizes table
CREATE INDEX idx_tanker_sizes_active ON tanker_sizes(is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- Pricing Table
-- ----------------------------------------------------------------------------
-- Global pricing configuration (single row, updated over time)
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_per_km DECIMAL(10, 2) NOT NULL,
  minimum_charge DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure only one row exists using a constant value
  singleton INTEGER NOT NULL DEFAULT 1 CHECK (singleton = 1)
);

-- Create a unique constraint to ensure only one pricing row
CREATE UNIQUE INDEX idx_pricing_single_row ON pricing(singleton);

-- ----------------------------------------------------------------------------
-- Vehicles Table
-- ----------------------------------------------------------------------------
-- Vehicles managed by admin agencies
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  insurance_company_name TEXT NOT NULL,
  insurance_expiry_date DATE NOT NULL,
  vehicle_capacity INTEGER NOT NULL, -- in liters
  amount DECIMAL(10, 2) NOT NULL, -- in rupees
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(vehicle_number)
);

-- Indexes for vehicles table
CREATE INDEX idx_vehicles_agency_id ON vehicles(agency_id);
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);

-- ----------------------------------------------------------------------------
-- Bookings Table
-- ----------------------------------------------------------------------------
-- Main booking/order table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Optional agency information
  agency_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_name TEXT,
  
  -- Driver assignment
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_name TEXT,
  driver_phone TEXT,
  
  -- Booking details
  status booking_status NOT NULL DEFAULT 'pending',
  tanker_size INTEGER NOT NULL, -- in liters
  quantity INTEGER DEFAULT 1, -- number of tankers
  base_price DECIMAL(10, 2) NOT NULL,
  distance_charge DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Delivery address (stored as JSONB for flexibility)
  delivery_address JSONB NOT NULL, -- Contains: street, city, state, pincode, landmark, latitude, longitude
  
  distance DECIMAL(10, 2) NOT NULL, -- in km
  scheduled_for TIMESTAMPTZ,
  is_immediate BOOLEAN DEFAULT true,
  
  -- Payment information
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  
  -- Cancellation
  cancellation_reason TEXT,
  can_cancel BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Indexes for bookings table
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_agency_id ON bookings(agency_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_scheduled_for ON bookings(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_bookings_available ON bookings(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_bookings_driver_active ON bookings(driver_id, status) WHERE driver_id IS NOT NULL AND status IN ('accepted', 'in_transit');

-- ----------------------------------------------------------------------------
-- Driver Applications Table
-- ----------------------------------------------------------------------------
-- Driver registration/application requests
CREATE TABLE driver_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_number TEXT NOT NULL,
  license_number TEXT NOT NULL,
  driver_license_image TEXT NOT NULL,
  vehicle_registration_image TEXT NOT NULL,
  status driver_application_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Indexes for driver_applications table
CREATE INDEX idx_driver_applications_status ON driver_applications(status);
CREATE INDEX idx_driver_applications_applied_at ON driver_applications(applied_at DESC);
CREATE INDEX idx_driver_applications_phone ON driver_applications(phone);

-- ----------------------------------------------------------------------------
-- Notifications Table
-- ----------------------------------------------------------------------------
-- In-app notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications table
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_related_booking ON notifications(related_booking_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tanker_sizes_updated_at BEFORE UPDATE ON tanker_sizes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default pricing
INSERT INTO pricing (price_per_km, minimum_charge, updated_by, singleton)
VALUES (5.00, 50.00, NULL, 1)
ON CONFLICT (singleton) DO UPDATE SET
  price_per_km = EXCLUDED.price_per_km,
  minimum_charge = EXCLUDED.minimum_charge,
  updated_at = NOW();

-- Insert default tanker sizes (you can modify these)
INSERT INTO tanker_sizes (size, base_price, display_name, is_active) VALUES
  (1000, 200.00, '1000 Liters', true),
  (2000, 350.00, '2000 Liters', true),
  (3000, 500.00, '3000 Liters', true),
  (5000, 750.00, '5000 Liters', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'Stores all user profiles (customers, drivers, admins) linked to Supabase Auth';
COMMENT ON TABLE addresses IS 'Saved delivery addresses for customers';
COMMENT ON TABLE tanker_sizes IS 'Configurable tanker sizes with base pricing';
COMMENT ON TABLE pricing IS 'Global pricing configuration (distance charges, minimum charges)';
COMMENT ON TABLE vehicles IS 'Vehicles managed by admin agencies';
COMMENT ON TABLE bookings IS 'Water tanker delivery orders/bookings';
COMMENT ON TABLE driver_applications IS 'Driver registration/application requests';
COMMENT ON TABLE notifications IS 'In-app notifications for users';

COMMENT ON COLUMN users.auth_id IS 'Links to Supabase Auth users table';
COMMENT ON COLUMN bookings.delivery_address IS 'JSONB object containing: street, city, state, pincode, landmark, latitude, longitude';
COMMENT ON COLUMN bookings.can_cancel IS 'False once driver accepts the booking';

