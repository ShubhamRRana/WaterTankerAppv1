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
