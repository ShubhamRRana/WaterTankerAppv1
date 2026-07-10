import { FEATURE_FLAGS, ERROR_MESSAGES } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
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
}> {
  const hasActive = await SubscriptionService.hasActiveSubscription(adminId);
  return { hasActive };
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
