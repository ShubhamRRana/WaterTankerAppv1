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
