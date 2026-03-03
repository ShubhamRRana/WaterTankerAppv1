-- Migration: Allow admins to manage (CRUD) their own vehicles
-- Purpose: Fix "Add Vehicle" failing due to RLS on vehicles table
-- Notes:
-- - Admin can only access vehicles where agency_id = auth.uid()
-- - Customers keep read-only access via existing policy (005)

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Admins can read own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can delete own vehicles" ON vehicles;

-- SELECT: admin can read only their vehicles
CREATE POLICY "Admins can read own vehicles"
ON vehicles
FOR SELECT
TO authenticated
USING (
  has_role('admin')
  AND agency_id = auth.uid()
);

-- INSERT: admin can create vehicles only for themselves
CREATE POLICY "Admins can insert own vehicles"
ON vehicles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('admin')
  AND agency_id = auth.uid()
);

-- UPDATE: admin can update only their vehicles and cannot change agency_id
CREATE POLICY "Admins can update own vehicles"
ON vehicles
FOR UPDATE
TO authenticated
USING (
  has_role('admin')
  AND agency_id = auth.uid()
)
WITH CHECK (
  has_role('admin')
  AND agency_id = auth.uid()
);

-- DELETE: admin can delete only their vehicles
CREATE POLICY "Admins can delete own vehicles"
ON vehicles
FOR DELETE
TO authenticated
USING (
  has_role('admin')
  AND agency_id = auth.uid()
);

