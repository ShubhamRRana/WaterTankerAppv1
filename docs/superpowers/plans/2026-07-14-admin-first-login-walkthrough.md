# Admin First-Login Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each new admin a one-time hybrid guided tour after first successful login, persist completion in Supabase, and allow Profile replay.

**Architecture:** Add `admins.walkthrough_seen_at`. A thin service reads/writes it. An `AdminWalkthroughProvider` inside `AdminFullStack` auto-starts when the timestamp is null, navigates through declarative steps (same `useNavigation` pattern as `useAdminPostUnlockNavigation`), and renders a custom overlay (welcome + 4-rect spotlight + route-ticket coachmark). Screens register targets with `WalkthroughTarget`. Replay from Profile starts the same tour without clearing the timestamp.

**Tech Stack:** React Native + Expo, TypeScript, Supabase Postgres + existing `admins_*_own` RLS, Jest + RNTL. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-14-admin-first-login-walkthrough-design.md`

## Global Constraints

- **Ponytail:** No tour library. No SVG mask. No remote CMS. Do not add `walkthroughSeenAt` onto `AdminUser`. Prefer one service + steps module + target registry + overlay + context.
- **Frontend design — route ticket:** Coachmark is a “dispatch ticket”: PlayfairDisplay title, plain body, amber water-fill progress (`colors.accent` `#ffc300`), `colors.surface` card, `colors.overlayDark` dim. Signature motion: ticket slides up once; fill animates on step change; honor reduce-motion. No cream/terracotta, purple, or acid-green.
- **Copy:** “Skip tour”, “Next”, “Finish”, “Replay walkthrough”, “Couldn’t save progress”, “Retry”.
- **Persistence:** Finish/Skip in auto mode write `walkthrough_seen_at` before dismiss. Replay never writes. Migration backfills existing admins so only new accounts auto-start.
- **Gating:** Provider only around `AdminFullStack` (active trial/subscription). Locked stack never shows the tour.
- **Nav pattern:** Call `useNavigation<StackNavigationProp<AdminStackParamList>>()` from a host inside `AdminFullStack`, matching `useAdminPostUnlockNavigation`.
- **Verification:** `npm run typecheck`, `npx jest <path>` from `E:\WaterTankerAppv1`.

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/<ts>_admin_walkthrough_seen_at.sql` | Column + backfill |
| `src/services/walkthrough.service.ts` | Read / mark seen |
| `src/walkthrough/adminSteps.ts` | Steps + `resolveStepTarget` |
| `src/walkthrough/controllerState.ts` | Pure eligibility helpers |
| `src/walkthrough/targetRegistry.ts` | Register / measure |
| `src/walkthrough/WalkthroughTarget.tsx` | Wrapper component |
| `src/components/admin/WalkthroughOverlay.tsx` | Welcome + spotlight UI |
| `src/context/AdminWalkthroughContext.tsx` | State machine + host |
| `src/navigation/AdminNavigator.tsx` | Wire provider |
| Admin screens + Profile | Targets + Replay row |

---

### Task 1: Persistence column + WalkthroughService

**Files:**
- Create: `supabase/migrations/<generated>_admin_walkthrough_seen_at.sql`
- Create: `src/services/walkthrough.service.ts`
- Create: `src/__tests__/services/walkthrough.service.test.ts`
- Modify: `src/lib/supabaseDataAccess.ts` — add `walkthrough_seen_at?: string | null` on `AdminRow` only

**Interfaces:**
- Produces:
  - `WalkthroughService.getSeenAt(adminUserId: string): Promise<Date | null | undefined>` — `null` eligible; `Date` seen; `undefined` load failed
  - `WalkthroughService.markSeen(adminUserId: string): Promise<void>`

- [ ] **Step 1: Create migration**

Run: `npx supabase migration new admin_walkthrough_seen_at`

File contents:

```sql
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS walkthrough_seen_at timestamptz NULL;

