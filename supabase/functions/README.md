# Supabase Edge Functions

## admin-create-driver

Creates driver accounts **without sending a confirmation email**, so admins can add multiple drivers without hitting Supabase’s “email rate limit exceeded” error.

**Deploy (from project root):**

```bash
npx supabase functions deploy admin-create-driver
```

Or deploy from the [Supabase Dashboard](https://supabase.com/dashboard): **Edge Functions** → **Deploy new function** → upload/paste the contents of `admin-create-driver/index.ts` and set the function name to `admin-create-driver`.

The app calls this function when an admin creates a new driver; the function uses the Admin API with `email_confirm: true` so no auth email is sent.
