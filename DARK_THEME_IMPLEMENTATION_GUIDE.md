# Dark Theme Implementation Guide for WebTankerAppv1 (Admin/Driver App)

This document describes how the **dark theme** was implemented in the **water-customer-app** and how it has been applied to **WebTankerAppv1** (admin/driver). The approach uses a **central config** for colors and spacing (no theme toggle): fixed dark theme with a gold accent.

---

## 1. Overview

| Aspect | Implementation |
|--------|----------------|
| **Theme model** | Single dark theme; colors live in a config object. |
| **Config location** | `src/constants/config.ts` (or equivalent) — `UI_CONFIG` with `colors`, `spacing`, `borderRadius`, `fontSize`. |
| **Usage** | Every screen and shared component imports `UI_CONFIG` and uses `UI_CONFIG.colors.*` (and spacing/font tokens) in `StyleSheet` and inline styles. |
| **Status bar** | Set to **light** (light icons/text on dark background) in the root `App` component. |

### Current Repo Status (WebTankerAppv1)

- `UI_CONFIG` dark token set has been applied in `src/constants/config.ts`.
- `StatusBar` is set to light style in `App.tsx`.
- Shared components and major auth/admin/driver screens have been migrated to dark theme tokens.
- All `UI_CONFIG.colors.primary` usages in `src/**/*.tsx` were migrated to accent-driven semantics for CTAs/highlights.

---

## 2. Add or Update Config (UI_CONFIG)

Ensure your app has a config file (e.g. `src/constants/config.ts` or `config/index.ts`). Add or replace the **UI_CONFIG** section with the following. If you already have `UI_CONFIG`, merge the `colors` (and optionally `spacing`, `borderRadius`, `fontSize`) as needed.

```ts
// UI Configuration — Dark theme (gold accent)
export const UI_CONFIG = {
  fonts: {
    primary: 'System',
    bold: 'System',
    fallback: ['System'],
  },
  colors: {
    // Backgrounds
    primary: '#1a1d24',       // Main app background (screens, scroll areas)
    background: '#1a1d24',   // Alternate background where needed
    surface: '#252a33',      // Cards, inputs, drawer panel, elevated surfaces
    surfaceLight: '#2f3540', // Hover/active states, subtle elevation
    secondary: '#3d4552',    // Secondary buttons, borders, neutral surfaces

    // Accent (gold)
    accent: '#ffc300',       // Primary buttons, CTAs, highlights, active states
    accentMuted: '#a08b4a',  // Softer gold for outline buttons, subtle highlights

    // Text
    text: '#f0f2f5',        // Primary text on dark
    textSecondary: '#9ca3af', // Secondary text, placeholders, captions
    textLight: '#ffffff',    // Text on gold/primary buttons

    // Borders
    border: '#3d4552',
    borderLight: '#4a5568',

    // Status
    success: '#34d399',
    warning: '#f59e0b',
    error: '#ef4444',
    disabled: '#6b7280',
    shadow: '#000000',

    // Overlays
    overlaySubtle: 'rgba(255, 255, 255, 0.06)',
    overlayLight: 'rgba(255, 255, 255, 0.2)',
    overlayMedium: 'rgba(255, 255, 255, 0.3)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 10,
    lg: 14,
    xl: 20,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};
```

**Color token reference**

| Token | Hex / Value | Use for |
|-------|--------------|---------|
| `primary` / `background` | `#1a1d24` | Screen backgrounds, ScrollView |
| `surface` | `#252a33` | Cards, inputs, drawer, modals |
| `surfaceLight` | `#2f3540` | Hover, active list items, subtle elevation |
| `secondary` | `#3d4552` | Secondary buttons, borders |
| `accent` | `#ffc300` | Primary buttons, links, active tab, focus ring |
| `accentMuted` | `#a08b4a` | Outline buttons, subtle highlights |
| `text` | `#f0f2f5` | Body and headings |
| `textSecondary` | `#9ca3af` | Captions, placeholders, hints |
| `textLight` | `#ffffff` | Text on accent (e.g. primary button) |
| `border` / `borderLight` | `#3d4552` / `#4a5568` | Dividers, input borders |
| `success` | `#34d399` | Success states |
| `warning` | `#f59e0b` | Pending, caution |
| `error` | `#ef4444` | Errors, destructive actions |
| `disabled` | `#6b7280` | Disabled controls |
| `shadow` | `#000000` | `shadowColor` (use with opacity) |
| `overlayDark` | `rgba(0,0,0,0.6)` | Modal backdrop |

---

## 3. App Entry (StatusBar)

In your root `App.tsx` (or main app component):

- Import: `import { StatusBar } from 'expo-status-bar';` (Expo) or the React Native `StatusBar` as appropriate.
- Set **light** content so status bar icons and time are visible on the dark background:

```tsx
<StatusBar style="light" />
```

If using React Native’s `StatusBar`:

