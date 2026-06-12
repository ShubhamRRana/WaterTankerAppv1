# Supabase Edge Functions

Server-side functions for the Water Tanker Admin + Driver app. Deploy from the **project root** unless noted.

## Function index

| Function | Purpose | Auth |
|----------|---------|------|
| `create-subscription-order` | Razorpay order for agency subscription (Flow A) | Admin JWT |
| `verify-subscription-payment` | Verify subscription checkout signature | Admin JWT |
| `create-delivery-order` | Razorpay order for delivery collection (Flow B) | Driver JWT |
| `verify-delivery-payment` | Verify delivery checkout signature | Driver JWT |
| `create-linked-account` | Start Razorpay Route onboarding for an agency | Admin JWT |
| `get-linked-account-status` | Poll linked-account / KYC status | Admin JWT |
| `razorpay-webhook` | Payment + Route account events (source of truth) | Webhook signature |
| `send-email` | Auth emails via Resend (Send Email hook) | Hook secret |
| `admin-create-driver` | Create driver without confirmation email | Admin JWT |
| `admin-update-user-password` | Reset password for admin-created drivers | Admin JWT |
| `admin-delete-user` | Remove auth user after app data is deleted | Admin JWT or self |

Shared helpers live in `_shared/` (`razorpay.ts`, `activation.ts`, `http.ts`, `cors.ts`, `supabase.ts`).

---

## Deploy

Set secrets first (see below), then deploy:

```bash
# Deploy everything configured under supabase/functions/
npx supabase functions deploy

# Or deploy individually — Razorpay
npx supabase functions deploy create-subscription-order
npx supabase functions deploy verify-subscription-payment
npx supabase functions deploy create-delivery-order
npx supabase functions deploy verify-delivery-payment
npx supabase functions deploy create-linked-account
npx supabase functions deploy get-linked-account-status
npx supabase functions deploy razorpay-webhook --no-verify-jwt

# Auth email hook (must disable JWT verification)
npx supabase functions deploy send-email --no-verify-jwt

# Admin helpers
npx supabase functions deploy admin-create-driver
npx supabase functions deploy admin-update-user-password
npx supabase functions deploy admin-delete-user
```

JWT verification for Razorpay and admin functions (except webhook and `send-email`) is also declared in `supabase/config.toml`.

---

## Secrets

Copy `supabase/functions/.env.example` to `supabase/functions/.env`, fill in values, then:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

| Secret | Used by |
|--------|---------|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | All Razorpay functions |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SEND_EMAIL_HOOK_SECRET` | `send-email` |
| `AUTH_REDIRECT_URL` (optional) | `send-email` — confirmation link base URL |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in the Edge runtime.

---

## Razorpay (admin/driver + shared webhook)

**Prerequisites:** Apply migration `supabase/migrations/20260612120000_razorpay_admin_driver_foundation.sql`. See [docs/RAZORPAY_IMPLEMENTATION_PHASES.md](../../docs/RAZORPAY_IMPLEMENTATION_PHASES.md) and [docs/RAZORPAY_SUBSCRIPTION_AND_PAYMENTS_SCREEN_PLAN.md](../../docs/RAZORPAY_SUBSCRIPTION_AND_PAYMENTS_SCREEN_PLAN.md).

| Function | Flow | Called from |
|----------|------|-------------|
| `create-subscription-order` | `agency_subscription` | Admin subscription checkout |
| `verify-subscription-payment` | `agency_subscription` | After Razorpay SDK success |
| `create-delivery-order` | `driver_delivery` | Driver Collect Payment screen |
| `verify-delivery-payment` | `driver_delivery` | After Razorpay SDK success |
| `create-linked-account` | Route onboarding | Admin payout / Route setup |
| `get-linked-account-status` | Route status | Admin payout settings |
| `razorpay-webhook` | All flows + `account.activated` | Razorpay Dashboard |

**Razorpay Dashboard webhook:** Point to  
`https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`

Enable events: `payment.captured`, `payment.failed`, `account.activated`, `account.updated`.

**Expo app** (publishable key only): set `EXPO_PUBLIC_RAZORPAY_KEY_ID` in the root `.env`.

---

## send-email (Auth Hook + Resend)

Sends **all** Supabase Auth emails (signup, recovery, magic link, email change, notifications) via [Resend](https://resend.com) when the **Send Email** hook is enabled in the dashboard.

**Setup:** [docs/RESEND_AUTH_EMAIL_SETUP.md](../../docs/RESEND_AUTH_EMAIL_SETUP.md)

**Deploy:**

```bash
npx supabase functions deploy send-email --no-verify-jwt
```

---

## admin-create-driver

Creates driver accounts **without sending a confirmation email**, so admins can add multiple drivers without hitting Supabase’s “email rate limit exceeded” error.

**Deploy:**

```bash
npx supabase functions deploy admin-create-driver
```

The app calls this when an admin creates a new driver. The function uses the Admin API with `email_confirm: true` so no auth email is sent.

---

## admin-update-user-password

Updates a driver’s Supabase Auth password. The caller must be an admin who **created** that driver (`drivers.created_by_admin_id`).

**Body:** `{ "userId": "<uuid>", "password": "<new password>" }` (min 6 characters)

**Deploy:**

```bash
npx supabase functions deploy admin-update-user-password
```

Used from Driver Management when an admin edits a driver’s password. See also [docs/WTA_ADMIN_PASSWORD_RESET.md](../../docs/WTA_ADMIN_PASSWORD_RESET.md) for forgot-password and change-password flows.

---

## admin-delete-user

Removes a user from **Authentication → Users** after their app data has been deleted. The function only deletes the auth account when the user has no remaining `user_roles` rows and no `users` profile row (partial role removal stays safe).

**Deploy:**

```bash
npx supabase functions deploy admin-delete-user
```

Called after admin driver deletion and after self-service account deletion. The caller must be an admin (deleting another user) or the user deleting their own account.
