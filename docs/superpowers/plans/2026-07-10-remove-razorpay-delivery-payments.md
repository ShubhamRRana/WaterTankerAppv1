# Remove Razorpay from Delivery Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Razorpay online-payment path for delivery/booking payments; the driver shows the agency's uploaded QR at delivery, records payment as QR or cash, and the delivery is marked complete. All Razorpay Route (linked-account/payout) infrastructure is removed.

**Architecture:** React Native (Expo) app with role stacks (admin/driver), Supabase backend with Deno edge functions. Payments recorded in `payment_transactions` table; bookings in `bookings`. The manual-QR display and cash recording already exist — this plan adds QR recording, removes the Razorpay delivery/Route code paths, and trims the webhook to subscription-only.

**Tech Stack:** React Native + Expo, TypeScript, Supabase (Postgres + Deno edge functions), Jest.

**Spec:** `docs/superpowers/specs/2026-07-10-remove-razorpay-delivery-payments-design.md`

## Global Constraints

- **DO NOT touch the subscription payment flow:** `SubscriptionCheckoutScreen`, `create-subscription-order`, `verify-subscription-payment`, subscription handling in `razorpay-webhook`, `razorpayCheckout.service.ts`, `react-native-razorpay` dependency — all stay.
- **NO database migrations.** Schema and historical data untouched. The `agency_razorpay_accounts` table keeps storing `allow_cash_collection` (still read/written); `default_collection_method` column stays but is no longer read or written.
- Verification commands: `npm run typecheck`, `npm run typecheck:test`, `npx jest <path>` (all run from `E:\WaterTankerAppv1`).
- Windows PowerShell environment; `git rm -r` works for deletions.
- QR payment recording is driver self-reported (no gateway verification) — same trust model as cash.

---

### Task 1: Add QR payment recording to PaymentService

**Files:**
- Modify: `src/services/payment.service.ts` (around lines 170–212, `recordCashPayment`)
- Test: `src/__tests__/services/payment.service.test.ts`

