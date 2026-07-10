-- Society trip settlement is admin-only.
-- Customers retain SELECT on their own rows; admins SELECT/INSERT/UPDATE the ledger.

DROP POLICY IF EXISTS society_payment_periods_completed_insert_own ON society_payment_periods_completed;
DROP POLICY IF EXISTS society_payment_periods_completed_update_own ON society_payment_periods_completed;

DROP POLICY IF EXISTS society_payment_periods_completed_insert_admin ON society_payment_periods_completed;
CREATE POLICY society_payment_periods_completed_insert_admin
  ON society_payment_periods_completed
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS society_payment_periods_completed_update_admin ON society_payment_periods_completed;
CREATE POLICY society_payment_periods_completed_update_admin
  ON society_payment_periods_completed
  FOR UPDATE
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));