```tsx
<StatusBar barStyle="light-content" backgroundColor="#1a1d24" />
```

---

## 4. Replace Hardcoded Colors Everywhere

Rule: **no hardcoded hex/rgba for UI colors**. Use only `UI_CONFIG.colors.*` (and optionally `UI_CONFIG.spacing`, `UI_CONFIG.borderRadius`, `UI_CONFIG.fontSize`).

### 4.1 Import in every file that styles UI

```ts
import { UI_CONFIG } from '../../constants/config';  // adjust path to your config
```

### 4.2 Common replacements

| Instead of | Use |
|------------|-----|
| `#fff`, `white` (backgrounds) | `UI_CONFIG.colors.background` or `UI_CONFIG.colors.surface` |
| `#000`, `black` (text) | `UI_CONFIG.colors.text` |
| Gray placeholders | `UI_CONFIG.colors.textSecondary` |
| Primary button bg | `UI_CONFIG.colors.accent` |
| Text on primary button | `UI_CONFIG.colors.textLight` |
| Card/panel bg | `UI_CONFIG.colors.surface` |
| Input bg | `UI_CONFIG.colors.surface` |
| Input border | `UI_CONFIG.colors.border` |
| Focus/active border | `UI_CONFIG.colors.accent` |
| Dividers | `UI_CONFIG.colors.border` or `borderLight` |
| Error border/text | `UI_CONFIG.colors.error` |
| Success text/icon | `UI_CONFIG.colors.success` |
| Warning text/icon | `UI_CONFIG.colors.warning` |
| Modal backdrop | `UI_CONFIG.colors.overlayDark` |
| Shadow color | `UI_CONFIG.colors.shadow` |
| Disabled button | `UI_CONFIG.colors.disabled` |

---

## 5. Component-by-Component Patterns

### 5.1 Typography

- All text variants (h1–h4, body, caption) use:
  - `color: UI_CONFIG.colors.text` for primary,
  - `color: UI_CONFIG.colors.textSecondary` for secondary/captions.
- Font sizes from `UI_CONFIG.fontSize` (e.g. `fontSize.xxl`, `fontSize.md`).

### 5.2 TextInput / Input

- Container: no background or `surface` if needed.
- Input:
  - `backgroundColor: UI_CONFIG.colors.surface`
  - `borderColor: UI_CONFIG.colors.border`
  - `color: UI_CONFIG.colors.text`
- **Important:** set `placeholderTextColor={UI_CONFIG.colors.textSecondary}`.
- Focus: `borderColor: UI_CONFIG.colors.accent`.
- Error: `borderColor` and error text `color: UI_CONFIG.colors.error`.

### 5.3 Buttons

- **Primary:**  
  `backgroundColor` and `borderColor`: `UI_CONFIG.colors.accent`  
  Text: `UI_CONFIG.colors.textLight`
- **Secondary / Outline:**  
  Background: `UI_CONFIG.colors.surface` or `'transparent'`  
  Border: `UI_CONFIG.colors.accent`  
  Text: `UI_CONFIG.colors.accent`
- **Disabled:**  
  `backgroundColor` and `borderColor`: `UI_CONFIG.colors.disabled`  
  Text: `UI_CONFIG.colors.textSecondary`
- `shadowColor`: `UI_CONFIG.colors.shadow`

### 5.4 Cards

- `backgroundColor: UI_CONFIG.colors.surface`
- `borderColor: UI_CONFIG.colors.border`
- `shadowColor: UI_CONFIG.colors.shadow`
- Padding from `UI_CONFIG.spacing`, radius from `UI_CONFIG.borderRadius`

### 5.5 Screens (containers)

- Root container (e.g. `SafeAreaView` or main `View`):  
  `backgroundColor: UI_CONFIG.colors.background`
- `ScrollView`:  
  `style={{ flex: 1, backgroundColor: UI_CONFIG.colors.background }}`
- Header bar (if custom):  
  `backgroundColor: UI_CONFIG.colors.surface` or `background`,  
  `borderBottomColor: UI_CONFIG.colors.border`

### 5.6 Lists / list items

- Item bg: `UI_CONFIG.colors.surface` or `surfaceLight` for pressed/active.
- Separator: `UI_CONFIG.colors.border`.
- Text: `UI_CONFIG.colors.text`, secondary: `UI_CONFIG.colors.textSecondary`.

### 5.7 Modals / overlay panels

- Backdrop: `backgroundColor: UI_CONFIG.colors.overlayDark`.
- Panel: `backgroundColor: UI_CONFIG.colors.surface`, `borderColor: UI_CONFIG.colors.border`, `shadowColor: UI_CONFIG.colors.shadow`.

### 5.8 Icons (e.g. Ionicons)

- Use theme colors:  
  `color={UI_CONFIG.colors.text}`, `UI_CONFIG.colors.accent`, `UI_CONFIG.colors.textSecondary`, `UI_CONFIG.colors.error`, etc., so they match the dark theme.

