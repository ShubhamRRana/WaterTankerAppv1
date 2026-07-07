import { FEATURE_FLAGS, ERROR_MESSAGES } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
import { AgencyPayoutService } from '../services/agencyPayout.service';
import type { AdminStackParamList } from '../navigation/AdminNavigator';

export const DRIVER_LOCK_MODE = 'strict' as const;

export const ADMIN_LOCKED_ROUTES: ReadonlyArray<keyof AdminStackParamList> = [
  'SubscriptionPlans',
  'SubscriptionCheckout',
  'SubscriptionStatus',
  'SubscriptionPaymentHistory',
  'PaymentResult',
  'Profile',
  'ChangePassword',
];

export function isAdminRouteAllowedWhenLocked(route: string): boolean {
  return ADMIN_LOCKED_ROUTES.includes(route as keyof AdminStackParamList);
}

export async function checkAdminSubscriptionGate(adminId: string): Promise<{
  hasActive: boolean;
  payoutActive: boolean;
}> {
  const [hasActive, payoutStatus] = await Promise.all([
    SubscriptionService.hasActiveSubscription(adminId),
    AgencyPayoutService.getAccountStatus(),
  ]);
  return {
    hasActive,
    payoutActive: payoutStatus.status === 'active',
  };
}

export async function assertAgencySubscriptionActive(agencyId: string): Promise<void> {
  if (!FEATURE_FLAGS.enableSubscriptionGating) return;

  const active = await SubscriptionService.hasActiveSubscription(agencyId);
  if (!active) {
    throw new Error(ERROR_MESSAGES.payment.agencySubscriptionInactive);
  }
}

export function isSubscriptionGatingEnabled(): boolean {
  return FEATURE_FLAGS.enableSubscriptionGating;
}
