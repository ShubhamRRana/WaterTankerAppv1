-- Payment completion rows per society customer and calendar month (period_key e.g. m:2026-3).
-- Customer app upserts when marking "Payment complete"; admin app reads for Trip details indicators.

CREATE TABLE IF NOT EXISTS public.society_payment_periods_completed (
  customer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_key text NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (customer_id, period_key)
);

CREATE INDEX IF NOT EXISTS society_payment_periods_completed_period_key_idx
  ON public.society_payment_periods_completed (period_key);

ALTER TABLE public.society_payment_periods_completed ENABLE ROW LEVEL SECURITY;

-- Society customers: read and write own rows (if not already defined elsewhere)
DROP POLICY IF EXISTS "society_payment_periods_completed_select_own" ON public.society_payment_periods_completed;
CREATE POLICY "society_payment_periods_completed_select_own"
  ON public.society_payment_periods_completed
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "society_payment_periods_completed_insert_own" ON public.society_payment_periods_completed;
CREATE POLICY "society_payment_periods_completed_insert_own"
  ON public.society_payment_periods_completed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "society_payment_periods_completed_update_own" ON public.society_payment_periods_completed;
CREATE POLICY "society_payment_periods_completed_update_own"
  ON public.society_payment_periods_completed
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Admin app: read all completion rows (Trip details per-user payment indicator)
DROP POLICY IF EXISTS "society_payment_periods_completed_select_admin" ON public.society_payment_periods_completed;
CREATE POLICY "society_payment_periods_completed_select_admin"
  ON public.society_payment_periods_completed
  FOR SELECT
  TO authenticated
  USING (has_role('admin'));

COMMENT ON TABLE public.society_payment_periods_completed IS 'Monthly payment-settled flags for society users; period_key matches admin UI m:year-monthIndex0.';
