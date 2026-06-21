# Resend + Supabase Auth Email Setup

Auth emails (signup confirmation, password reset, magic link, etc.) are sent by the `send-email` Edge Function via [Resend](https://resend.com), triggered by Supabase’s **Send Email** Auth Hook.

Admin-created drivers still skip email via `admin-create-driver` (`email_confirm: true`).

## Prerequisites

1. [Resend](https://resend.com) account with a **verified domain**
2. Resend API key (`re_...`)
3. Sender address on that domain (e.g. `noreply@yourdomain.com`)
4. Public HTTPS **redirect URL** after the user taps the email link (e.g. a simple “Email confirmed — open the app” page)
5. Supabase project access (Dashboard + CLI or MCP)

## 1. Resend

1. Add and verify your domain (DNS records in Resend dashboard).
2. Create an API key with send permission.
3. Note your from address: `WTA <noreply@yourdomain.com>`.

## 2. Edge Function secrets

From the project root, copy the example and fill in real values locally only:

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Set secrets on the linked project:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Resend API key |
| `SEND_EMAIL_HOOK_SECRET` | From Auth Hooks UI (`v1,whsec_...`) — set after step 4 |
| `RESEND_FROM_EMAIL` | Verified sender |
| `AUTH_REDIRECT_URL` | Optional default redirect after verify |

`SUPABASE_URL` is provided automatically in Edge Functions. API keys are available as `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS` (JSON dictionaries); legacy `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` remain during migration.

## 3. Deploy `send-email`

```bash
npx supabase functions deploy send-email --no-verify-jwt
```

Copy the function URL, e.g. `https://<project-ref>.supabase.co/functions/v1/send-email`.

JWT verification must stay **off** for this function; the hook authenticates with `SEND_EMAIL_HOOK_SECRET`.

## 4. Register the Send Email hook

1. Supabase Dashboard → **Authentication** → **Hooks**.
2. Create hook → **Send Email** → type **HTTPS**.
3. URL: your `send-email` function URL from step 3.
4. **Generate secret** → copy `v1,whsec_...` into `SEND_EMAIL_HOOK_SECRET` and run `supabase secrets set` again.
5. Save the hook.

When the hook is enabled, Supabase does **not** send auth mail itself; only your function does.

## 5. Auth URL settings

1. **Authentication** → **URL configuration**
   - **Site URL**: your app or landing page origin
   - **Redirect URLs**: include `AUTH_REDIRECT_URL` and `EXPO_PUBLIC_AUTH_REDIRECT_URL` if used
2. Keep **Confirm email** enabled under **Providers** → **Email**.

## 6. App env (optional)

In `.env` / EAS:

```env
EXPO_PUBLIC_AUTH_REDIRECT_URL=https://yourdomain.com/auth/confirmed
```

`AuthService.register` passes this as `emailRedirectTo` on `signUp` when set.

## 7. Test

| Flow | Expected |
|------|----------|
| New admin signup | Resend delivery; link opens redirect URL; user can sign in after confirm |
| Pending screen → Resend | Second email via hook |
| Admin creates driver | No auth email (unchanged) |

Check Resend dashboard for deliveries and Supabase **Logs** → Edge Functions if sends fail.

## Troubleshooting

- **401 from function**: Wrong or missing `SEND_EMAIL_HOOK_SECRET` (include full `v1,whsec_` value in secrets; the function strips the prefix internally).
- **Resend errors**: Domain not verified or `RESEND_FROM_EMAIL` not on verified domain.
- **Link goes to wrong page**: Set `AUTH_REDIRECT_URL`, dashboard Redirect URLs, and `EXPO_PUBLIC_AUTH_REDIRECT_URL`.
- **No emails at all**: Confirm Send Email hook is enabled and function deployed with `--no-verify-jwt`.

## Related

- [`supabase/functions/README.md`](../supabase/functions/README.md)
- [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook)
- [Custom Auth Emails example](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend)
