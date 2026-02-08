# Water Tanker App — Web Application: End-to-End Tech Stack & Implementation Guide

This document describes the tech stack, architecture, and steps to build a **separate web application** that shares the same Supabase backend as the existing React Native (Expo) mobile app.

---

## 1. Overview

| Item | Description |
|------|-------------|
| **Goal** | Standalone web app (customers, drivers, admin) using the same database, auth, and business rules as the mobile app. |
| **Backend** | Existing Supabase project — no new backend. |
| **Auth** | Supabase Auth (email/password); same `users` and role-based access. |
| **Deployment** | Static or SSR hosting (Vercel, Netlify, or similar). |

---

## 2. Recommended Tech Stack

### 2.1 Core

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| **Framework** | React | 18.x |
| **Build tool** | Vite | 5.x (fast dev, optimized production build) |
| **Language** | TypeScript | 5.x |
| **Routing** | React Router | v6 |
| **State** | Zustand | 4.x (same as mobile; optional: TanStack Query for server state) |
| **Backend / Auth / DB** | Supabase JS Client | 2.x (same as mobile) |
| **Forms** | React Hook Form | 7.x |
| **Validation** | Zod | 3.x |

### 2.2 UI & Styling

| Layer | Technology | Notes |
|-------|------------|--------|
| **Component library** | Tailwind CSS | Utility-first; easy to match mobile app colors/spacing. |
| **Optional UI kit** | shadcn/ui (Radix) or Chakra UI | Accessible components; can align with existing `UI_CONFIG` (e.g. primary `#3e5c76`, accent `#fca311`, background `#f0ebd8`). |
| **Icons** | Lucide React or Heroicons | SVG; no native dependency. |
| **Maps** | Leaflet + React-Leaflet, or Google Maps JS API | For address picker and distance (replace `react-native-maps`). |
| **Charts** | Recharts or Chart.js | For admin reports/dashboard. |

### 2.3 Dev & Quality

| Layer | Technology |
|-------|------------|
| **Linting** | ESLint (TypeScript + React) |
| **Formatting** | Prettier |
| **Testing** | Vitest (unit), React Testing Library, Playwright or Cypress (e2e) |
| **Env** | Vite env vars (`VITE_*`) for Supabase URL/key |

---

## 3. Project Structure (Suggested)

```
water-tanker-web/
├── .env.example
├── .env                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/                 # Supabase client + typed helpers
    │   ├── supabase.ts
    │   └── types.ts         # Reuse types from mobile (User, Booking, etc.)
    ├── components/
    │   ├── ui/              # Buttons, inputs, cards (shared)
    │   ├── layout/          # Header, sidebar, role-based layout
    │   ├── auth/
    │   ├── customer/
    │   ├── driver/
    │   └── admin/
    ├── pages/               # Route-level components
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   ├── Register.tsx
    │   │   └── RoleEntry.tsx
    │   ├── customer/
    │   │   ├── Home.tsx
    │   │   ├── Booking.tsx
    │   │   ├── OrderHistory.tsx
    │   │   └── Profile.tsx
    │   ├── driver/
    │   │   ├── Orders.tsx
    │   │   ├── Earnings.tsx
    │   │   └── CollectPayment.tsx
    │   └── admin/
    │       ├── Dashboard.tsx
    │       ├── Bookings.tsx
    │       ├── Drivers.tsx
    │       ├── Vehicles.tsx
    │       ├── BankAccounts.tsx
    │       ├── Expenses.tsx
    │       └── Reports.tsx
    ├── store/
    │   ├── authStore.ts     # Mirror mobile authStore (session, user, role)
    │   ├── bookingStore.ts
    │   └── ...
    ├── hooks/
    ├── utils/               # Validation, pricing, date (reuse logic from mobile)
    ├── constants/           # Same config values (PRICING_CONFIG, VALIDATION_CONFIG, etc.)
    └── routes.tsx           # React Router + role-based redirects
```

---

## 4. Backend Integration (Supabase)

### 4.1 Same Project, Same Env

- Use the **same** Supabase project as the mobile app.
- Env vars for **web** (Vite):
  - `VITE_SUPABASE_URL` — same as `EXPO_PUBLIC_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` — same as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4.2 Auth (Browser)

- Supabase client for web should use:
  - `detectSessionInUrl: true` (for OAuth/magic link if you add later).
  - `persistSession: true` and `autoRefreshToken: true`.
