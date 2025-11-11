-- ============================================================================
-- Driver Locations Table Migration
-- ============================================================================
-- Creates table for real-time driver location tracking during active bookings
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Driver Locations Table
-- ----------------------------------------------------------------------------
-- Stores real-time location updates for drivers during active bookings
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2), -- Location accuracy in meters
  heading DECIMAL(5, 2), -- Direction of travel in degrees (0-360)
  speed DECIMAL(6, 2), -- Speed in meters per second
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one location record per driver per booking
  UNIQUE(driver_id, booking_id)
);

-- Indexes for driver_locations table
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_booking_id ON driver_locations(booking_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_driver_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_locations_updated_at
  BEFORE UPDATE ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_locations_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers can view and update their own locations
CREATE POLICY "Drivers can view own locations"
  ON driver_locations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = driver_locations.driver_id
    )
  );

CREATE POLICY "Drivers can update own locations"
  ON driver_locations
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = driver_locations.driver_id
    )
  );

CREATE POLICY "Drivers can insert own locations"
  ON driver_locations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = driver_locations.driver_id
    )
  );

-- Customers can view driver locations for their bookings
CREATE POLICY "Customers can view driver locations for their bookings"
  ON driver_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = driver_locations.booking_id
      AND bookings.customer_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Admins can view all driver locations
CREATE POLICY "Admins can view all driver locations"
  ON driver_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Comments
-- ----------------------------------------------------------------------------
COMMENT ON TABLE driver_locations IS 'Real-time location tracking for drivers during active bookings';
COMMENT ON COLUMN driver_locations.driver_id IS 'Reference to the driver user';
COMMENT ON COLUMN driver_locations.booking_id IS 'Reference to the active booking (nullable for general tracking)';
COMMENT ON COLUMN driver_locations.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN driver_locations.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN driver_locations.accuracy IS 'Location accuracy in meters';
COMMENT ON COLUMN driver_locations.heading IS 'Direction of travel in degrees (0-360)';
COMMENT ON COLUMN driver_locations.speed IS 'Speed in meters per second';

