-- Migration: Allow admins to read drivers they created (Driver Management screen)
-- Purpose: RLS on drivers was blocking SELECT for admins, so the Driver Management
--          screen showed no drivers. Admins must see drivers where created_by_admin_id = auth.uid().
-- Uses: has_role() from migration 004.
-- Date: 2025

-- Allow drivers to read their own row (for driver profile)
DROP POLICY IF EXISTS "Drivers can read own row" ON drivers;
CREATE POLICY "Drivers can read own row"
ON drivers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to read drivers they created (for Driver Management list)
DROP POLICY IF EXISTS "Admins can read drivers they created" ON drivers;
CREATE POLICY "Admins can read drivers they created"
ON drivers
FOR SELECT
TO authenticated
USING (
  has_role('admin')
  AND created_by_admin_id = auth.uid()
);

COMMENT ON POLICY "Admins can read drivers they created" ON drivers IS 'Enables Driver Management screen to show drivers created by the logged-in admin.';
