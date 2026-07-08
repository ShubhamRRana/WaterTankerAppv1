import { AgencyPayoutService } from '../../services/agencyPayout.service';
import { SubscriptionService } from '../../services/subscription.service';
import {
  checkAdminSubscriptionGate,
  isPayoutSetupComplete,
} from '../../utils/subscriptionGating';

jest.mock('../../services/subscription.service', () => ({
  SubscriptionService: {
    hasActiveSubscription: jest.fn(),
  },
}));

jest.mock('../../services/agencyPayout.service', () => ({
  AgencyPayoutService: {
    getAccountStatus: jest.fn(),
  },
}));

describe('subscriptionGating payout helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPayoutSetupComplete', () => {
    it('returns true only when status is active', () => {
      expect(isPayoutSetupComplete('active')).toBe(true);
    });

    it.each(['not_started', 'created', 'under_review', 'rejected', 'suspended'] as const)(
      'returns false for %s',
      (status) => {
        expect(isPayoutSetupComplete(status)).toBe(false);
      }
    );
  });

  describe('checkAdminSubscriptionGate', () => {
    it('returns payoutActive true and hides-banner-ready state when status is active', async () => {
      jest.mocked(SubscriptionService.hasActiveSubscription).mockResolvedValue(true);
      jest.mocked(AgencyPayoutService.getAccountStatus).mockResolvedValue({ status: 'active' });

      const gate = await checkAdminSubscriptionGate('agency-1');

      expect(gate).toEqual({
        hasActive: true,
        payoutActive: true,
        payoutStatus: 'active',
      });
    });

    it('returns payoutActive false while Razorpay is still reviewing', async () => {
      jest.mocked(SubscriptionService.hasActiveSubscription).mockResolvedValue(true);
      jest.mocked(AgencyPayoutService.getAccountStatus).mockResolvedValue({ status: 'created' });

      const gate = await checkAdminSubscriptionGate('agency-1');

      expect(gate.payoutActive).toBe(false);
      expect(gate.payoutStatus).toBe('created');
    });
  });
});
