# PhonePe Payment Gateway – Implementation Guide

This document describes all changes and implementation required to add **PhonePe** as an online payment option across both repositories:

- **Customer app:** [water-customer-app](https://github.com/ShubhamRRana/water-customer-app) – where customers book tankers and pay.
- **Admin/Driver app:** **WaterTankerAppv1** (this repo) – where admins and drivers manage orders and collect/confirm payments.

Current state: both apps use **Cash on Delivery (COD)** only. Payment is marked pending at booking; the driver collects cash and marks “Payment Collected” in the driver app. This guide adds **PhonePe** (online prepay) while keeping COD as an option.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Changes](#3-database-changes)
4. [Backend / API Requirements](#4-backend--api-requirements)
5. [Owner Onboarding & Bank Account Verification](#5-owner-onboarding--bank-account-verification)
6. [Customer App (water-customer-app) Changes](#6-customer-app-water-customer-app-changes)
7. [Admin/Driver App (WaterTankerAppv1) Changes](#7-admindriver-app-watertankerappv1-changes)
8. [Environment & Security](#8-environment--security)
9. [Testing & Go-Live](#9-testing--go-live)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Overview

### 1.1 Repositories

| Repo | Purpose | Payment-related today |
|------|--------|------------------------|
| **water-customer-app** | Customer booking, order history, tracking | `payment.service.ts`: COD only; `processOnlinePayment` throws. BookingScreen creates booking with `paymentStatus: 'pending'` only. |
| **WaterTankerAppv1** | Admin + Driver | `payment.service.ts`: `processCODPayment`, `confirmCODPayment`. CollectPaymentScreen shows amount + QR (bank) and “Payment Collected” → confirms COD. |

### 1.2 Payment Flows After Implementation

- **COD (unchanged):** Customer chooses COD → booking created with `paymentStatus: 'pending'` and `paymentMethod: 'cod'`. Driver delivers, shows Collect Payment screen, marks “Payment Collected” → `confirmCODPayment` sets `paymentStatus: 'completed'`.
- **PhonePe (new):** Customer chooses “Pay with PhonePe” → backend creates PhonePe order → customer is redirected to PhonePe (WebView/browser) → pays → callback/redirect + webhook/status API → backend updates booking `paymentStatus: 'completed'` and `paymentId` (gateway transaction id). Driver app shows “Already paid (PhonePe)” and does not collect cash.

### 1.3 PhonePe Integration (High Level)

- **Backend:** Create payment (unique `merchantOrderId`, amount in **paisa**, `redirectUrl`), return checkout URL; expose status API and webhook for callbacks.
- **Customer app:** Call “create payment” API → open PhonePe checkout URL (WebView or browser) → on return, call “payment status” API and show success/failure; optionally poll if needed.
- **Admin/Driver app:** Read `paymentMethod` and `paymentStatus` from booking; if online and completed, skip cash collection and show “Paid online”.

### 1.4 Platform vs Owner Accounts

- **You (platform):** Register as the **PhonePe merchant** via [PhonePe Business](https://business.phonepe.com). You get **Merchant ID**, **Salt Key**, and enable PG APIs. All payments (delivery and subscription) are **collected to your PhonePe account** first.
- **Owners (tanker operators):** Do **not** need separate PhonePe merchant accounts. They **link their bank accounts** in your app’s admin dashboard during onboarding by providing **IFSC** and **account number**. These details are stored securely in your backend (e.g. Supabase). You must **verify** these details before using them for settlements (see [§5 Owner Onboarding & Bank Account Verification](#5-owner-onboarding--bank-account-verification)).
- **Split settlement:** PhonePe (or a partner like Razorpay Route/Optimizer for advanced splits) is configured so that for **delivery payments**, a defined share (e.g. 90%) is settled to the respective owner’s linked bank account and the remainder (e.g. 10% platform fee) stays in your account. For **subscriptions**, 100% stays with you (no owner split).

### 1.5 Split Settlement and Subscription

| Payment Type | Collected To | Settled To Owner | Your Share |
|--------------|-------------|------------------|------------|
| **Delivery** (e.g. ₹2000) | Your PhonePe account | e.g. 90% (₹1800) to owner’s linked bank | e.g. 10% (₹200) platform fee |
| **Subscription** (monthly/yearly) | Your PhonePe account | N/A | 100% (via PhonePe Autopay) |

- **Delivery flow:** Customer books tanker → on delivery completion (or at payment step), you initiate PhonePe payment from your backend using `/pg/v1/pay`; customer pays via redirect/SDK. On success (webhook `/pg/v1/status`), mark order as paid and let PhonePe/split logic settle the owner’s share to their bank.
- **Subscription:** Use **PhonePe Autopay** for recurring plans: one-time **mandate setup** via `/subscriptions/v2/setup`, then auto-debit (monthly/yearly). All subscription funds go to your account; no owner split. Check status with `/subscriptions/v2/{id}/status`. See [§4.7 Subscription (PhonePe Autopay)](#47-subscription-phonepe-autopay).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER APP (water-customer-app)                  │
│  BookingScreen → Payment method: COD | PhonePe                            │
│  If PhonePe: call Backend “create payment” → open redirectUrl (WebView)   │
│  On return: call “payment status” → update UI / booking state             │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ create payment                      │ redirect + status
                    ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              BACKEND (Supabase Edge Functions or Node API)                │
│  POST /payments/phonepe/create  → PhonePe SDK pay() → return redirectUrl  │
│  GET  /payments/phonepe/status?orderId=… → getOrderStatus()              │
│  POST /payments/phonepe/webhook → validateCallback(), update booking    │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    │ webhook / status updates
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (shared DB)                             │
│  bookings: payment_status, payment_id, payment_method, gateway_*         │
│  payment_transactions (new): gateway logs                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    │ realtime / fetch booking
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   ADMIN/DRIVER APP (WaterTankerAppv1)                     │
│  OrdersScreen / CollectPaymentScreen: if paymentMethod === 'phonepe'       │
│  and paymentStatus === 'completed' → show “Paid via PhonePe”, no collect  │
│  Else COD: show amount + QR, “Payment Collected” → confirmCODPayment     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Changes

Both apps use the same Supabase project; schema changes apply once and are used by both.

### 3.1 Bookings Table – New Columns

Add columns to support payment method and gateway identifiers (run as migration in Supabase):

```sql
-- Add to existing bookings table (or in a new migration)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cod'
    CHECK (payment_method IN ('cod', 'phonepe'));

-- Gateway reference for online payments (PhonePe merchant order id / transaction id)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(128);

-- Optional: index for status checks
CREATE INDEX IF NOT EXISTS idx_bookings_gateway_order_id
  ON bookings(gateway_order_id) WHERE gateway_order_id IS NOT NULL;
```

- **payment_method:** `'cod'` | `'phonepe'`.
- **gateway_order_id:** PhonePe merchant order id (your unique id sent to PhonePe).
- **gateway_transaction_id:** PhonePe transaction id (from callback/status), stored for reconciliation.

Keep existing `payment_status` and `payment_id`; you can keep using `payment_id` for gateway transaction id if you prefer, but separate `gateway_order_id` / `gateway_transaction_id` make reporting and debugging easier.

### 3.2 Payment Transactions Table (Recommended)

Use a separate table for gateway audit trail (create payment, webhook, status checks):

```sql
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  amount_paise BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',

  gateway VARCHAR(50) DEFAULT 'phonepe',
  gateway_order_id VARCHAR(128) NOT NULL UNIQUE,
  gateway_transaction_id VARCHAR(128),
  gateway_state VARCHAR(32),  -- PENDING, COMPLETED, FAILED

  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded', 'cancelled')),

  payment_method VARCHAR(50),  -- UPI, CARD, etc. (from PhonePe)
  raw_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_gateway_order_id ON payment_transactions(gateway_order_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: users see own; admins see by agency (implement per your RLS model)
```

### 3.3 Owner Bank Account (for split settlement)

Store verified owner bank details for payouts. Only persist after successful verification (see [§5 Owner Onboarding & Bank Account Verification](#5-owner-onboarding--bank-account-verification)).

```sql
CREATE TABLE IF NOT EXISTS owner_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- or your agency/owner entity

  account_number_encrypted VARCHAR(255) NOT NULL,   -- store encrypted; never log
  ifsc VARCHAR(11) NOT NULL,
  account_holder_name VARCHAR(255),               -- from verification API if available

  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verified_at TIMESTAMPTZ,
  verification_provider VARCHAR(50),               -- e.g. 'razorpay', 'cashfree'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(owner_id)   -- one linked account per owner (or allow multiple per your rules)
);

CREATE INDEX idx_owner_bank_accounts_owner_id ON owner_bank_accounts(owner_id);
ALTER TABLE owner_bank_accounts ENABLE ROW LEVEL SECURITY;
```

---

## 4. Backend / API Requirements

PhonePe **must not** be called from the app with secrets. Use a backend (Supabase Edge Functions or a small Node service) that holds **Client ID**, **Client Secret**, and **Salt**.

### 4.1 PhonePe Setup

- Register as a **merchant** at [PhonePe Business](https://business.phonepe.com) (business.phonepe.com).
- Obtain **Merchant ID**, **Salt Key**, and enable **PG (Payment Gateway) APIs**.
- In code/docs these may be referred to as **Client ID**, **Client Secret**, **Salt** (or key index + salt). Keep all of these only on the backend.
- Use **Sandbox** for testing (e.g. `api-preprod.phonepe.com`); switch to **Production** when going live.

### 4.2 Backend Endpoints

Implement these on your backend (e.g. Supabase Edge Functions):

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/payments/phonepe/create` | POST | Body: `{ bookingId, amountInRupees }`. Create PhonePe order (amount in paisa), persist `gateway_order_id` in DB, return `{ redirectUrl, merchantOrderId }`. |
| `/payments/phonepe/status` | GET | Query: `orderId` (merchant order id). Call PhonePe `getOrderStatus()`, update booking + payment_transactions, return `{ state, paymentStatus, transactionId }`. |
| `/payments/phonepe/webhook` | POST | PhonePe callback. Validate with `validateCallback()`, on `CHECKOUT_ORDER_COMPLETED` / `CHECKOUT_ORDER_FAILED` update booking and payment_transactions. Return 200 quickly. |

### 4.3 Create Payment (Backend Logic)

- **Input:** `bookingId`, `amountInRupees` (from booking total or passed explicitly).
- **Validation:** Booking exists, belongs to current user, `payment_status` is still `pending`, and optionally `payment_method = 'phonepe'`.
- **Idempotency:** Use a stable `merchantOrderId` per booking (e.g. `booking_<bookingId>_<version>` or one-time token). PhonePe expects unique order ids.
- **PhonePe:** Amount in **paisa** (rupees × 100); minimum as per PhonePe docs (e.g. 100 paisa). Build request with `merchantOrderId`, amount, `redirectUrl` (your app deep link or a small web page that redirects back to app with `orderId`).
- **Response:** `{ redirectUrl, merchantOrderId }`. Customer app opens `redirectUrl` in WebView or browser.

### 4.4 Status Check (Backend)

- **Input:** `orderId` (merchant order id).
- **Logic:** Call PhonePe `getOrderStatus(orderId)`. Map `state` (PENDING / COMPLETED / FAILED) to booking `payment_status` and `gateway_transaction_id`. Update `payment_transactions` if you use it.
- **Response:** `{ state, paymentStatus, transactionId?, error? }`.

### 4.5 Webhook (Backend)

- **Validation:** Use PhonePe’s `validateCallback(username, password, authorizationHeader, body)` (or equivalent) so only PhonePe can trigger updates.
- **Events:** On `CHECKOUT_ORDER_COMPLETED`, set booking `payment_status = 'completed'`, store `gateway_transaction_id`, update `payment_transactions`. On `CHECKOUT_ORDER_FAILED`, set `payment_status = 'failed'` and log.
- **Response:** Return 200 immediately; do heavy work async if needed.

### 4.6 Redirect URL (Deep Link / Web)

- **redirectUrl** you give to PhonePe must point to a page that:
  - Reads `merchantOrderId` (or order id) from query/body as per PhonePe redirect.
  - Either redirects to your app via deep link (e.g. `yourapp://payment/result?orderId=...`) or shows “Return to app” and passes the same in the link.
- Customer app subscribes to deep link or checks payment status when it comes to foreground and calls `/payments/phonepe/status?orderId=...`.

### 4.7 Subscription (PhonePe Autopay)

- Use **PhonePe Autopay** for **monthly/yearly app subscription** paid by owners or customers. All subscription money goes to **your** account; no split to owners.
- **Flow:** One-time **mandate setup** via PhonePe API (e.g. `/subscriptions/v2/setup`), then auto-debit as per plan. Verify status with `/subscriptions/v2/{id}/status`.
- Implement subscription creation, mandate handling, and webhooks as per [PhonePe Subscriptions](https://developer.phonepe.com/payment-gateway) docs. For product/plan modelling (e.g. monthly vs yearly), align with `SUBSCRIPTION_IMPLEMENTATION_GUIDE.md` and use the same backend pattern (Edge Functions, no secrets in app).

### 4.8 Split Settlement (Delivery payouts to owners)

- Configure **split payment** or **sub-merchant** setup with PhonePe so that for **delivery** transactions, a portion is auto-settled to the **owner’s linked bank account** and the rest (platform fee) remains with you. PhonePe supports this for marketplaces; contact PhonePe support for “split payment” or sub-merchant options.
- Alternatively, you can use **Razorpay Route/Optimizer** (which can work with PhonePe) for more flexible split logic—see [Razorpay + PhonePe](https://razorpay.com/docs/payments/optimizer/phonepe/?preferred-country=IN).
- Ensure owner bank details used for settlement are **verified** (see [§5 Owner Onboarding & Bank Account Verification](#5-owner-onboarding--bank-account-verification)).

---

## 5. Owner Onboarding & Bank Account Verification

Owners submit **IFSC** and **account number** during onboarding. Verifying these is **critical** to prevent fraud and failed payouts before you enable split settlement to their accounts.

### 5.1 Why verify

- Ensures the account exists and can receive payouts.
- Reduces failed transfers and support overhead.
- Helps with name match and compliance (e.g. beneficiary validation).

### 5.2 Verification methods

| Method | Description | Use when |
|--------|-------------|----------|
| **API-based (recommended)** | Third-party API validates IFSC + account (and optionally account holder name) via penny drop, penniless testing, or UPI. | Onboarding form submit; instant result. |
| **IFSC-only** | Free API to validate branch/bank for a given IFSC. | First-step sanity check before full account verification. |
| **Penny drop** | Backend sends a small amount (e.g. ₹1) via IMPS/NEFT; owner confirms amount (1–2 days). | Fallback or when API is unavailable. |

### 5.3 Provider comparison

| Provider | Features | Coverage | Pricing | Integration |
|----------|----------|----------|---------|-------------|
| **RazorpayX** | Penny/penniless, name match, UPI | All India banks | Pay-per-use (~₹2) | REST API, Node/Python SDKs |
| **Cashfree** | Account/IFSC validation, PAN/GST | All banks | Volume-based | Simple API |
| **PhonePe** | Beneficiary auth during payout setup; penny drop via Payouts API | Select banks (limited); penny drop all | Free/included or refundable ₹1–3 | Payouts API; no standalone public IFSC/verify API |
| **Others** (e.g. IDSPay, Surepass) | Real-time name/status | India-wide | ~₹1–5 | Quick endpoints |

- **Razorpay IFSC (free):** `GET https://ifsc.razorpay.com/{IFSC}` — validates branch/bank only, no account number check. Use this as first-step sanity check; PhonePe does not expose a standalone IFSC endpoint.
- **RazorpayX Bank Account Verification:** e.g. `POST /v1/accounts/verify` with `account_number` and `ifsc`; use from backend only; store result only if verification succeeds. Best for instant, full-bank coverage when you need robust verification.

### 5.3a Using PhonePe for verification

PhonePe offers **limited direct support** for full bank account verification (IFSC + account number + name match) compared to RazorpayX’s dedicated APIs. Their primary use is **beneficiary authentication** during payout setup or via a test transfer. Full documentation for a standalone “validate beneficiary” endpoint is not always publicly detailed; contact PhonePe support for your Merchant ID’s exact payout validation API.

**PhonePe verification options:**

| Method | Speed | Cost | Coverage |
|--------|-------|------|----------|
| **PhonePe beneficiary auth** | Instant (where supported) | Free / included with PG | Limited (select banks) |
| **PhonePe penny drop** | 1–2 days | ₹1–3 (refundable) | All (via IMPS/NEFT) |
| **RazorpayX (hybrid)** | Instant | ~₹2 per check | Full (all India banks) |

- **IFSC lookup:** PhonePe does **not** expose a standalone IFSC API. Use a free public API as first step, e.g. **Razorpay IFSC:** `GET https://ifsc.razorpay.com/{IFSC}` to validate bank/branch before account verification.
- **Account validation:** In your backend, use PhonePe’s **beneficiary authentication** during payout setup. Contact PhonePe support (developer.phonepe.com) for the exact endpoint for your Merchant ID (e.g. a payouts/transfers “validate beneficiary” call such as `/payouts/validate`). Send `account_number`, `ifsc`, and optionally `name`; for supported banks it can check existence **without** transferring funds.
- **Test penny drop:** Send a small amount (e.g. ₹1) via **PhonePe Payouts API** (e.g. `/pg/v1/payouts`), have the owner confirm receipt, then refund if needed. Slow (1–2 days) but reliable and works for all banks. Enable **PhonePe Payouts** in [business.phonepe.com](https://business.phonepe.com) and test in sandbox.

**Implementation steps (PhonePe-only):**

1. Owner submits IFSC, account number, and name in onboarding form → backend formats request.
2. Optional: validate IFSC via `https://ifsc.razorpay.com/{IFSC}`.
3. Call PhonePe Payouts/validation API with `account_number`, `ifsc`, `name` → response flags invalid details early where supported.
4. On success: store verified details in `owner_bank_accounts`, set `verification_status = 'verified'`, mark owner as payout-ready.
5. Fallback: **Manual verification** — cancelled cheque upload + optional OCR (e.g. Google Vision in Supabase) and manual review before enabling payouts.

**Limitations and recommendation:**

- PhonePe excels at **collections and subscriptions**; **payouts and verification** are more basic and lack penny-less instant checks across all banks.
- **Recommendation:** If you want to keep verification within the PhonePe ecosystem, enable **PhonePe Payouts** (business.phonepe.com), use IFSC check + beneficiary validation (once you have the exact API from support) and/or penny drop. For **robust, instant verification** across all banks (~₹2 per check), **pair with RazorpayX** alongside PhonePe; Razorpay integrates with PhonePe Optimizer for splits, so the combination works well for your flow.

### 5.4 Onboarding integration flow

1. **Owner** submits IFSC, account number, and (if required) account holder name in the admin app (secure input; do not log full account number).
2. **Backend** (e.g. Supabase Edge Function) calls the chosen verification API with your API key. Never call from the client with secrets.
   - **If using PhonePe:** Optionally validate IFSC via Razorpay’s free IFSC API first; then call PhonePe Payouts/validate-beneficiary API (contact PhonePe support for exact endpoint) or use PhonePe penny drop; see [§5.3a Using PhonePe for verification](#53a-using-phonepe-for-verification).
   - **If using RazorpayX/Cashfree:** Call their account verification API; instant result for supported banks.
3. **Result:** If **verified**, update `owner_bank_accounts` (e.g. set `verification_status = 'verified'`, `verified_at`, `verification_provider`) and optionally store account holder name if returned. If **failed**, set `verification_status = 'failed'` and show “Verification failed” with retry or manual fallback (e.g. cancelled cheque upload).
4. **Fallback:** Allow manual verification via **cancelled cheque** upload (and optional OCR) plus manual review before enabling payouts for that owner.

### 5.5 Backend endpoint (suggestion)

- **POST /admin/owner-bank/verify** (or similar): Body `{ ifsc, accountNumber, accountHolderName? }` → call your chosen provider (RazorpayX, Cashfree, or **PhonePe Payouts/validate** once you have the exact API from PhonePe support) → return `{ verified: boolean, accountHolderName?: string }` and persist to `owner_bank_accounts` only when verified. Use Supabase Edge Functions and store keys in secrets. For PhonePe-only flow, you may have a two-step: validate beneficiary (instant where supported) or trigger penny drop and confirm later.

### 5.6 Security and compliance

- Store **account numbers** encrypted at rest; never log or expose full account number in responses.
- Use **HTTPS** and **RLS** so only the owning admin/owner can read their own bank record.
- Comply with GST and T+2 settlement norms as applicable; keep audit trail in `payment_transactions` and settlement logs.

---

## 6. Customer App (water-customer-app) Changes

### 6.1 Types

- **Booking / CreateBooking:** Extend with `paymentMethod?: 'cod' | 'phonepe'`. Ensure backend/DB supports it (see above).
- **PaymentResult:** Add fields as needed, e.g. `redirectUrl`, `merchantOrderId` for PhonePe.

### 6.2 Payment Service – `src/services/payment.service.ts`

- **Keep:** `processCODPayment(bookingId, amount)` – same as today (or delegate to API if you move COD to backend).
- **Add:** `initiatePhonePePayment(bookingId: string): Promise<{ redirectUrl: string; merchantOrderId: string }>`  
  - Call backend `POST /payments/phonepe/create` with `{ bookingId }` (amount can come from booking on backend).  
  - Return `redirectUrl` and `merchantOrderId` to the UI.
- **Add:** `getPhonePePaymentStatus(merchantOrderId: string): Promise<{ state: string; paymentStatus: string; transactionId?: string }>`  
  - Call backend `GET /payments/phonepe/status?orderId=...`.  
  - Used after redirect or when app resumes.
- **Optional:** Replace or extend `processOnlinePayment` to accept `'phonepe'` and call `initiatePhonePePayment` then open URL; or keep a separate flow as below.

### 6.3 BookingScreen – `src/screens/customer/BookingScreen.tsx`

- **Payment method selection:** Before “Book Now”, add a segment or radio: **Cash on Delivery** vs **Pay with PhonePe**.
- **State:** e.g. `paymentMethod: 'cod' | 'phonepe'`, default `'cod'`.
- **Create booking:** Include `paymentMethod` in payload when creating booking. If backend expects it, send it; otherwise ensure backend sets it from request or default.
- **After booking creation (PhonePe only):**
  - Call `PaymentService.initiatePhonePePayment(bookingId)`.
  - Open returned `redirectUrl` in:
    - **WebView** (recommended): same screen, use `Linking.openURL(redirectUrl)` or a WebView with `onShouldStartLoadWithRequest` to detect redirect back (if redirectUrl is a web page that redirects to app).
    - Or **browser:** `Linking.openURL(redirectUrl)` and rely on deep link to bring user back.
  - Store `merchantOrderId` (and optionally `bookingId`) in state or a small context so that when the user returns you can call status.

### 6.4 Post–Payment Return Handling

- **Deep link:** Register a URL scheme (e.g. `yourapp://payment/result?orderId=...`). When app opens with this, read `orderId`, call `getPhonePePaymentStatus(orderId)`, then show success/failure and navigate (e.g. to order detail or home).
- **App state / focus:** If you use a WebView inside the app and detect redirect to a “success” URL that contains `orderId`, or when app comes to foreground after browser flow, call `getPhonePePaymentStatus(merchantOrderId)` and update UI.
- **UI:** Show loading while checking status; then “Payment successful” or “Payment failed / pending”. Optionally poll a few times if state is still PENDING.

### 6.5 Order Confirmation / Order Detail

- After successful PhonePe payment, refresh booking (or use backend response) and show “Paid via PhonePe” and booking/order details.

### 6.6 New / Modified Screens (Optional)

- **PaymentWebViewScreen:** A dedicated screen that loads `redirectUrl`, handles “back” and redirect detection, and on success/failure calls status API and navigates back with result. This keeps BookingScreen simpler.
- **PaymentResultScreen:** Shown after return from PhonePe (via deep link or navigation) to display success/failure and “View order” / “Back to home”.

### 6.7 Config / Env

- **API base URL** for backend (e.g. Supabase Edge Functions URL). No PhonePe secrets in the app.

---

## 7. Admin/Driver App (WaterTankerAppv1) Changes

### 7.1 Types – `src/types/index.ts`

- **Booking:** Add `paymentMethod?: 'cod' | 'phonepe'` (and optionally `gatewayOrderId`, `gatewayTransactionId` if you use them in UI).
- Ensure mapping from Supabase `payment_method`, `gateway_order_id`, `gateway_transaction_id` in your data access layer.

### 7.2 Data Access – `src/lib/supabaseDataAccess.ts`

- In `BookingRow` (or equivalent): add `payment_method`, `gateway_order_id`, `gateway_transaction_id` if you added those columns.
- In `mapBookingFromDb`: set `paymentMethod`, `gatewayOrderId`, `gatewayTransactionId` on the Booking object.
- In `mapBookingToDb` / update payloads: when updating booking for payment, set `payment_method`, `payment_id` / `gateway_transaction_id` as needed (usually from backend/webhook; driver app may only read).

### 7.3 Payment Service – `src/services/payment.service.ts`

- **Keep:** `processCODPayment`, `confirmCODPayment` for COD flow.
- **Optional:** Add a small helper that only runs when payment is already completed (e.g. for display or analytics), or leave status updates entirely to backend/webhook. Driver app does **not** call PhonePe; it only reads booking state.

### 7.4 CollectPaymentScreen – `src/screens/driver/CollectPaymentScreen.tsx`

- **Conditional UI:**
  - If `booking.paymentMethod === 'phonepe'` (or similar) and `booking.paymentStatus === 'completed'`:
    - Show “Paid via PhonePe” (or “Paid online”) and transaction id if you have it.
    - **Hide** “Scan QR Code to Pay” and do **not** show “Payment Collected” for cash. Show only “Done” / “Complete delivery” that marks delivery complete without calling `confirmCODPayment` (or call a variant that only updates delivery status and does not change payment).
  - Else (COD or payment still pending):
    - Keep current behavior: show amount, QR code (bank), and “Payment Collected” button. On “Payment Collected”, call `confirmCODPayment(bookingId)` then mark delivery complete.

### 7.5 OrdersScreen / OrdersList

- **Orders list:** Optionally show a small badge or text “Online paid” vs “COD” next to payment status so driver knows before opening Collect Payment.
- **Collect Payment button:** For bookings already paid online, you can either hide “Collect Payment” and show “View delivery” / “Complete delivery”, or open CollectPaymentScreen which then shows the “Paid via PhonePe” state as above.

### 7.6 Admin – AllBookingsScreen / BookingCard / Reports

- **Booking list/detail:** Show `payment_method` (COD vs PhonePe) and, for PhonePe, `gateway_transaction_id` or last four digits for support.
- **Reports / analytics:** If you have revenue or payment reports, include payment method and gateway transaction id from `payment_transactions` or booking columns.

### 7.7 Driver Flow Summary

- Driver accepts order → goes to “Collect Payment” for that order.
- If **COD:** Show amount + bank QR, driver taps “Payment Collected” → `confirmCODPayment` → then “Complete delivery”.
- If **PhonePe** and **completed:** Show “Paid via PhonePe”, only “Complete delivery” (no cash collection).
- If **PhonePe** and **pending/failed:** Either show message “Customer will complete payment” or allow fallback to COD if your business rules allow (then treat as COD and use “Payment Collected”).

---

## 8. Environment & Security

- **Secrets:** PhonePe **Client ID**, **Client Secret**, **Salt** only in backend env (Supabase Edge Function secrets or server env). Never in app code or client. Same for bank verification provider keys (e.g. Razorpay).
- **Checksums / X-VERIFY:** When calling PhonePe APIs, use the required checksum and **X-VERIFY** header as per PhonePe docs (e.g. crypto-based signature in Node). This ensures requests are authenticated and tamper-proof.
- **HTTPS:** All backend and redirect URLs must be HTTPS in production.
- **Webhook:** Validate every webhook request with PhonePe’s recommended method (e.g. `validateCallback`) and return 200 only after validation.
- **Idempotency:** Same `merchantOrderId` should not be reused for a new payment; use one per booking (or per attempt if you allow retries with a new order id).
- **Compliance:** GST on fees and T+2 settlements apply; keep audit trail in `payment_transactions` and settlement logs.

---

## 9. Testing & Go-Live

- **Sandbox:** Use PhonePe sandbox for create payment, redirect, status, and webhook. Test both success and failure.
- **Deep link / redirect:** Test “Return to app” from PhonePe and that status API is called and booking updates.
- **Driver app:** Test COD path unchanged; test order paid with PhonePe shows “Paid via PhonePe” and no cash collection.
- **Admin:** Verify bookings show correct payment method and status.
- **Go-live:** Switch backend to PhonePe production credentials and production redirect URLs; no code change in flow, only config.

---

## 10. Implementation Checklist

Use this in both repos and backend.

### Backend (Supabase or Node)

- [ ] PhonePe merchant account at business.phonepe.com (sandbox + production); Merchant ID, Salt Key, PG APIs.
- [ ] Migration: add `payment_method`, `gateway_order_id`, `gateway_transaction_id` to `bookings`.
- [ ] Optional: migration for `payment_transactions` table and RLS.
- [ ] Migration: `owner_bank_accounts` table for owner IFSC/account and verification status.
- [ ] Edge Function or API: `POST /payments/phonepe/create` (create order, return redirectUrl).
- [ ] Edge Function or API: `GET /payments/phonepe/status` (getOrderStatus, update booking).
- [ ] Edge Function or API: `POST /payments/phonepe/webhook` (validate, update booking + payment_transactions).
- [ ] Redirect URL / small web page and deep link for “return to app”.
- [ ] Owner bank verification: Edge Function or API (e.g. `POST /admin/owner-bank/verify`) calling RazorpayX, Cashfree, or PhonePe Payouts/validate API; persist only when verified. If using PhonePe for verification, contact PhonePe support (developer.phonepe.com) for exact payout validation endpoint for your Merchant ID; use Razorpay IFSC API for IFSC-only check (PhonePe has no standalone IFSC endpoint).
- [ ] Split settlement: Configure PhonePe (or Razorpay Route) for delivery payouts to owner banks; subscription 100% to your account.
- [ ] Subscription: PhonePe Autopay mandate setup and status APIs if offering monthly/yearly plans.
- [ ] Env: `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_SALT`, `PHONEPE_ENV`; plus verification provider keys (e.g. Razorpay) in secrets.

### Customer App (water-customer-app)

- [ ] Types: `paymentMethod` on booking/create payload.
- [ ] `payment.service.ts`: `initiatePhonePePayment(bookingId)`, `getPhonePePaymentStatus(merchantOrderId)`.
- [ ] BookingScreen: payment method selector (COD / PhonePe); pass `paymentMethod` when creating booking.
- [ ] After booking (PhonePe): call initiate → open redirectUrl (WebView or browser); handle return and call status.
- [ ] Deep link or in-app return handling; show success/failure and refresh booking.
- [ ] Config: backend base URL (no secrets). Consider `react-native-phonepe-pg` for checkout if using React Native SDK.

### Admin/Driver App (WaterTankerAppv1)

- [ ] Types: `paymentMethod`, optional `gatewayOrderId` / `gatewayTransactionId` on Booking.
- [ ] Data access: read/write new booking columns and map in/out of Supabase.
- [ ] CollectPaymentScreen: if PhonePe + completed → show “Paid via PhonePe”, no QR, no “Payment Collected”; only complete delivery. Else COD flow unchanged.
- [ ] Orders list/detail: show payment method (COD vs PhonePe) where useful.
- [ ] Admin reports/list: include payment method and gateway reference if needed.
- [ ] Owner onboarding: screen/form for owners to submit IFSC + account number; call backend verify API; show “Verified ✓” or retry/manual fallback (e.g. cancelled cheque). Store account numbers encrypted; never log.

### Cross-cutting

- [ ] End-to-end: Customer pays with PhonePe → webhook/status updates booking → driver sees “Paid via PhonePe” and completes delivery.
- [ ] End-to-end: Customer selects COD → driver collects and marks “Payment Collected” → same as today.
- [ ] Security review: no secrets in apps; webhook validated; HTTPS only.

---

## References

- [PhonePe – Create Payment (Standard Checkout)](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment)
- [PhonePe – Initiate Payment (Node.js SDK)](https://developer.phonepe.com/payment-gateway/backend-sdk/nodejs-be-sdk/api-reference-node-js/initiate-payment)
- [PhonePe – Check Order Status (Node.js)](https://developer.phonepe.com/payment-gateway/backend-sdk/nodejs-be-sdk/api-reference-node-js/order-status-api)
- [PhonePe – Webhook Handling](https://developer.phonepe.com/payment-gateway/backend-sdk/nodejs-be-sdk/api-reference-node-js/webhook-handling)
- [PhonePe – Payment Gateway (Subscriptions / Autopay)](https://developer.phonepe.com/payment-gateway)
- [PhonePe – React Native SDK](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/react-native/sdk-setup) — `react-native-phonepe-pg` (npm); test with api-preprod.phonepe.com.
- [RazorpayX – Bank Account Verification](https://razorpay.com/x/bank-account-verification/) — penny drop, penniless, name match; pay-per-use.
- [Razorpay – IFSC API (free)](https://ifsc.razorpay.com/) — `GET https://ifsc.razorpay.com/{IFSC}` for branch/bank validation.
- [Cashfree – Bank Account Verification](https://www.cashfree.com/bank-account-verification/)
- [Razorpay + PhonePe (Optimizer)](https://razorpay.com/docs/payments/optimizer/phonepe/?preferred-country=IN) — for split settlements / route to sub-merchants.
- [PhonePe – PG / Payouts](https://www.phonepe.com/guides/payment-gateway/what-is-ifsc-code-full-form-meaning-uses-and-examples/) — beneficiary auth, IFSC usage; enable Payouts at business.phonepe.com; contact [PhonePe Developer Support](https://developer.phonepe.com) for exact payout validation API (e.g. validate beneficiary) for your Merchant ID.

---

*This guide covers PhonePe for **booking (delivery) payment** and **platform subscription**. Delivery payments use split settlement to owner bank accounts (after verification); subscriptions go 100% to your account via Autopay. For product/plan modelling (e.g. monthly vs yearly), see SUBSCRIPTION_IMPLEMENTATION_GUIDE.md and reuse the same backend pattern.*
