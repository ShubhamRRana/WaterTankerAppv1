-- Update agency subscription plan prices

UPDATE subscription_plans SET price = 2799.00, updated_at = NOW()
WHERE account_kind = 'agency' AND duration_months = 1;

UPDATE subscription_plans SET price = 7499.00, updated_at = NOW()
WHERE account_kind = 'agency' AND duration_months = 3;

UPDATE subscription_plans SET price = 13999.00, updated_at = NOW()
WHERE account_kind = 'agency' AND duration_months = 6;

UPDATE subscription_plans SET price = 24999.00, updated_at = NOW()
WHERE account_kind = 'agency' AND duration_months = 12;
