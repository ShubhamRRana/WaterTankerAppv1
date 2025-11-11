-- ============================================================================
-- Water Tanker Booking App - Row Level Security (RLS) Policies
-- ============================================================================
-- This migration enables RLS and creates security policies for all tables
-- Run this AFTER 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user's role from users table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if current user is driver
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'driver'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if current user is customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'customer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get current user's user record ID (not auth ID)
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (is_admin());

-- Admins can update all users (for driver approval, etc.)
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can insert users (for creating drivers)
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (is_admin());

-- Public can insert users (for registration)
CREATE POLICY "Public can register users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Drivers can read customer profiles (for booking details)
CREATE POLICY "Drivers can read customer profiles"
  ON users FOR SELECT
  USING (
    is_driver() AND role = 'customer'
  );

-- Customers can read driver profiles (for booking details)
CREATE POLICY "Customers can read driver profiles"
  ON users FOR SELECT
  USING (
    is_customer() AND role = 'driver'
  );

-- ============================================================================
-- ADDRESSES TABLE POLICIES
-- ============================================================================

-- Users can read their own addresses
CREATE POLICY "Users can read own addresses"
  ON addresses FOR SELECT
  USING (user_id = get_user_id());

-- Users can insert their own addresses
CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (user_id = get_user_id());

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (user_id = get_user_id())
  WITH CHECK (user_id = get_user_id());

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (user_id = get_user_id());

-- ============================================================================
-- TANKER SIZES TABLE POLICIES
-- ============================================================================

-- Everyone can read active tanker sizes
CREATE POLICY "Everyone can read active tanker sizes"
  ON tanker_sizes FOR SELECT
  USING (is_active = true);

-- Admins can read all tanker sizes
CREATE POLICY "Admins can read all tanker sizes"
  ON tanker_sizes FOR SELECT
  USING (is_admin());

-- Admins can insert tanker sizes
CREATE POLICY "Admins can insert tanker sizes"
  ON tanker_sizes FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update tanker sizes
CREATE POLICY "Admins can update tanker sizes"
  ON tanker_sizes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete tanker sizes
CREATE POLICY "Admins can delete tanker sizes"
  ON tanker_sizes FOR DELETE
  USING (is_admin());

-- ============================================================================
-- PRICING TABLE POLICIES
-- ============================================================================

-- Everyone can read pricing
CREATE POLICY "Everyone can read pricing"
  ON pricing FOR SELECT
  USING (true);

-- Only admins can update pricing
CREATE POLICY "Admins can update pricing"
  ON pricing FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can insert pricing (should only be one row)
CREATE POLICY "Admins can insert pricing"
  ON pricing FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================================
-- VEHICLES TABLE POLICIES
-- ============================================================================

-- Admins can read all vehicles
CREATE POLICY "Admins can read all vehicles"
  ON vehicles FOR SELECT
  USING (is_admin());

-- Admins can read their own agency vehicles
CREATE POLICY "Admins can read own agency vehicles"
  ON vehicles FOR SELECT
  USING (agency_id = get_user_id());

-- Admins can insert vehicles for their agency
CREATE POLICY "Admins can insert own agency vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (agency_id = get_user_id() AND is_admin());

-- Admins can update their own agency vehicles
CREATE POLICY "Admins can update own agency vehicles"
  ON vehicles FOR UPDATE
  USING (agency_id = get_user_id() AND is_admin())
  WITH CHECK (agency_id = get_user_id() AND is_admin());

-- Admins can delete their own agency vehicles
CREATE POLICY "Admins can delete own agency vehicles"
  ON vehicles FOR DELETE
  USING (agency_id = get_user_id() AND is_admin());

-- ============================================================================
-- BOOKINGS TABLE POLICIES
-- ============================================================================

-- Customers can read their own bookings
CREATE POLICY "Customers can read own bookings"
  ON bookings FOR SELECT
  USING (customer_id = get_user_id());

-- Customers can create bookings
CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    customer_id = get_user_id() 
    AND is_customer()
  );

-- Customers can update their own pending bookings (cancel, etc.)
CREATE POLICY "Customers can update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    customer_id = get_user_id() 
    AND status = 'pending'
    AND can_cancel = true
  )
  WITH CHECK (customer_id = get_user_id());

-- Drivers can read available bookings (pending status)
CREATE POLICY "Drivers can read available bookings"
  ON bookings FOR SELECT
  USING (
    is_driver() 
    AND status = 'pending'
  );

-- Drivers can read their assigned bookings
CREATE POLICY "Drivers can read assigned bookings"
  ON bookings FOR SELECT
  USING (
    is_driver() 
    AND driver_id = get_user_id()
  );

-- Drivers can update bookings they're assigned to (accept, update status)
CREATE POLICY "Drivers can update assigned bookings"
  ON bookings FOR UPDATE
  USING (
    is_driver() 
    AND driver_id = get_user_id()
  )
  WITH CHECK (driver_id = get_user_id());

-- Drivers can accept bookings (update from pending to accepted)
CREATE POLICY "Drivers can accept bookings"
  ON bookings FOR UPDATE
  USING (
    is_driver() 
    AND status = 'pending'
    AND driver_id IS NULL
  )
  WITH CHECK (
    driver_id = get_user_id() 
    AND status = 'accepted'
  );

-- Admins can read all bookings
CREATE POLICY "Admins can read all bookings"
  ON bookings FOR SELECT
  USING (is_admin());

-- Admins can update all bookings
CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete bookings (for cleanup)
CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE
  USING (is_admin());

-- ============================================================================
-- DRIVER APPLICATIONS TABLE POLICIES
-- ============================================================================

-- Anyone can create driver applications (public registration)
CREATE POLICY "Public can create driver applications"
  ON driver_applications FOR INSERT
  WITH CHECK (true);

-- Applicants can read their own applications
CREATE POLICY "Applicants can read own applications"
  ON driver_applications FOR SELECT
  USING (
    phone IN (
      SELECT phone FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can read all driver applications
CREATE POLICY "Admins can read all driver applications"
  ON driver_applications FOR SELECT
  USING (is_admin());

-- Admins can update driver applications (approve/reject)
CREATE POLICY "Admins can update driver applications"
  ON driver_applications FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = get_user_id());

-- System can create notifications (via service role or admin)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Will be restricted by application logic

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = get_user_id())
  WITH CHECK (user_id = get_user_id());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = get_user_id());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_user_role() IS 'Helper function to get current user role';
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is admin';
COMMENT ON FUNCTION public.is_driver() IS 'Helper function to check if current user is driver';
COMMENT ON FUNCTION public.is_customer() IS 'Helper function to check if current user is customer';
COMMENT ON FUNCTION public.get_user_id() IS 'Helper function to get current user record ID (from users table)';

