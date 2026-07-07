-- Subscription hard-lock: enforce agency subscription on driver booking access and admin mutations

-- Strict driver lock: block reads and writes when agency subscription is inactive
DROP POLICY IF EXISTS bookings_select_drivers ON bookings;
CREATE POLICY bookings_select_drivers ON bookings
  FOR SELECT
  USING (
    get_agency_subscription_status(agency_id)
    AND (
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
    )
  );

DROP POLICY IF EXISTS bookings_update_drivers ON bookings;
CREATE POLICY bookings_update_drivers ON bookings
  FOR UPDATE
  USING (
    get_agency_subscription_status(agency_id)
    AND has_role('driver')
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
    get_agency_subscription_status(agency_id)
    AND has_role('driver')
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

-- Admin operational mutations require active subscription.
-- DROP IF EXISTS + CREATE is unconditional so these policies are always present
-- on both fresh databases and existing ones (avoids the IF EXISTS silent-skip bug).
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

-- Block payout onboarding rows when subscription inactive
DROP POLICY IF EXISTS agency_razorpay_accounts_admin_insert ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_admin_insert ON agency_razorpay_accounts
  FOR INSERT WITH CHECK (
    auth.uid() = agency_id
    AND has_active_subscription(auth.uid())
  );

DROP POLICY IF EXISTS agency_razorpay_accounts_admin_update ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_admin_update ON agency_razorpay_accounts
  FOR UPDATE USING (
    auth.uid() = agency_id
    AND has_active_subscription(auth.uid())
  );
