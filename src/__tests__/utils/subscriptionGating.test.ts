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
