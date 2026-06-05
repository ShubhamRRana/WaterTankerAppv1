-- Scope driver booking visibility and accept to their agency only

DROP POLICY IF EXISTS bookings_select_drivers ON bookings;
CREATE POLICY bookings_select_drivers ON bookings
  FOR SELECT
  USING (
    (auth.uid() = driver_id)
    OR (
      driver_id IS NULL
      AND status = 'pending'
      AND has_role('driver')
      AND agency_id IS NOT NULL
      AND agency_id = (
        SELECT d.created_by_admin_id
        FROM drivers d
        WHERE d.user_id = auth.uid()
          AND d.created_by_admin = true
      )
    )
  );

DROP POLICY IF EXISTS bookings_update_drivers ON bookings;
CREATE POLICY bookings_update_drivers ON bookings
  FOR UPDATE
  USING (
    has_role('driver')
    AND (
      auth.uid() = driver_id
      OR (
        driver_id IS NULL
        AND status = 'pending'
        AND agency_id IS NOT NULL
        AND agency_id = (
          SELECT d.created_by_admin_id
          FROM drivers d
          WHERE d.user_id = auth.uid()
            AND d.created_by_admin = true
        )
      )
    )
  )
  WITH CHECK (
    has_role('driver')
    AND (
      auth.uid() = driver_id
      OR (
        driver_id IS NULL
        AND status = 'pending'
        AND agency_id IS NOT NULL
        AND agency_id = (
          SELECT d.created_by_admin_id
          FROM drivers d
          WHERE d.user_id = auth.uid()
            AND d.created_by_admin = true
        )
      )
    )
  );
