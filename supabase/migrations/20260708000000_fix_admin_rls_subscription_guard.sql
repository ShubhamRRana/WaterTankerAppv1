-- Corrective migration: ensure admin mutation RLS policies with subscription guard
-- exist unconditionally. The prior migration (20260707120000) used IF EXISTS guards
-- that silently skipped policy creation on fresh databases. This migration is
-- idempotent and safe to run on both affected and unaffected databases.

DROP POLICY IF EXISTS bookings_insert_admin ON bookings;
CREATE POLICY bookings_insert_admin ON bookings
  FOR INSERT
  WITH CHECK (
    has_active_subscription(auth.uid())
    AND agency_id = auth.uid()
  );

DROP POLICY IF EXISTS bookings_update_admin ON bookings;
CREATE POLICY bookings_update_admin ON bookings
  FOR UPDATE
  USING (has_active_subscription(auth.uid()) AND agency_id = auth.uid())
  WITH CHECK (has_active_subscription(auth.uid()) AND agency_id = auth.uid());

DROP POLICY IF EXISTS drivers_insert_admin ON drivers;
CREATE POLICY drivers_insert_admin ON drivers
  FOR INSERT
  WITH CHECK (
    has_active_subscription(auth.uid())
    AND created_by_admin_id = auth.uid()
  );

DROP POLICY IF EXISTS drivers_update_admin ON drivers;
CREATE POLICY drivers_update_admin ON drivers
  FOR UPDATE
  USING (has_active_subscription(auth.uid()) AND created_by_admin_id = auth.uid())
  WITH CHECK (has_active_subscription(auth.uid()) AND created_by_admin_id = auth.uid());

DROP POLICY IF EXISTS vehicles_insert_admin ON vehicles;
CREATE POLICY vehicles_insert_admin ON vehicles
  FOR INSERT
  WITH CHECK (
    has_active_subscription(auth.uid())
    AND agency_id = auth.uid()
  );

DROP POLICY IF EXISTS vehicles_update_admin ON vehicles;
CREATE POLICY vehicles_update_admin ON vehicles
  FOR UPDATE
  USING (has_active_subscription(auth.uid()) AND agency_id = auth.uid())
  WITH CHECK (has_active_subscription(auth.uid()) AND agency_id = auth.uid());

DROP POLICY IF EXISTS vehicles_delete_admin ON vehicles;
CREATE POLICY vehicles_delete_admin ON vehicles
  FOR DELETE
  USING (has_active_subscription(auth.uid()) AND agency_id = auth.uid());
