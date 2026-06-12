import { SubscriptionService } from '../services/subscription.service';
import { AgencyPayoutService } from '../services/agencyPayout.service';

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
