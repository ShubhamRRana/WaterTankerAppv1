# Water Tanker Booking App

Mobile booking app for on-demand water tanker deliveries. Built with React Native + Expo on a Supabase backend. Supports role-aware experiences for customers, drivers, and admins.

## Highlights
- Multi-role auth (customer, driver, admin) with email + password.
- Realtime order updates via Supabase subscriptions.
- Distance-based pricing and Indian numbering format for amounts.
- Driver tools: accept/reject, status updates, earnings, payment collection.
- Admin tools: bookings, drivers, vehicles, reports, bank accounts.

## Tech Stack
- React Native (Expo, TypeScript), React Navigation v6
- Zustand for state management
- Supabase (PostgreSQL, Auth, Realtime)
- Jest + React Native Testing Library

## Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase project with Email provider enabled

## Setup
1) Install dependencies: `npm install`
2) Copy `.env.example` to `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (scripts only, never ship)
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (optional)
3) Start Expo: `npm start`

## Useful Scripts
- `npm start` — run Expo
- `npm run android` / `npm run ios` / `npm run web`
- `npm test` — unit/integration tests
- `npm run test:coverage` — coverage report

## Project Structure (summary)
- `src/components` — shared UI + role-specific components
- `src/screens` — auth, customer, driver, admin screens
- `src/navigation` — navigators per role
- `src/services` — auth, booking, payment, location, notifications, etc.
- `src/store` — Zustand stores
- `src/utils` — pricing, validation, security, formatting
- `scripts/` — tooling, seeds, test helpers

## Testing
- Run all tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

## Supabase Notes
- Ensure realtime publication includes core tables (`bookings`, `notifications`, `users`, `user_roles`, `customers`, `drivers`, `admins`, `bank_accounts`).
- Role selection is required for multi-role accounts; policies depend on `user_roles`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of client bundles; use only for scripts.

## Troubleshooting
- Auth fails: verify env vars and Supabase Email provider.
- Realtime silent: confirm subscription joins publication and client is online.
- RLS denied: ensure matching row in `user_roles` for the chosen role.

## Roadmap (v2)
- Online payments, push notifications, real-time GPS, Distance Matrix, driver self-registration, ratings/reviews, ASAP bookings, performance tuning.

