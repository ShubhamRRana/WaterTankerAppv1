# Remove Razorpay from Delivery Payments (QR/Cash Only)

**Date:** 2026-07-10
**Status:** Approved

## Summary

Customers no longer pay for bookings through Razorpay checkout. Instead, the driver
shows the agency's UPI QR code (already uploaded by the admin with the bank account)
at delivery time, the customer pays directly, and the driver records the payment and
marks the delivery complete. All Razorpay Route (linked account) infrastructure for
routing delivery money to agencies is removed.

## Scope Guardrails

- **Untouched:** The agency platform-subscription flow stays on Razorpay:
  `SubscriptionCheckoutScreen`, `create-subscription-order`, `verify-subscription-payment`,
  subscription events in `razorpay-webhook`, and `razorpayCheckout.service.ts`.
- **Untouched:** Database schema and historical payment data. No destructive migrations.
  Existing tables/columns for linked accounts, payouts, and past Razorpay delivery
  transactions remain as-is.

## 1. Driver Flow — `CollectPaymentScreen`

**Remove:**
- "Collect via Razorpay" action, `handleRazorpayCollect`, and the `openCheckout` usage.
- `payoutActive` state and the `AgencyPayoutService.getAccountStatus()` Route checks.
- The `defaultCollectionMethod` branching (`'razorpay' | 'manual_qr'`) — manual QR is
  now the only method.

**Keep / change:**
- Delivery details modal (delivered amount + liters) unchanged. Details must be entered
  before payment can be recorded.
- QR image display unchanged (sourced from the agency's default bank account
  `qrCodeImageUrl`, with fallback to any account that has one).
- Two recording actions:
  - **"Payment received via QR"** — new. Records a `payment_transactions` row with
    `payment_method: 'qr'` (mirroring `recordCashPayment`), marks the booking
    `paymentStatus: 'completed'` and `status: 'delivered'` with `deliveredAt`.
  - **"Cash collected"** — existing `recordCashPayment` behavior, unchanged. Hidden
    when the admin has disabled cash (`allowCashCollection`).
- "Complete delivery" gate: requires a recorded QR or cash payment (payment status
  completed) instead of requiring Razorpay payment.

**Trust model:** QR payment recording is driver self-reported — no gateway verification —
identical to the existing cash trust model.

## 2. Admin App

**Remove:**
- `RazorpayAccountSetupScreen` (Route setup) and its navigator route + menu entry.
- `AgencyPayoutsScreen` and its navigator route + menu entry.
- `AdminPayoutBanner` (and its slot in `AdminNavigator`).
- Related entries in `AdminMenuDrawer`.

**Keep:**
- `AddBankAccountScreen` — QR upload and allow-cash toggle live here. Remove the
  collection-method selector (`razorpay` vs `manual_qr`); manual QR is implicit.
- `DeliveryPaymentHistoryScreen` — continues to show delivery payment records
  (historical Razorpay rows plus new QR/cash rows).

## 3. Backend / Services

**Delete edge functions** (code removed and undeployed from Supabase):
- `create-delivery-order`
- `verify-delivery-payment`
- `create-linked-account`
- `get-linked-account-status`

**Trim:** `razorpay-webhook` to handle subscription events only; delivery-payment event
handling removed.

**Delete client code:**
- `agencyPayout.service.ts` (and its export in `services/index.ts`).
- `PaymentService.createDeliveryPayment` and `PaymentService.verifyDeliveryPayment`.
- Delivery-related Razorpay types in `razorpay.types.ts` that become unused.
- `FEATURE_FLAGS.enableOnlinePayment` and all its gating.

**Scripts:**
- Remove `scripts/razorpay-go-live.mjs` and `scripts/verify-razorpay-live.mjs`
  (Route-specific).
- Keep `scripts/test-razorpay-webhook-signature.mjs` (webhook still used for
  subscriptions).

**Types/settings:** `defaultCollectionMethod` disappears from client types and reads
(`subscription.types.ts`, `subscriptionDataAccess.ts`, `agencyPayout.service.ts` remnants);
the DB column stays but is no longer read or written. `allowCashCollection` stays.

## 4. Tests & Docs

- Update `payment.service.test.ts`: drop delivery-order/verify tests, add coverage for
  the new QR recording method.
- Update `subscriptionGating.test.ts` and any tests referencing payout/Route code.
- Update `README.md`, `supabase/functions/README.md`, and Razorpay docs under `docs/`
  to reflect that Razorpay is subscription-only.

## Error Handling

- QR/cash recording failures surface via the existing `PaymentResult` screen flow
  (unchanged pattern from `recordCashPayment`).
- If no QR image is available for the agency, the driver screen shows the existing
  "no QR" state; cash (if allowed) still works. This is an admin-configuration issue,
  not a blocking error.

## Success Criteria

- Driver can show QR, record QR or cash payment, and complete delivery with no
  Razorpay checkout involved.
- Admin app has no Route setup, payout screens, or payout banners; QR upload and
  cash toggle still work.
- Subscription checkout via Razorpay still works end-to-end.
- Typecheck and test suite pass; no references to deleted functions remain.
