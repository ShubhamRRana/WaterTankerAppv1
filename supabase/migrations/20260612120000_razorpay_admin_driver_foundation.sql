-- Incremental Razorpay schema for WaterTanker admin/driver flows (shared Supabase).
-- Extends customer-app tables; safe to run if objects already exist.

-- Agency Razorpay Route accounts (keyed by agency_id to match customer booking flow)
CREATE TABLE IF NOT EXISTS agency_razorpay_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_account_id VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'created', 'under_review', 'active', 'rejected', 'suspended')),
  rejection_reason TEXT,
  business_name VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  pan VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),
  default_collection_method VARCHAR(20) DEFAULT 'manual_qr'
    CHECK (default_collection_method IN ('razorpay', 'manual_qr')),
  allow_cash_collection BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id)
);

ALTER TABLE agency_razorpay_accounts
  ADD COLUMN IF NOT EXISTS default_collection_method VARCHAR(20) DEFAULT 'manual_qr',
  ADD COLUMN IF NOT EXISTS allow_cash_collection BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Subscription plans: support agency + quarterly durations
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS account_kind VARCHAR(20);

DO $$
BEGIN
  ALTER TABLE subscription_plans
    DROP CONSTRAINT IF EXISTS subscription_plans_duration_months_check;
  ALTER TABLE subscription_plans
    ADD CONSTRAINT subscription_plans_duration_months_check
    CHECK (duration_months IN (1, 3, 6, 12));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Payment transactions (shared ledger)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(30) DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Subscriptions trial fields (may exist from customer app)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- Bookings payment + delivery amount
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivered_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS delivered_tanker_liters INTEGER;

-- Agency subscription plan seeds (idempotent)
INSERT INTO subscription_plans (
  name, description, duration_months, price, currency, features,
  is_active, display_order, account_kind
)
SELECT * FROM (VALUES
  ('Agency Monthly', 'Platform access for agency admins', 1, 999.00, 'INR',
   '["Unlimited bookings","Driver management","Reports"]'::jsonb, true, 10, 'agency'),
  ('Agency Quarterly', 'Platform access — quarterly billing', 3, 2699.00, 'INR',
   '["Unlimited bookings","Driver management","Reports"]'::jsonb, true, 11, 'agency'),
  ('Agency Half-Yearly', 'Platform access — 6 months', 6, 4999.00, 'INR',
   '["Unlimited bookings","Driver management","Reports"]'::jsonb, true, 12, 'agency'),
  ('Agency Yearly', 'Platform access — yearly billing', 12, 8999.00, 'INR',
   '["Unlimited bookings","Driver management","Reports"]'::jsonb, true, 13, 'agency')
) AS v(name, description, duration_months, price, currency, features, is_active, display_order, account_kind)
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans sp
  WHERE sp.account_kind = 'agency' AND sp.duration_months = v.duration_months
);

-- RLS helpers
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND end_date > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION get_agency_subscription_status(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_active_subscription(p_agency_id);
$$;

-- RLS on agency_razorpay_accounts
ALTER TABLE agency_razorpay_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_razorpay_accounts_admin_select ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_admin_select ON agency_razorpay_accounts
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS agency_razorpay_accounts_admin_update ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_admin_update ON agency_razorpay_accounts
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS agency_razorpay_accounts_service_all ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_service_all ON agency_razorpay_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Prevent duplicate pending booking payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_pending_booking
  ON payment_transactions ((metadata->>'booking_id'))
  WHERE status = 'pending' AND metadata->>'booking_id' IS NOT NULL;