- Storage: Supabase uses `localStorage` by default in browser; no change needed.
- No `expo-constants`; read from `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 4.3 Data Model (Already Exists)

Reuse the same:

- **Tables**: `users`, `bookings`, `vehicles`, `bank_accounts`, `expenses`, plus any from migrations (e.g. tanker sizes, pricing).
- **RLS**: All existing RLS policies apply; same roles: `customer`, `driver`, `admin`.
- **Storage**: Bucket `bank-qr-codes` (and any receipt/expense buckets) — same policies.

Reference: mobile app's `src/types/index.ts` (User, Booking, Vehicle, BankAccount, Expense, Address, etc.) and `src/lib/dataAccess.interface.ts` for the operations to implement (get/update bookings, get vehicles by agency, etc.).

### 4.4 Realtime (Optional)

- Use Supabase Realtime on the same tables/channels as mobile (e.g. booking updates, driver location if you expose it on web).

---

## 5. Features to Implement (Aligned with Mobile)

### 5.1 Auth

- Role selection → Login / Register (email + password).
- After login: redirect by role (customer / driver / admin).
- Session restore on refresh (Supabase `getSession` + user fetch).

### 5.2 Customer

- Home: quick book or view recent orders.
- Booking: tanker size, address (map or text + geocode), date/time, price breakdown, submit.
- Order history and order detail (status, driver info if assigned).
- Profile and saved addresses (CRUD).

### 5.3 Driver

- Orders list (filter by status: pending, accepted, in_transit, delivered).
- Accept/update status; optional in-app navigation link (e.g. open in Google Maps).
- Collect payment: mark payment received, optional QR display (reuse same bank QR from Supabase Storage).
- Earnings view (summary stats).

### 5.4 Admin

- Dashboard: bookings count, revenue, drivers, customers (reuse report logic from mobile).
- All bookings: list/filter.
- Driver management: create driver (email/password + profile), list/edit.
- Vehicle management: CRUD per agency.
- Bank accounts: CRUD, upload QR image to Supabase Storage.
- Expenses: CRUD, optional receipt upload.
- Reports: revenue, bookings by status, exports (e.g. Excel/CSV like mobile).

---

## 6. Environment & Config

### 6.1 `.env.example` (Web)

```env
# Supabase (same project as mobile app)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6.2 Constants to Reuse

Copy or mirror from mobile `src/constants/config.ts`:

- `APP_CONFIG`, `BOOKING_CONFIG`, `PRICING_CONFIG`, `VALIDATION_CONFIG`, `UI_CONFIG` (colors, spacing), `ERROR_MESSAGES`, `SUCCESS_MESSAGES`, `DATE_CONFIG`, `FEATURE_FLAGS`.

---

## 7. Security & Deployment

- **Auth**: Rely on Supabase Auth + RLS; no anon key for privileged ops.
- **CORS**: Supabase project already allows browser origins; add your web app URL in Supabase Dashboard (Authentication → URL configuration) if using redirects.
- **Env**: Never commit `.env`; use `VITE_*` only for non-secret config (Supabase anon key is safe for client).
- **HTTPS**: Use HTTPS in production (handled by Vercel/Netlify by default).

---

## 8. Implementation Phases (Suggested)

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| 1 | Project init, Supabase client, auth (login/register/role redirect) | Users can log in on web and land on role-specific home |
| 2 | Customer: booking flow, addresses, order history | Full customer journey on web |
| 3 | Driver: orders list, accept/status, collect payment, earnings | Driver workflow on web |
| 4 | Admin: dashboard, bookings, drivers, vehicles, bank accounts, expenses, reports | Full admin on web |
| 5 | Polish: maps, charts, responsive layout, error handling, loading states | Production-ready web app |

---

## 9. Checklist Before Development

- [ ] Supabase project URL and anon key available for web env.
- [ ] Migrations applied (same as mobile); RLS and storage policies unchanged.
- [ ] Node.js 18+ and npm/pnpm installed.
- [ ] Decision on UI kit (Tailwind only vs Tailwind + shadcn/Chakra).
- [ ] Map provider chosen (Leaflet vs Google Maps) and API key if needed.
- [ ] Hosting chosen (e.g. Vercel) and production URL for Supabase redirects (if using OAuth later).

---

## 10. Summary

| Item | Choice |
|------|--------|
| **Stack** | React + TypeScript + Vite + React Router + Zustand + Supabase |
| **UI** | Tailwind CSS + (optional) shadcn/ui or Chakra UI |
| **Backend** | Same Supabase project as mobile (auth, DB, storage, RLS) |
| **Code reuse** | Types, constants, validation/pricing logic; rewrite UI and routing for web |
| **Deploy** | Static build (e.g. Vercel/Netlify) with `VITE_*` env in dashboard |

This gives you a single source of truth (Supabase) for both mobile and web, with a dedicated, maintainable web codebase.
