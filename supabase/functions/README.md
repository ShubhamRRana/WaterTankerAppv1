# Supabase Edge Functions

## Razorpay (admin/driver + shared webhook)

| Function | Flow | Auth |
|----------|------|------|
| `create-subscription-order` | `agency_subscription` | Admin JWT |
| `verify-subscription-payment` | `agency_subscription` | Admin JWT |
| `create-delivery-order` | `driver_delivery` | Driver JWT |
| `verify-delivery-payment` | `driver_delivery` | Driver JWT |
| `create-linked-account` | Route onboarding | Admin JWT |
| `get-linked-account-status` | Route status | Admin JWT |
| `razorpay-webhook` | All flows + `account.activated` | Webhook signature |

Set secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## send-email (Auth Hook + Resend)

Sends **all** Supabase Auth emails (signup, recovery, magic link, email change, notifications) via [Resend](https://resend.com) when the **Send Email** hook is enabled in the dashboard.

**Setup:** See [docs/RESEND_AUTH_EMAIL_SETUP.md](../../docs/RESEND_AUTH_EMAIL_SETUP.md).

**Deploy:**

```bash
npx supabase functions deploy send-email --no-verify-jwt
```

Secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SEND_EMAIL_HOOK_SECRET`, optional `AUTH_REDIRECT_URL` (see `supabase/functions/.env.example`).

---

## admin-create-driver

Creates driver accounts **without sending a confirmation email**, so admins can add multiple drivers without hitting Supabase’s “email rate limit exceeded” error.

**Deploy (from project root):**

```bash
npx supabase functions deploy admin-create-driver
```

Or deploy from the [Supabase Dashboard](https://supabase.com/dashboard): **Edge Functions** → **Deploy new function** → upload/paste the contents of `admin-create-driver/index.ts` and set the function name to `admin-create-driver`.

The app calls this function when an admin creates a new driver; the function uses the Admin API with `email_confirm: true` so no auth email is sent.

---

## admin-delete-user

Removes a user from **Authentication → Users** after their app data has been deleted from the database. The function only deletes the auth account when the user has no remaining `user_roles` rows and no `users` profile row (so partial role removal is safe).

**Deploy (from project root):**

```bash
npx supabase functions deploy admin-delete-user
```

The app calls this function after admin driver deletion and after self-service account deletion (admin/customer). Caller must be an admin (deleting another user) or the user deleting their own account.
