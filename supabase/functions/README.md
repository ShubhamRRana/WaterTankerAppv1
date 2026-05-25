# Supabase Edge Functions

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
