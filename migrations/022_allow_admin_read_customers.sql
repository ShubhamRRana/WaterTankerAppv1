-- Migration: Allow admins to read customer rows (Trip Details: saved_addresses / society profile)
-- Purpose: SocietyTripService fetches customers.saved_addresses for society trip cards.
-- Uses: has_role() from migration 004 pattern (same as 020 users read).

DROP POLICY IF EXISTS "Admins can read customers" ON public.customers;
CREATE POLICY "Admins can read customers"
ON public.customers
FOR SELECT
TO authenticated
USING (has_role('admin'));

COMMENT ON POLICY "Admins can read customers" ON public.customers IS 'Admin Trip Details: society customer saved addresses for display.';