COMMENT ON COLUMN public.admins.walkthrough_seen_at IS
  'When the admin completed or skipped the first-login walkthrough; null means eligible for auto-start.';

UPDATE public.admins
SET walkthrough_seen_at = now()
WHERE walkthrough_seen_at IS NULL;
```

No new RLS — `admins_select_own` / `admins_update_own` already cover the column.

- [ ] **Step 2: Write failing service tests**

```typescript
import { WalkthroughService } from '../../services/walkthrough.service';
import { supabase } from '../../lib/supabaseClient';

jest.mock('../../lib/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

describe('WalkthroughService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when walkthrough_seen_at is null', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { walkthrough_seen_at: null }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toBeNull();
  });

  it('returns Date when set', async () => {
    const iso = '2026-07-14T10:00:00.000Z';
    const maybeSingle = jest.fn().mockResolvedValue({ data: { walkthrough_seen_at: iso }, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toEqual(new Date(iso));
  });

  it('returns undefined on error', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    });
    await expect(WalkthroughService.getSeenAt('admin-1')).resolves.toBeUndefined();
  });

  it('markSeen updates timestamp', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      update: () => ({ eq }),
    });
    await WalkthroughService.markSeen('admin-1');
    expect(eq).toHaveBeenCalledWith('user_id', 'admin-1');
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

`npx jest src/__tests__/services/walkthrough.service.test.ts -v`

- [ ] **Step 4: Implement service + AdminRow field**

```typescript
import { supabase } from '../lib/supabaseClient';

export const WalkthroughService = {
  async getSeenAt(adminUserId: string): Promise<Date | null | undefined> {
    const { data, error } = await supabase
      .from('admins')
      .select('walkthrough_seen_at')
      .eq('user_id', adminUserId)
      .maybeSingle();
    if (error) return undefined;
    if (!data || data.walkthrough_seen_at == null) return null;
    return new Date(data.walkthrough_seen_at as string);
  },

  async markSeen(adminUserId: string): Promise<void> {
    const { error } = await supabase
      .from('admins')
      .update({ walkthrough_seen_at: new Date().toISOString() })
      .eq('user_id', adminUserId);
    if (error) throw error;
  },
};
```

- [ ] **Step 5: Tests PASS**

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations src/services/walkthrough.service.ts src/__tests__/services/walkthrough.service.test.ts src/lib/supabaseDataAccess.ts
git commit -m "feat: add admin walkthrough_seen_at persistence"
```

---

### Task 2: Steps + controller helpers

**Files:**
- Create: `src/walkthrough/adminSteps.ts`
- Create: `src/walkthrough/controllerState.ts`
- Create: `src/__tests__/walkthrough/adminSteps.test.ts`
- Create: `src/__tests__/walkthrough/controllerState.test.ts`

**Interfaces:**
- `WalkthroughTargetId`, `AdminWalkthroughStep`, `ADMIN_WALKTHROUGH_STEPS`, `resolveStepTarget`
- `shouldAutoStart(seenAt: Date | null | undefined): boolean` → `seenAt === null`
- `shouldPersistOnClose(mode: 'auto' | 'replay'): boolean` → `mode === 'auto'`

- [ ] **Step 1: Failing tests for steps + helpers**

```typescript
// adminSteps.test.ts
import { ADMIN_WALKTHROUGH_STEPS, resolveStepTarget } from '../../walkthrough/adminSteps';