**Interfaces:**
- Consumes: existing `dataAccess.bookings`, `supabase` client, `generateShortId`.
- Produces: `PaymentService.recordQrPayment(bookingId: string, note?: string): Promise<PaymentResult>` — records a `payment_transactions` row with `payment_gateway: 'manual_qr'`, `payment_method: 'qr'`, paymentId prefixed `qr_`, and marks the booking `paymentStatus: 'completed'`, `status: 'delivered'`, `deliveredAt` set. `recordCashPayment` keeps its exact existing signature and behavior (prefix `cash_`, gateway/method `'cash'`).

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/services/payment.service.test.ts`, after the `recordCashPayment` describe block:

```typescript
  describe('recordQrPayment', () => {
    it('marks booking delivered and inserts qr ledger row', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(mockBooking);
      (dataAccess.bookings.updateBooking as jest.Mock).mockResolvedValue(undefined);
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await PaymentService.recordQrPayment('booking-1', 'driver_qr');

      expect(result.success).toBe(true);
      expect(result.paymentId).toMatch(/^qr_booking-1_/);
      expect(dataAccess.bookings.updateBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.objectContaining({
          paymentStatus: 'completed',
          status: 'delivered',
        })
      );
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_gateway: 'manual_qr',
          payment_method: 'qr',
        })
      );
    });

    it('returns error when booking not found', async () => {
      (dataAccess.bookings.getBookingById as jest.Mock).mockResolvedValue(null);

      const result = await PaymentService.recordQrPayment('missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Booking not found');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/payment.service.test.ts -t recordQrPayment`
Expected: FAIL — `PaymentService.recordQrPayment is not a function`

- [ ] **Step 3: Implement — generalize recordCashPayment into a shared helper**

In `src/services/payment.service.ts`, replace the entire `recordCashPayment` method (lines 170–212) with:

```typescript
  private static async recordManualPayment(
    bookingId: string,
    method: 'cash' | 'qr',
    note?: string
  ): Promise<PaymentResult> {
    try {
      const booking = await dataAccess.bookings.getBookingById(bookingId);
      if (!booking) return { success: false, error: 'Booking not found' };
      const paymentId = `${method}_${bookingId}_${Date.now()}_${generateShortId()}`;
      const amount = booking.deliveredAmount ?? booking.totalPrice;
      const agencyId = booking.agencyId;
      const { data: authData } = await supabase.auth.getUser();
      const driverId = authData.user?.id;

      await dataAccess.bookings.updateBooking(bookingId, {
        paymentStatus: 'completed',
        paymentId,
        status: 'delivered',
        deliveredAt: new Date(),
      });

      if (driverId && agencyId) {
        await supabase.from('payment_transactions').insert({
          user_id: driverId,
          amount,
          currency: 'INR',
          payment_gateway: method === 'qr' ? 'manual_qr' : 'cash',
          gateway_transaction_id: paymentId,
          status: 'success',
          payment_method: method,
          metadata: {
            flow: 'driver_delivery',
            booking_id: bookingId,
            agency_id: agencyId,
            note: note ?? `driver_${method}`,
          },
          initiated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }

      return { success: true, paymentId };
    } catch (error) {
      handleError(error, { context: { operation: 'recordManualPayment', bookingId, method, note } });
      return { success: false, error: getErrorMessage(error, 'Payment recording failed') };
    }
  }

  static async recordCashPayment(bookingId: string, note?: string): Promise<PaymentResult> {
    return this.recordManualPayment(bookingId, 'cash', note);
  }

  static async recordQrPayment(bookingId: string, note?: string): Promise<PaymentResult> {
    return this.recordManualPayment(bookingId, 'qr', note);
  }
```

Note: the old cash row used `note: note ?? 'driver_cash'` — the template `driver_${method}` preserves that default exactly.

- [ ] **Step 4: Run the full payment service test file**

Run: `npx jest src/__tests__/services/payment.service.test.ts`
Expected: PASS — all existing `recordCashPayment` / `confirmCODPayment` tests still pass (cash prefix `cash_` unchanged), plus the two new `recordQrPayment` tests.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expected: no errors.

```bash
git add src/services/payment.service.ts src/__tests__/services/payment.service.test.ts
git commit -m "feat: add driver QR payment recording to PaymentService"
```

---

### Task 2: Create CollectionSettingsService (allow-cash setting without payout service)

**Files:**
- Create: `src/services/collectionSettings.service.ts`
- Modify: `src/services/index.ts`
- Test: `src/__tests__/services/collectionSettings.service.test.ts`

**Interfaces:**
- Consumes: `subscriptionDataAccess.getAgencyRazorpayAccount(agencyId)` and `subscriptionDataAccess.upsertAgencyRazorpaySettings(agencyId, settings)` from `src/lib/subscriptionDataAccess.ts` (existing; leave that file unchanged in this task).
- Produces:
  - `CollectionSettingsService.getAllowCashCollection(agencyId: string): Promise<boolean>` — returns the stored flag, `true` when no row exists.
  - `CollectionSettingsService.setAllowCashCollection(agencyId: string, allowCashCollection: boolean): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/services/collectionSettings.service.test.ts`:

```typescript
jest.mock('../../lib/subscriptionDataAccess', () => ({
  subscriptionDataAccess: {
    getAgencyRazorpayAccount: jest.fn(),
    upsertAgencyRazorpaySettings: jest.fn(),
  },
}));

import { subscriptionDataAccess } from '../../lib/subscriptionDataAccess';
import { CollectionSettingsService } from '../../services/collectionSettings.service';

describe('CollectionSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllowCashCollection', () => {
    it('returns stored flag when a settings row exists', async () => {
      (subscriptionDataAccess.getAgencyRazorpayAccount as jest.Mock).mockResolvedValue({
        allowCashCollection: false,
      });

      await expect(CollectionSettingsService.getAllowCashCollection('agency-1')).resolves.toBe(false);
    });

    it('defaults to true when no row exists', async () => {
      (subscriptionDataAccess.getAgencyRazorpayAccount as jest.Mock).mockResolvedValue(null);

      await expect(CollectionSettingsService.getAllowCashCollection('agency-1')).resolves.toBe(true);
    });

    it('defaults to true when the read fails', async () => {
      (subscriptionDataAccess.getAgencyRazorpayAccount as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(CollectionSettingsService.getAllowCashCollection('agency-1')).resolves.toBe(true);
    });
  });

  describe('setAllowCashCollection', () => {
    it('persists the flag', async () => {
      (subscriptionDataAccess.upsertAgencyRazorpaySettings as jest.Mock).mockResolvedValue(undefined);

      await CollectionSettingsService.setAllowCashCollection('agency-1', false);

      expect(subscriptionDataAccess.upsertAgencyRazorpaySettings).toHaveBeenCalledWith('agency-1', {
        allowCashCollection: false,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/services/collectionSettings.service.test.ts`
Expected: FAIL — cannot find module `../../services/collectionSettings.service`

- [ ] **Step 3: Implement the service**

Create `src/services/collectionSettings.service.ts`:

```typescript
import { subscriptionDataAccess } from '../lib/subscriptionDataAccess';

/**
 * Per-agency payment collection settings. Drivers collect delivery payments via
 * the agency's uploaded QR code; cash can additionally be allowed or disabled
 * by the admin. Settings are stored on the agency_razorpay_accounts row
 * (legacy table name; only allow_cash_collection is used).
 */
export class CollectionSettingsService {
  static async getAllowCashCollection(agencyId: string): Promise<boolean> {
    try {
      const account = await subscriptionDataAccess.getAgencyRazorpayAccount(agencyId);
      return account?.allowCashCollection ?? true;
    } catch {
      return true;
    }
  }

  static async setAllowCashCollection(
    agencyId: string,
    allowCashCollection: boolean
  ): Promise<void> {
    await subscriptionDataAccess.upsertAgencyRazorpaySettings(agencyId, { allowCashCollection });
  }
}
```

Add to `src/services/index.ts` after the `BankAccountService` export line:

```typescript
export { CollectionSettingsService } from './collectionSettings.service';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/services/collectionSettings.service.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expected: no errors.

```bash
git add src/services/collectionSettings.service.ts src/services/index.ts src/__tests__/services/collectionSettings.service.test.ts
git commit -m "feat: add CollectionSettingsService for allow-cash setting"
```

---

### Task 3: Rework driver CollectPaymentScreen — QR/cash recording only

**Files:**
- Modify: `src/screens/driver/CollectPaymentScreen.tsx`

**Interfaces:**
- Consumes: `PaymentService.recordQrPayment(bookingId, note?)` (Task 1), `PaymentService.recordCashPayment(bookingId, note?)`, `CollectionSettingsService.getAllowCashCollection(agencyId)` (Task 2), existing `BankAccountService`, `AmountInputModal`, `PaymentResult` navigation route.
- Produces: driver flow with two recording buttons ("Payment received via QR", "Cash collected") that mark the booking paid + delivered; a "Complete Delivery" button only for already-paid bookings. No Razorpay checkout, no payout-status checks.

There are no component tests for this screen in the repo; verification is typecheck + existing suite. Apply the following edits.

- [ ] **Step 1: Replace imports (lines 11–14)**

Old:

```typescript
import { BankAccountService, PaymentService, AgencyPayoutService } from '../../services';
import { openCheckout } from '../../services/razorpayCheckout.service';
import { FEATURE_FLAGS, ERROR_MESSAGES } from '../../constants/config';
import { getBookingPaymentChipLabel, getBookingPaymentChip, canCollectOnlinePayment } from '../../utils/paymentDisplay';
```

New:

```typescript
import { BankAccountService, PaymentService, CollectionSettingsService } from '../../services';
import { getBookingPaymentChipLabel, getBookingPaymentChip } from '../../utils/paymentDisplay';
```

- [ ] **Step 2: Remove dead state (lines 39–41)**

Delete these three state declarations:

```typescript
  const [defaultCollectionMethod, setDefaultCollectionMethod] = useState<'razorpay' | 'manual_qr'>('manual_qr');
  const [payoutActive, setPayoutActive] = useState(false);
  const [agencySettingsLoaded, setAgencySettingsLoaded] = useState(false);
```

Keep `allowCash` state as-is.

- [ ] **Step 3: Simplify settings loading in `loadBooking` (lines 82–101)**

Replace the block:

```typescript
      if (bookingData.agencyId) {
        try {
          const account = await AgencyPayoutService.getLocalAccount(bookingData.agencyId);
          if (account) {
            setAllowCash(account.allowCashCollection);
            setDefaultCollectionMethod(account.defaultCollectionMethod);
          }
          const routeStatus = await AgencyPayoutService.getAccountStatus();
          setPayoutActive(routeStatus.status === 'active');
          if (routeStatus.allowCashCollection !== undefined) {
            setAllowCash(routeStatus.allowCashCollection);
          }
          if (routeStatus.defaultCollectionMethod) {
            setDefaultCollectionMethod(routeStatus.defaultCollectionMethod);
          }
        } catch {
          setPayoutActive(false);
        } finally {
          setAgencySettingsLoaded(true);
        }
```

with:

```typescript
      if (bookingData.agencyId) {
        setAllowCash(await CollectionSettingsService.getAllowCashCollection(bookingData.agencyId));
```

(The QR-code loading block that follows — `setLoadingQRCode(true) …` — stays exactly as-is; the closing braces must remain balanced: the `if (bookingData.agencyId) {` block still wraps both the allow-cash line and the QR loading block.)

- [ ] **Step 4: Replace `handleRazorpayCollect` (lines 135–209) with `handleQrCollected`**

Delete the entire `handleRazorpayCollect` function and add in its place:

```typescript
  const handleQrCollected = async () => {
    if (!orderId || !booking) return;
    if (!booking.deliveredAmount || !booking.deliveredTankerLiters) {
      setShowDeliveryModal(true);
      return;
    }
    if (booking.paymentStatus === 'completed') {
      navigation.navigate('PaymentResult', {
        type: 'delivery',
        status: 'success',
        message: 'This booking is already paid.',
        ...(booking.paymentId ? { referenceId: booking.paymentId } : {}),
      });
      return;
    }

    setCollectingPayment(true);
    try {
      const result = await PaymentService.recordQrPayment(orderId, 'driver_qr');
      if (!result.success) {
        navigation.navigate('PaymentResult', {
          type: 'delivery',
          status: 'failed',
          message: result.error ?? 'Failed to record QR payment',
        });
        return;
      }
      navigation.replace('PaymentResult', {
        type: 'delivery',
        status: 'success',
        message: 'QR payment recorded and delivery completed.',
        ...(result.paymentId ? { referenceId: result.paymentId } : {}),
      });
    } finally {
      setCollectingPayment(false);
    }
  };
```

`handleCashPayment` stays exactly as-is.

- [ ] **Step 5: Simplify the completion gate in `handleCompleteDelivery` (lines 253–263)**

Replace:

```typescript
    if (FEATURE_FLAGS.enableOnlinePayment && booking.paymentStatus !== 'completed') {
      const needsOnline =
        defaultCollectionMethod === 'razorpay' || !allowCash;
      Alert.alert(
        'Payment required',
        needsOnline
          ? 'Collect payment via Razorpay before completing delivery.'
          : 'Collect payment via Razorpay or record cash before completing delivery.'
      );
      return;
    }
```

with:

```typescript
    if (booking.paymentStatus !== 'completed') {
      Alert.alert(
        'Payment required',
        'Record the QR or cash payment before completing delivery.'
      );
      return;
    }
```

Also update the copy in `handleSubmitDelivery`'s success alert (line 308) from
`'Delivery amount saved. Now collect payment and tap “Payment Collected”.'` to
`'Delivery amount saved. Now collect the payment via QR or cash and record it.'`

- [ ] **Step 6: Replace the render-flags and button JSX (lines 354–363 and 395–419, 454–463)**

Delete the flag computations:

```typescript
  const showOnlineCollect =
    FEATURE_FLAGS.enableOnlinePayment &&
    booking.paymentStatus !== 'completed' &&
    canCollectOnlinePayment(booking, payoutActive) &&
    (defaultCollectionMethod === 'razorpay' || payoutActive);
  const showManualQrPrimary = defaultCollectionMethod === 'manual_qr';
  const showPaymentCollectedButton =
    !FEATURE_FLAGS.enableOnlinePayment ||
    booking.paymentStatus === 'completed' ||
    (defaultCollectionMethod === 'manual_qr' && allowCash);
```

and add instead:

```typescript
  const paymentPending = booking.paymentStatus !== 'completed' && booking.status !== 'cancelled';
```

In the JSX, replace the `showOnlineCollect` block **and** the `!payoutActive` warning block (everything from `{showOnlineCollect ? (` through the `) : null}` after `ERROR_MESSAGES.payment.agencyNotOnboarded`) with:

```tsx
                {paymentPending ? (
                  <View style={styles.buttonContainer}>
                    <Button
                      title={collectingPayment ? 'Recording...' : 'Payment received via QR'}
                      onPress={() => void handleQrCollected()}
                      disabled={collectingPayment}
                      style={styles.okButton}
                    />
                    {allowCash ? (
                      <Button
                        title="Cash collected"
                        variant="outline"
                        onPress={() => void handleCashPayment()}
                        disabled={collectingPayment}
                        style={styles.backButton}
                      />
                    ) : null}
                  </View>
                ) : null}
```

In the QR section title, replace
`{showManualQrPrimary ? 'Manual QR (scan to pay)' : 'Scan QR Code to Pay'}` with the literal
`Scan QR code to pay`.

Replace the bottom "Payment Collected" block:

```tsx
          {showPaymentCollectedButton ? (
            <View style={styles.buttonContainer}>
              <Button
                title="Payment Collected"
                onPress={handleCompleteDelivery}
                style={styles.okButton}
                disabled={collectingPayment}
              />
            </View>
          ) : null}
```

with (button only for already-paid bookings that aren't marked delivered yet):

```tsx
          {booking.paymentStatus === 'completed' && booking.status !== 'delivered' ? (
            <View style={styles.buttonContainer}>
              <Button
                title="Complete Delivery"
                onPress={handleCompleteDelivery}
                style={styles.okButton}
                disabled={collectingPayment}
              />
            </View>
          ) : null}
```

Styles (`createStyles`) are unchanged.

- [ ] **Step 7: Verify**

Run: `npm run typecheck`
Expected: no errors. If TS reports unused imports in this file (e.g. `ERROR_MESSAGES` if now unused), remove them.

Run: `npx jest`
Expected: PASS (full suite — no test touches this screen).

- [ ] **Step 8: Commit**

```bash
git add src/screens/driver/CollectPaymentScreen.tsx
git commit -m "feat: driver records delivery payment via QR or cash, no Razorpay checkout"
```

---

### Task 4: Remove payout status from the admin subscription gate

**Files:**
- Modify: `src/utils/subscriptionGating.ts`
- Modify: `src/context/AdminSubscriptionGateContext.tsx`
- Modify: `src/navigation/AdminNavigator.tsx:105` (banner slot)
- Delete: `src/components/admin/AdminPayoutBanner.tsx`
- Test: `src/__tests__/utils/subscriptionGating.test.ts`

**Interfaces:**
- Consumes: `SubscriptionService.hasActiveSubscription(adminId)` (unchanged).
- Produces: `checkAdminSubscriptionGate(adminId): Promise<{ hasActive: boolean }>` and `useAdminSubscriptionGate()` context value without `payoutActive`/`payoutStatus`. Later tasks rely on the gate exposing only `{ hasActive, loading, refresh, unlockNavigateTo, clearUnlockNavigate }`.

- [ ] **Step 1: Rewrite the failing test first**

Replace the entire contents of `src/__tests__/utils/subscriptionGating.test.ts` with:

```typescript
import { SubscriptionService } from '../../services/subscription.service';
import { checkAdminSubscriptionGate } from '../../utils/subscriptionGating';

jest.mock('../../services/subscription.service', () => ({
  SubscriptionService: {
    hasActiveSubscription: jest.fn(),
  },
}));

describe('checkAdminSubscriptionGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hasActive true when the agency subscription is active', async () => {
    jest.mocked(SubscriptionService.hasActiveSubscription).mockResolvedValue(true);

    await expect(checkAdminSubscriptionGate('agency-1')).resolves.toEqual({ hasActive: true });
  });

  it('returns hasActive false when the agency subscription is inactive', async () => {
    jest.mocked(SubscriptionService.hasActiveSubscription).mockResolvedValue(false);

    await expect(checkAdminSubscriptionGate('agency-1')).resolves.toEqual({ hasActive: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/utils/subscriptionGating.test.ts`
Expected: FAIL — the current implementation returns `payoutActive`/`payoutStatus` keys, so `toEqual({ hasActive: true })` fails.

- [ ] **Step 3: Simplify `src/utils/subscriptionGating.ts`**

- Remove the import of `AgencyPayoutService, type LinkedAccountStatus` (line 3).
- Delete the `isPayoutSetupComplete` function (lines 22–26).
- Replace `checkAdminSubscriptionGate` (lines 28–42) with:

```typescript
export async function checkAdminSubscriptionGate(adminId: string): Promise<{
  hasActive: boolean;
}> {
  const hasActive = await SubscriptionService.hasActiveSubscription(adminId);
  return { hasActive };
}
```

Everything else in the file (`DRIVER_LOCK_MODE`, `ADMIN_LOCKED_ROUTES`, `isAdminRouteAllowedWhenLocked`, `assertAgencySubscriptionActive`, `isSubscriptionGatingEnabled`) stays.

- [ ] **Step 4: Simplify `src/context/AdminSubscriptionGateContext.tsx`**

- Remove the import `import type { LinkedAccountStatus } from '../services/agencyPayout.service';` (line 7).
- In `AdminSubscriptionGateValue` (lines 13–21), delete `payoutActive: boolean;` and `payoutStatus: LinkedAccountStatus['status'];`.
- Delete the `payoutActive`/`payoutStatus` state (lines 45–46).
- In `refresh` (lines 54–84): delete `setPayoutActive(false); setPayoutStatus('not_started');` from the no-user branch, delete `setPayoutActive(gate.payoutActive); setPayoutStatus(gate.payoutStatus);` after `checkAdminSubscriptionGate`, and delete them from the `catch` block.
- Delete the entire 60-second polling effect (lines 101–109 — it existed only to poll payout status):

```typescript
  useEffect(() => {
    if (!user?.id || payoutActive) return;

    const interval = setInterval(() => {
      void refresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [user?.id, payoutActive, refresh]);
```

- In the `useMemo` value (lines 111–122), remove `payoutActive,` and `payoutStatus,` from both the object and the dependency array.

- [ ] **Step 5: Delete the banner and its slot**

```bash
git rm src/components/admin/AdminPayoutBanner.tsx
```

In `src/navigation/AdminNavigator.tsx`:
- Remove line 23: `import AdminPayoutBanner from '../components/admin/AdminPayoutBanner';`
- Change line 105 from
  `{locked ? <AdminSubscriptionLockedBanner /> : <AdminPayoutBanner />}` to
  `{locked ? <AdminSubscriptionLockedBanner /> : null}`

- [ ] **Step 6: Verify**

Run: `npx jest src/__tests__/utils/subscriptionGating.test.ts` — expected: PASS (2 tests).
Run: `npm run typecheck` — expected: no errors (nothing else consumes `payoutActive`/`payoutStatus` after Task 3).
Run: `npx jest` — expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: drop Razorpay payout status from admin subscription gate"
```

---

### Task 5: Remove admin Route/payout screens; rework bank accounts screen

**Files:**
- Delete: `src/screens/admin/payments/RazorpayAccountSetupScreen.tsx`
- Delete: `src/screens/admin/payments/AgencyPayoutsScreen.tsx`
- Modify: `src/navigation/AdminNavigator.tsx`
- Modify: `src/components/common/AdminMenuDrawer.tsx`
- Modify: `src/screens/admin/AddBankAccountScreen.tsx`
- Modify: `src/screens/admin/payments/DeliveryPaymentHistoryScreen.tsx`

**Interfaces:**
- Consumes: `CollectionSettingsService` (Task 2), `PaymentService.getAgencyDeliveryPayments(agencyId)` (existing, stays).
- Produces: `AdminStackParamList` without `RazorpayAccountSetup`/`AgencyPayouts`; `AdminRoute` union without those two routes. Task 6 relies on there being **zero** remaining imports of `AgencyPayoutService` outside `src/services/`.

- [ ] **Step 1: Delete the two screens**

```bash
git rm src/screens/admin/payments/RazorpayAccountSetupScreen.tsx src/screens/admin/payments/AgencyPayoutsScreen.tsx
```

- [ ] **Step 2: Update `src/navigation/AdminNavigator.tsx`**

- Remove imports (lines 17–18): `RazorpayAccountSetupScreen`, `AgencyPayoutsScreen`.
- Remove from `AdminStackParamList` (lines 49–50): `RazorpayAccountSetup: undefined;` and `AgencyPayouts: undefined;`.
- Remove the two `Stack.Screen` lines (91–92) for `RazorpayAccountSetup` and `AgencyPayouts`.

- [ ] **Step 3: Update `src/components/common/AdminMenuDrawer.tsx`**

- Remove `'RazorpayAccountSetup'` and `'AgencyPayouts'` from the `AdminRoute` union (lines 17–18).
- In `ALL_MENU_ITEMS`, change the `BankAccounts` item label from `'Payments & Payouts'` to `'Payments & QR'`, and the `DeliveryPaymentHistory` item label from `'Payout history'` to `'Payment history'`.

- [ ] **Step 4: Rework `src/screens/admin/AddBankAccountScreen.tsx`**

- Change the services import (line 24) to:
  `import { BankAccountService, StorageService, CollectionSettingsService } from '../../services';`
- Delete state (lines 336, 339): `defaultCollectionMethod` and `payoutRouteStatus`. Keep `allowCashCollection` and `savingCollectionSettings`.
- Replace `loadCollectionSettings` (lines 341–359) with:

```typescript
  const loadCollectionSettings = useCallback(async () => {
    if (!user?.id) return;
    setAllowCashCollection(await CollectionSettingsService.getAllowCashCollection(user.id));
  }, [user?.id]);
```

- Replace the body of `saveCollectionSettings` (lines 361–375) — same shape, new service call:

```typescript
  const saveCollectionSettings = async () => {
    if (!user?.id) return;
    setSavingCollectionSettings(true);
    try {
      await CollectionSettingsService.setAllowCashCollection(user.id, allowCashCollection);
      Alert.alert('Saved', 'Collection settings updated.');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to save collection settings.'));
    } finally {
      setSavingCollectionSettings(false);
    }
  };
```

- Change the header title (line 665) from `Payments & Payouts` to `Payments & QR`.
- Delete the entire "Online payouts (Razorpay)" card (lines 670–680, the `<Card>` containing "Route status", "Razorpay payout setup" and "Payout summary" buttons).
- In the "Collection settings" card (lines 682–714):
  - Update the description text from `Default method for drivers collecting payment at delivery.` to `Drivers collect delivery payments via your uploaded QR code. Choose whether cash is also allowed.`
  - Delete the method-selector row (the `<View>` containing the "Razorpay online" and "Manual QR only" buttons, lines 687–698).
  - Update the caption (lines 706–708) from `When cash is disabled, drivers must collect via Razorpay before completing delivery.` to `When cash is disabled, drivers must collect via QR before completing delivery.`
  - Keep the cash toggle button and the save button unchanged.

- [ ] **Step 5: Update `src/screens/admin/payments/DeliveryPaymentHistoryScreen.tsx`**

- Replace `import { AgencyPayoutService } from '../../../services/agencyPayout.service';` (line 6) with `import { PaymentService } from '../../../services';`
- Replace `const rows = await AgencyPayoutService.getDeliveryPayments(user.id);` (line 22) with `const rows = await PaymentService.getAgencyDeliveryPayments(user.id);`

- [ ] **Step 6: Verify no stray references remain**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

Search: `grep -rn "RazorpayAccountSetup\|AgencyPayouts" src/` (or Grep tool equivalent)
Expected: zero matches.

Run: `npx jest` — expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove admin Razorpay Route setup and payout screens"
```

---

### Task 6: Delete dead client code (payout service, delivery payment methods, feature flag)

**Files:**
- Delete: `src/services/agencyPayout.service.ts`
- Modify: `src/services/index.ts`
- Modify: `src/services/payment.service.ts`
- Modify: `src/types/razorpay.types.ts`
- Modify: `src/types/subscription.types.ts:71-85`
- Modify: `src/lib/subscriptionDataAccess.ts`
- Modify: `src/utils/paymentDisplay.ts`
- Modify: `src/utils/paymentErrors.ts`
- Modify: `src/constants/config.ts`
- Test: `src/__tests__/services/payment.service.test.ts`, `src/__tests__/constants/config.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: no client references to `AgencyPayoutService`, `createDeliveryPayment`, `verifyDeliveryPayment`, `BookingPaymentVerifyResult`, `canCollectOnlinePayment`, `FEATURE_FLAGS.enableOnlinePayment`, or `defaultCollectionMethod`. `subscriptionDataAccess.upsertAgencyRazorpaySettings(agencyId, settings: { allowCashCollection?: boolean })` (narrowed signature — still satisfies Task 2's service).

- [ ] **Step 1: Delete the payout service and its export**

```bash
git rm src/services/agencyPayout.service.ts
```

In `src/services/index.ts` remove the line:
`export { AgencyPayoutService } from './agencyPayout.service';`

- [ ] **Step 2: Remove delivery payment methods from `payment.service.ts`**

- Delete `createDeliveryPayment` (lines 131–143) and `verifyDeliveryPayment` (lines 145–168).
- From the type import at the top, remove `BookingPaymentVerifyResult` (keep `PaymentFlow`, `RazorpayOrderResponse`, `RazorpayVerifyPayload`, `SubscriptionPaymentVerifyResult`).

- [ ] **Step 3: Remove the matching test block**

In `src/__tests__/services/payment.service.test.ts`, delete the `describe('verifyDeliveryPayment', …)` block (the one invoking `PaymentService.verifyDeliveryPayment`).

- [ ] **Step 4: Trim types**

In `src/types/razorpay.types.ts`, delete the `BookingPaymentVerifyResult` interface (lines 49–55). Everything else stays (subscriptions use it).

In `src/types/subscription.types.ts`, remove line 81 from `AgencyRazorpayAccount`:
`defaultCollectionMethod: 'razorpay' | 'manual_qr';`

In `src/lib/subscriptionDataAccess.ts`:
- In `mapAgencyAccount`, remove the line
  `defaultCollectionMethod: (row.default_collection_method as 'razorpay' | 'manual_qr') ?? 'manual_qr',`
- Change `upsertAgencyRazorpaySettings`'s `settings` parameter type from
  `Partial<Pick<AgencyRazorpayAccount, 'defaultCollectionMethod' | 'allowCashCollection'>>` to
  `Partial<Pick<AgencyRazorpayAccount, 'allowCashCollection'>>`
- If the function body maps `defaultCollectionMethod` to `default_collection_method` in its payload, remove that mapping (read the function at lines 232–252 and delete only the `default_collection_method` handling; `allow_cash_collection` handling stays).

- [ ] **Step 5: Remove the online-payment feature flag and dead helpers**

In `src/utils/paymentDisplay.ts`, delete the `canCollectOnlinePayment` function (lines 36–46) and the now-unused `FEATURE_FLAGS` import (line 2). `getBookingPaymentChip`/`getBookingPaymentChipLabel` stay.

In `src/utils/paymentErrors.ts`, remove the two delivery-only cases:

```typescript
    case 'agency_not_onboarded':
      return ERROR_MESSAGES.payment.agencyNotOnboarded;
```

and

```typescript
    case 'booking_already_paid':
      return ERROR_MESSAGES.payment.bookingAlreadyPaid;
```

(Keep `signature_mismatch`, `subscription_not_eligible`, `agency_subscription_inactive`, `payment_in_progress` — subscriptions use them.)

In `src/constants/config.ts`:
- Remove from `ERROR_MESSAGES.payment` (lines 161, 166): `agencyNotOnboarded` and `bookingAlreadyPaid`.
- Remove from `FEATURE_FLAGS` (line 282): `enableOnlinePayment: true,`.

In `src/__tests__/constants/config.test.ts` (line 478), delete:
`expect(FEATURE_FLAGS).toHaveProperty('enableOnlinePayment');`

- [ ] **Step 6: Verify**

Run: `npm run typecheck` and `npm run typecheck:test`
Expected: no errors. Any residual reference to a deleted symbol will surface here — fix by deleting the referencing dead code, not by re-adding symbols.

Search: `grep -rn "AgencyPayoutService\|enableOnlinePayment\|canCollectOnlinePayment\|defaultCollectionMethod" src/`
Expected: zero matches.

Run: `npx jest` — expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: delete Razorpay delivery-payment client code"
```

---

### Task 7: Remove delivery/Route edge functions; trim webhook and shared helpers

**Files:**
- Delete: `supabase/functions/create-delivery-order/` (directory)
- Delete: `supabase/functions/verify-delivery-payment/` (directory)
- Delete: `supabase/functions/create-linked-account/` (directory)
- Delete: `supabase/functions/get-linked-account-status/` (directory)
- Modify: `supabase/functions/razorpay-webhook/index.ts`
- Modify: `supabase/functions/_shared/razorpay.ts`
- Modify: `supabase/functions/_shared/activation.ts`
- Modify: `supabase/config.toml`
- Delete: `scripts/razorpay-go-live.mjs`, `scripts/verify-razorpay-live.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: nothing from earlier tasks (backend-only).
- Produces: `razorpay-webhook` handles only subscription payment events (`payment.captured` / `payment.failed` for `agency_subscription` / `customer_subscription` flows). `_shared/razorpay.ts` keeps `getRazorpayConfig`, `createOrder` (without `transfers`), `verifyPaymentSignature`, `verifyWebhookSignature`, `rupeesToPaise`.

- [ ] **Step 1: Delete function directories, scripts, and config entries**

```bash
git rm -r supabase/functions/create-delivery-order supabase/functions/verify-delivery-payment supabase/functions/create-linked-account supabase/functions/get-linked-account-status
git rm scripts/razorpay-go-live.mjs scripts/verify-razorpay-live.mjs
```

In `supabase/config.toml`, delete the four blocks (each is 5 lines: header + enabled + verify_jwt + import_map + entrypoint):
`[functions.create-delivery-order]`, `[functions.verify-delivery-payment]`, `[functions.create-linked-account]`, `[functions.get-linked-account-status]`.
Keep `[functions.razorpay-webhook]`, `[functions.create-subscription-order]`, `[functions.verify-subscription-payment]`.

In `package.json`, remove the two script entries:

```json
    "razorpay:go-live": "node scripts/razorpay-go-live.mjs",
    "razorpay:verify-live": "node scripts/verify-razorpay-live.mjs"
```

(and the trailing comma on the now-last script line).

- [ ] **Step 2: Trim `supabase/functions/razorpay-webhook/index.ts` to subscription-only**

Replace the entire file with:

```typescript
import {
  activateSubscriptionPayment,
  failPaymentTransaction,
  failSubscriptionPayment,
} from "../_shared/activation.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/http.ts";
import { verifyWebhookSignature } from "../_shared/razorpay.ts";
import { getServiceClient } from "../_shared/supabase.ts";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        bank?: string;
        error_description?: string;
        notes?: Record<string, string>;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const rawBody = await req.text();
    const signature = req.headers.get("X-Razorpay-Signature");

    let valid = false;
    try {
      valid = await verifyWebhookSignature(rawBody, signature);
    } catch (sigError) {
      const msg = sigError instanceof Error ? sigError.message : "";
      if (msg.includes("RAZORPAY_WEBHOOK_SECRET")) {
        return errorResponse(
          "Webhook secret not configured in Supabase secrets",
          503,
          { code: "webhook_not_configured" }
        );
      }
      throw sigError;
    }
    if (!valid) {
      return errorResponse("Invalid webhook signature", 401);
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    const event = payload.event ?? "";

    const payment = payload.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id) {
      return jsonResponse({ received: true, skipped: "no_payment_entity" });
    }

    const admin = getServiceClient();
    const { data: existingTx } = await admin
      .from("payment_transactions")
      .select("id, status, metadata, subscription_id, user_id")
      .eq("gateway_order_id", payment.order_id)
      .maybeSingle();

    if (existingTx?.status === "success" && event === "payment.captured") {
      return jsonResponse({ received: true, alreadyProcessed: true });
    }

    const notes = payment.notes ?? {};
    const dbMeta = (existingTx?.metadata as Record<string, unknown> | null) ?? {};
    const flow = notes.flow ?? dbMeta.flow;

    if (flow !== "customer_subscription" && flow !== "agency_subscription") {
      return jsonResponse({ received: true, skipped: "unsupported_flow" });
    }

    if (event === "payment.captured") {
      const subscriptionId = notes.subscription_id ??
        (existingTx?.subscription_id as string | undefined);
      const userId = notes.user_id ?? (existingTx?.user_id as string | undefined);
      if (subscriptionId && userId) {
        await activateSubscriptionPayment({
          subscriptionId,
          userId,
          orderId: payment.order_id,
          paymentId: payment.id,
          paymentMethod: payment.method ?? null,
          bankName: payment.bank ?? null,
        });
      }
    } else if (event === "payment.failed") {
      await failPaymentTransaction(
        payment.order_id,
        payment.id,
        payment.error_description
      );
      await failSubscriptionPayment(payment.order_id);
    }

    return jsonResponse({ received: true });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    return errorResponse(message, 500);
  }
});
```

- [ ] **Step 3: Trim `supabase/functions/_shared/razorpay.ts`**

Keep: `RAZORPAY_API_BASE`, `RazorpayConfig`, `CreateOrderParams` (remove the `transfers?: …` field), `RazorpayOrder`, `timingSafeEqual`, `hmacSha256Hex`, `getRazorpayConfig`, `basicAuthHeader`, `createOrder` (remove the `if (params.transfers?.length) { body.transfers = params.transfers; }` block), `verifyPaymentSignature`, `verifyWebhookSignature`, `rupeesToPaise`.

Delete everything Route-related (currently lines 98–401): `CreateLinkedAccountParams`, `RouteSettlementParams`, `CreateStakeholderParams`, `parseRazorpayError`, `PAN_ENTITY_BUSINESS_TYPE`, `isPersonalPan`, `inferBusinessTypeFromPan`, `mapRazorpayRouteError`, `RazorpayRouteApiError`, `extractLinkedAccountIdFromError`, `isDuplicateLinkedAccountError`, `razorpayRouteRequest`, `findLinkedAccountByEmail`, `createOrReuseLinkedAccount`, `createLinkedAccount`, `createLinkedAccountStakeholder`, `isStakeholderAlreadyExistsError`, `requestRouteProduct`, `updateRouteProductSettlement`, `fetchLinkedAccount`, and the `RAZORPAY_ROUTE_API_BASE` constant.

- [ ] **Step 4: Trim `supabase/functions/_shared/activation.ts`**

Delete these four exported functions (they were only used by the deleted functions and the webhook branches you removed): `completeBookingPayment` (line ~207), `failBookingPayment` (line ~313), `recordDeliveryTransfer` (line ~338), `updateAgencyRazorpayAccountStatus` (line ~395). Also delete any module-private helpers/types in that file used **only** by those four (read the file first; if a helper is shared with `activateSubscriptionPayment`/`failSubscriptionPayment`/`failPaymentTransaction`/`assertAgencySubscriptionActive`, keep it).

- [ ] **Step 5: Verify no dangling references in functions**

Search: `grep -rn "completeBookingPayment\|failBookingPayment\|recordDeliveryTransfer\|updateAgencyRazorpayAccountStatus\|createLinkedAccount\|requestRouteProduct\|create-delivery-order\|verify-delivery-payment\|get-linked-account-status" supabase/ src/ scripts/`
Expected: zero matches.

If Deno is installed, run: `deno check supabase/functions/razorpay-webhook/index.ts` — expected: no errors. If Deno is not installed, skip (review the file manually for the imports listed in Step 2).

Run: `npm run typecheck` and `npx jest` — expected: PASS (client untouched by this task, sanity check only).

- [ ] **Step 6: Undeploy the deleted functions from Supabase**

Preferred: Supabase CLI (requires the project to be linked):

```bash
npx supabase functions delete create-delivery-order
npx supabase functions delete verify-delivery-payment
npx supabase functions delete create-linked-account
npx supabase functions delete get-linked-account-status
```

If the CLI is not linked/authenticated, use the Supabase MCP tools or dashboard to delete those four functions, and redeploy the trimmed webhook: `npx supabase functions deploy razorpay-webhook` (or the MCP `deploy_edge_function` equivalent). If neither is possible in the execution environment, STOP and flag this step for the human — do not silently skip.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove delivery/Route edge functions, trim webhook to subscriptions"
```

---

### Task 8: Copy, docs, and final verification

**Files:**
- Modify: `src/screens/admin/ReportsScreen.tsx:68-90, 211-216`
- Modify: `src/screens/admin/TripDetailsScreen.tsx:450`
- Modify: `README.md`, `supabase/functions/README.md`, `.env.example`, `supabase/functions/.env.example` (Razorpay delivery/Route mentions only)
- Modify: `docs/RAZORPAY_IMPLEMENTATION_PHASES.md`, `docs/RAZORPAY_SUBSCRIPTION_AND_PAYMENTS_SCREEN_PLAN.md` (obsolescence note)

**Interfaces:** none — copy/docs only.

- [ ] **Step 1: Update ReportsScreen metric naming**

In `src/screens/admin/ReportsScreen.tsx`, rename `razorpayCollected` to `digitallyCollected` (both in the `useMemo` at lines 77–89 and the render at line 216 — the filter logic stays identical: completed payments whose `paymentId` doesn't start with `cash_`/`cod_`, which now means QR-recorded plus historical Razorpay payments). Change the label at line 211 from `Delivery payments (Razorpay)` to `Delivery payments (QR)`.

- [ ] **Step 2: Update TripDetailsScreen copy**

Line 450: change
`Per-delivery Razorpay payments are collected by drivers and appear under Bookings / Reports.` to
`Delivery payments are collected by drivers via QR or cash and appear under Bookings / Reports.`

- [ ] **Step 3: Update docs**

- `README.md` and `supabase/functions/README.md`: remove/replace mentions of `create-delivery-order`, `verify-delivery-payment`, `create-linked-account`, `get-linked-account-status`, and Route setup. State that Razorpay is used **only** for agency platform subscriptions, and delivery payments are collected in person via the agency QR code or cash, recorded by the driver.
- `.env.example` and `supabase/functions/.env.example`: keep `RAZORPAY_*` variables (subscriptions still need them); remove any comments referring to Route/linked accounts if present.
- Add this note at the very top (below the title) of both `docs/RAZORPAY_IMPLEMENTATION_PHASES.md` and `docs/RAZORPAY_SUBSCRIPTION_AND_PAYMENTS_SCREEN_PLAN.md`:

```markdown
> **OBSOLETE (2026-07-10):** Razorpay delivery payments and Route (linked accounts / payouts)
> have been removed. Drivers now collect delivery payments via the agency QR code or cash
> (see `docs/superpowers/specs/2026-07-10-remove-razorpay-delivery-payments-design.md`).
> Razorpay is used only for agency platform subscriptions. Delivery/Route sections below
> are historical.
```

- [ ] **Step 4: Full verification**

Run each and confirm clean output:
- `npm run typecheck` — expected: no errors
- `npm run typecheck:test` — expected: no errors
- `npx jest` — expected: all suites PASS
- `grep -rin "razorpay" src/` — expected: matches only in subscription-related files (`razorpayCheckout.service.ts`, `subscription*`, `payment.service.ts` subscription methods, `razorpay.types.ts`, `paymentErrors.ts`, `config.ts` razorpay messages/`enableRazorpaySubscription`, `PaymentResultScreen`, navigators importing `PaymentResultScreenParams`, `subscriptionDataAccess.ts` table access). No matches in driver screens or admin payment screens other than history mapping.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: update copy and docs for QR/cash delivery payments"
```

---

## Self-Review Notes (already applied)

- Spec coverage: driver flow (Tasks 1–3), admin screens (Tasks 4–5), backend/services/flags (Tasks 6–7), tests+docs (Tasks 1, 2, 4, 6, 8). Undeploy handled in Task 7 Step 6 with an explicit stop-and-flag fallback.
- `recordCashPayment` external behavior is preserved (Task 1) so `confirmCODPayment` and existing tests keep passing.
- Order matters: Task 3 must land before Task 4 (it removes the last `payoutActive` consumer outside the gate) and Tasks 3–5 before Task 6 (they remove the last `AgencyPayoutService` consumers).
