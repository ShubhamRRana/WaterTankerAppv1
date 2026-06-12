-- Agency 1-month trial + RLS fixes for Razorpay flows

-- Trial plan (internal, not shown in checkout)
INSERT INTO subscription_plans (
  name, description, duration_months, price, currency, features,
  is_active, display_order, account_kind
)
SELECT
  'Agency Trial', '1-month free trial for new agency admins', 1, 0.00, 'INR',
  '["Full platform access during trial"]'::jsonb, false, 0, 'agency_trial'
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE account_kind = 'agency_trial'
);

-- Active subscription includes valid trial period
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.end_date > NOW()
      AND (
        NOT COALESCE(s.is_trial, false)
        OR (s.trial_end_date IS NOT NULL AND s.trial_end_date > NOW())
      )
  );
$$;

-- Provision trial for agency admin (idempotent)
CREATE OR REPLACE FUNCTION provision_agency_trial(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_sub_id UUID;
  v_user_created TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role = 'admin'
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE account_kind = 'agency_trial'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(created_at, NOW()) INTO v_user_created
  FROM users WHERE id = p_user_id;

  INSERT INTO subscriptions (
    user_id, plan_id, status, start_date, end_date,
    is_trial, trial_end_date, auto_renew
  ) VALUES (
    p_user_id, v_plan_id, 'active', NOW(),
    COALESCE(v_user_created, NOW()) + INTERVAL '1 month',
    true,
    COALESCE(v_user_created, NOW()) + INTERVAL '1 month',
    false
  )
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_agency_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION provision_agency_trial(UUID) TO service_role;

-- Allow admin to insert agency_razorpay_accounts row for collection settings
DROP POLICY IF EXISTS agency_razorpay_accounts_admin_insert ON agency_razorpay_accounts;
CREATE POLICY agency_razorpay_accounts_admin_insert ON agency_razorpay_accounts
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

-- Agency admins can read delivery payment txs for their agency
DROP POLICY IF EXISTS payment_transactions_agency_delivery_select ON payment_transactions;
CREATE POLICY payment_transactions_agency_delivery_select ON payment_transactions
  FOR SELECT USING (
    auth.uid()::text = metadata->>'agency_id'
    OR user_id = auth.uid()
  );