describe('adminSteps', () => {
  it('orders welcome then each feature', () => {
    expect(ADMIN_WALKTHROUGH_STEPS.map((s) => s.id)).toEqual([
      'welcome', 'bookings', 'drivers', 'vehicles', 'payments', 'expenses', 'reports', 'profile',
    ]);
  });

  it('prefers primary target', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'drivers')!;
    expect(resolveStepTarget(step, new Set(['drivers.add']))).toBe('drivers.add');
  });

  it('uses fallback when primary missing', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'bookings')!;
    expect(resolveStepTarget(step, new Set(['bookings.menu']))).toBe('bookings.menu');
  });

  it('returns null when nothing available', () => {
    const step = ADMIN_WALKTHROUGH_STEPS.find((s) => s.id === 'drivers')!;
    expect(resolveStepTarget(step, new Set())).toBeNull();
  });
});
```

```typescript
// controllerState.test.ts
import { shouldAutoStart, shouldPersistOnClose } from '../../walkthrough/controllerState';

describe('controllerState', () => {
  it('auto-starts only for null', () => {
    expect(shouldAutoStart(null)).toBe(true);
    expect(shouldAutoStart(new Date())).toBe(false);
    expect(shouldAutoStart(undefined)).toBe(false);
  });

  it('persists only in auto mode', () => {
    expect(shouldPersistOnClose('auto')).toBe(true);
    expect(shouldPersistOnClose('replay')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

`controllerState.ts`:

```typescript
export type TourMode = 'auto' | 'replay';

export function shouldAutoStart(seenAt: Date | null | undefined): boolean {
  return seenAt === null;
}

export function shouldPersistOnClose(mode: TourMode): boolean {
  return mode === 'auto';
}
```

`adminSteps.ts` — full step list:

| id | route | title | primary | fallback |
|----|-------|-------|---------|----------|
| welcome | null | Your agency is live | null | — |
| bookings | Bookings | Bookings | bookings.list | bookings.menu |
| drivers | Drivers | Drivers | drivers.add | — |
| vehicles | Vehicles | Vehicles | vehicles.add | — |
| payments | BankAccounts | Payments & QR | payments.qr | — |
| expenses | Expenses | Expenses | expenses.add | — |
| reports | Reports | Reports | reports.summary | — |
| profile | Profile | Profile & subscription | profile.subscription | profile.replay |

Welcome body: `Your free trial has started. This short tour shows how to run bookings, crew, and collections.`

Other bodies: one plain sentence each (see design flow). `resolveStepTarget` prefers primary then fallback.

- [ ] **Step 3: Tests PASS + commit**

```bash
git add src/walkthrough src/__tests__/walkthrough
git commit -m "feat: define admin walkthrough steps and eligibility helpers"
```

---

### Task 3: Target registry + WalkthroughTarget

**Files:**
- Create: `src/walkthrough/targetRegistry.ts`
- Create: `src/walkthrough/WalkthroughTarget.tsx`
- Create: `src/__tests__/walkthrough/targetRegistry.test.ts`

**Interfaces:**
- `targetRegistry.register(id, ref): () => void`
- `targetRegistry.getAvailableIds(): Set<WalkthroughTargetId>`
- `targetRegistry.measure(id): Promise<Rect | null>` — `measureInWindow`, 400ms timeout → null
- `targetRegistry.clear(): void` — tests only
- `<WalkthroughTarget id={...} collapsable={false}>`

- [ ] **Step 1: Failing test for register/unregister**

- [ ] **Step 2: Implement registry + wrapper**

```tsx
// WalkthroughTarget.tsx
export function WalkthroughTarget({ id, children, ...rest }: Props) {
  const ref = useRef<View>(null);
  useEffect(() => targetRegistry.register(id, ref), [id]);
  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}
```

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "feat: add walkthrough target registry"
```

---

### Task 4: WalkthroughOverlay (route-ticket UI)

**Files:**
- Create: `src/components/admin/WalkthroughOverlay.tsx`
- Create: `src/__tests__/components/admin/WalkthroughOverlay.test.tsx`

**Props:**

```typescript
type Rect = { x: number; y: number; width: number; height: number };

type WalkthroughOverlayProps = {
  mode: 'welcome' | 'spotlight' | 'saving' | 'saveError';
  title: string;
  body: string;
  stepIndex: number;
  stepCount: number;
  highlight: Rect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onRetrySave: () => void;
  canGoBack: boolean;
  isLast: boolean;
};
```

**UI rules:**
- Modal transparent, `accessibilityViewIsModal`
- Dim with 4 Views around `highlight` (or one full dim if null)
- Accent ring: 2px `colors.accent`, radius 8
- Ticket: bottom card, 3px accent top strip, Playfair title, water-fill progress bar
- CTAs via existing `Button` / text buttons: Skip tour, Back, Next/Finish
- `saving` disables controls; `saveError` shows Retry
- Announce title/body/progress; respect reduce-motion

- [ ] **Step 1: Component tests for welcome Next + saveError Retry**

- [ ] **Step 2: Implement overlay (~250 lines max)**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "feat: add walkthrough route-ticket overlay"
```

---

### Task 5: AdminWalkthroughContext + navigator wire-up

**Files:**
- Create: `src/context/AdminWalkthroughContext.tsx`
- Create: `src/__tests__/walkthrough/controllerState.test.ts` (if not already from Task 2)
- Modify: `src/navigation/AdminNavigator.tsx`

**Interfaces:**
- `useAdminWalkthrough(): { startReplay: () => void; isActive: boolean }`
- `useOptionalAdminWalkthrough(): ReturnType | null`

**Behavior:**
1. On mount for admin user: `getSeenAt`; if `shouldAutoStart`, set `mode='auto'`, `status='active'`, `stepIndex=0`. If `undefined`, stay idle and retry once on `AppState` `active`.
2. `startReplay()` → `mode='replay'`, `stepIndex=0`, active; never clears timestamp.
3. For each non-welcome step: `navigation.navigate(route)`, wait briefly, `resolveStepTarget` + `measure`; if null after one retry, advance index (skip missing target).
4. Next/Back change index. Last step Finish → `persistAndClose`.
5. Skip/Finish: if `shouldPersistOnClose(mode)`, `markSeen` then close; else close only. Failure → `saveError` + Retry.
6. Logout (`!user`) forces idle.
7. Android `BackHandler`: if active and `stepIndex>0`, back; else no-op (must Skip to exit).

**Wire-up (match existing unlock-nav pattern):**

```tsx
const AdminFullStack: React.FC = () => {
  useAdminPostUnlockNavigation();
  useAdminPendingSubscriptionSuccessNavigation();

  return (
    <AdminWalkthroughProvider>
      <Stack.Navigator screenOptions={screenOptions} initialRouteName="Bookings">
        {/* existing screens unchanged */}
      </Stack.Navigator>
    </AdminWalkthroughProvider>
  );
};
```

Inside provider: call `useNavigation<StackNavigationProp<AdminStackParamList>>()` the same way `useAdminPostUnlockNavigation` does (parent of nested stack under root Admin route). Render children + `WalkthroughOverlay` when active.

- [ ] **Step 1: Test `shouldAutoStart` / `shouldPersistOnClose` if not done; add a focused test that mocked `markSeen` is not called on replay close** (pure function or thin persist helper):

```typescript
export async function persistIfNeeded(
  mode: TourMode,
  adminId: string,
  markSeen: (id: string) => Promise<void>,
): Promise<void> {
  if (!shouldPersistOnClose(mode)) return;
  await markSeen(adminId);
}
```

- [ ] **Step 2: Implement context + wire AdminNavigator**

- [ ] **Step 3: `npm run typecheck` + jest for walkthrough paths**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add admin walkthrough controller"
```

---

### Task 6: Attach targets on admin screens

**Files (wrap existing controls only — no layout redesign):**
- Modify: `src/screens/admin/AllBookingsScreen.tsx` — menu button → `bookings.menu`; list/empty container → `bookings.list`
- Modify: `src/screens/admin/DriverManagementScreen.tsx` — floating add → `drivers.add`
- Modify: `src/screens/admin/VehicleManagementScreen.tsx` — floating add → `vehicles.add`
- Modify: `src/screens/admin/AddBankAccountScreen.tsx` — QR / payment section → `payments.qr`
- Modify: `src/screens/admin/ExpenseScreen.tsx` — Add Expense control → `expenses.add`
- Modify: `src/screens/admin/ReportsScreen.tsx` — summary header/card → `reports.summary`
- Modify: `src/screens/admin/AdminProfileScreen.tsx` — subscription card → `profile.subscription`; Replay row → `profile.replay`

Pattern:

```tsx
import { WalkthroughTarget } from '../../walkthrough/WalkthroughTarget';

<WalkthroughTarget id="drivers.add">
  <TouchableOpacity style={styles.floatingAddButton} ...>
    ...
  </TouchableOpacity>
</WalkthroughTarget>
```

- [ ] **Step 1: Attach all targets listed above**

- [ ] **Step 2: Typecheck**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: register admin walkthrough targets"
```

---

### Task 7: Profile Replay row

**Files:**
- Modify: `src/screens/admin/AdminProfileScreen.tsx`
- Create: `src/__tests__/screens/admin/AdminProfileWalkthroughReplay.test.tsx` (or extend existing profile test if present)

**UI:** In Account card, after Change password, add divider +:

```tsx
<WalkthroughTarget id="profile.replay">
  <SettingsRow
    label="Replay walkthrough"
    onPress={() => useAdminWalkthrough().startReplay()}
    disabled={isDeleting}
    colors={colors}
  />
</WalkthroughTarget>
```

Use `useOptionalAdminWalkthrough()` — if null (locked stack), hide the row.

- [ ] **Step 1: Test that pressing Replay calls `startReplay`**

- [ ] **Step 2: Implement row**

- [ ] **Step 3: PASS + commit**

```bash
git commit -m "feat: add replay walkthrough from admin profile"
```

---

### Task 8: Apply migration + smoke verification

**Files:** migration from Task 1 (apply to remote WaterTankerApp project `ajdcmqbljypgvbhkiwvw`)

- [ ] **Step 1: Apply migration** via Supabase MCP `apply_migration` with the SQL from Task 1 (or `supabase db push` if CLI linked). Name: `admin_walkthrough_seen_at`.

- [ ] **Step 2: Verify column**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'admins' AND column_name = 'walkthrough_seen_at';
```

- [ ] **Step 3: Full local verification**

```bash
npm run typecheck
npx jest src/__tests__/services/walkthrough.service.test.ts src/__tests__/walkthrough src/__tests__/components/admin/WalkthroughOverlay.test.tsx --coverage=false
```

- [ ] **Step 4: Manual smoke (device/simulator)**
  1. New admin account → tour auto-starts after login
  2. Skip → no tour on next login
  3. New admin → Finish → no tour on next login
  4. Profile → Replay walkthrough → tour runs; logout/login still no auto-tour
  5. Confirm existing backfilled admin does not auto-start

- [ ] **Step 5: Final commit if any apply/docs tweaks remain**

```bash
git commit -m "chore: apply admin walkthrough migration notes"
```

Only if there are leftover doc/config changes; skip empty commit.

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| `walkthrough_seen_at` + RLS own-row | 1 (RLS existing) |
| Auto first login only | 5 |
| Hybrid welcome + spotlights | 4, 5 |
| Full feature sequence | 2, 6 |
| Empty/missing target fallback | 2, 5 |
| Skip/Finish persist | 5 |
| Replay from Profile, no clear | 5, 7 |
| Subscription-locked never tours | 5 (FullStack only) |
| Save failure Retry | 4, 5 |
| A11y / theme / reduce-motion | 4 |
| Unit + component tests | 1–7 |
| Existing admins not forced | 1 backfill |

## Ponytail skips (add only if requested)

- Driver walkthrough
- Versioned re-prompt after app updates
- Analytics events
- SVG cutout masks
- Storing seen flag on `AdminUser` / Zustand