### 5.9 Status chips / badges

- Map status to tokens:  
  e.g. pending → `warning`, success/delivered → `success`, cancelled/error → `error`, in progress → `accent` or `secondary`.  
  Use `UI_CONFIG.colors.<token>` for bg and text.

---

## 6. Files to Touch (checklist for WebTankerAppv1)

Apply the following in your admin/driver app:

1. **Config**
   - [x] Add or update `UI_CONFIG` (including `colors`) in your constants/config file.

2. **App entry**
   - [x] Set `StatusBar` to light style and optional dark background.

3. **Shared components** (paths may differ)
   - [x] Button — primary/secondary/outline/disabled and text colors from `UI_CONFIG`.
   - [x] Input / TextInput — background, border, text, placeholder, focus, error.
   - [x] Card — surface, border, shadow.
   - [x] Typography — text and textSecondary, font sizes from config.
   - [x] LoadingSpinner — color from `UI_CONFIG.colors.accent` (or textSecondary).
   - [x] ErrorBoundary — background, text, error color from config.
   - [x] MenuDrawer / side panel — overlay, surface, border, text, accent, logout error.

4. **Screens**
   - [x] Auth (Login, Register, etc.) — container background, inputs, buttons, links, icons.
   - [x] Admin/Driver home/dashboard — background, cards, headers, list items.
   - [x] List/order screens — list bg, item surface, separators, status colors, icons.
   - [x] Detail screens — background, surface cards, text, buttons, icons.
   - [x] Profile/Settings — same as above; ensure inputs and buttons use config.

5. **Modals / dialogs**
   - [x] Modal overlay and panel use `overlayDark`, `surface`, `border`, `shadow`.
   - [x] All text and icons inside modals use `text`, `textSecondary`, `accent`, `error`, etc.

6. **Navigation**
   - [x] If you use custom header/tab bar, set their background and text colors from `UI_CONFIG` (e.g. `surface`, `text`, `accent`).

---

## 7. Quick Find Checklist

In WebTankerAppv1, search for:

- `backgroundColor: '#'` or `backgroundColor: '#fff'` / `'white'` → replace with `UI_CONFIG.colors.background` or `surface`.
- `color: '#'` or `color: 'white'` / `'black'` → replace with `UI_CONFIG.colors.text` or `textLight`/`textSecondary`.
- `borderColor: '#'` → replace with `UI_CONFIG.colors.border` or `accent` (focus) or `error`.
- `placeholderTextColor` → set to `UI_CONFIG.colors.textSecondary`.
- `shadowColor` → `UI_CONFIG.colors.shadow`.
- Any hardcoded status colors → map to `success`, `warning`, `error`, `accent`, `secondary`.

---

## 8. Optional: Central export

If you have a barrel file for constants:

```ts
// e.g. src/constants/index.ts
export { UI_CONFIG, ... } from './config';
```

Then components can import: `import { UI_CONFIG } from '../constants';`.

---

## 9. Summary

- **One source of truth:** `UI_CONFIG` in config (colors + spacing/borderRadius/fontSize).
- **Status bar:** Light content on dark background.
- **No hardcoded UI colors:** Use only `UI_CONFIG.colors.*` (and related tokens) everywhere.
- **Consistent semantics:** `surface` for elevated UI, `background` for screens, `accent` for primary actions, `text`/`textSecondary`/`textLight` for typography.

Applying these steps in WebTankerAppv1 will align the admin/driver app’s UI with the same dark theme used in the customer app.

---

## 10. Implemented File Scope (WebTankerAppv1)

The following files were updated in this migration pass:

- `src/constants/config.ts`
- `App.tsx`
- `src/components/common/Button.tsx`
- `src/components/common/Card.tsx`
- `src/components/common/LoadingSpinner.tsx`
- `src/components/common/MenuDrawer.tsx`
- `src/screens/auth/RoleEntryScreen.tsx`
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/RegisterScreen.tsx`
- `src/screens/admin/AddBankAccountScreen.tsx`
- `src/components/admin/EditProfileForm.tsx`
- `src/components/admin/AddDriverModal.tsx`
- `src/components/admin/BookingCard.tsx`
- `src/components/admin/ProfileHeader.tsx`
- `src/components/driver/OrdersList.tsx`
- `src/screens/admin/AllBookingsScreen.tsx`
- `src/screens/admin/DriverManagementScreen.tsx`
- `src/screens/admin/ExpenseScreen.tsx`
- `src/screens/admin/ReportsScreen.tsx`
- `src/screens/admin/VehicleManagementScreen.tsx`
- `src/screens/driver/CollectPaymentScreen.tsx`

### Optional follow-up hardening

- Run visual QA for contrast and readability on low-brightness devices.
- Standardize any remaining direct `rgba(...)` overlays to `UI_CONFIG.colors.overlay*`.
- Refresh snapshot/UI tests if your tests assert exact color values.
