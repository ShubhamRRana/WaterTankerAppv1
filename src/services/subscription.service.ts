import { subscriptionDataAccess } from '../lib/subscriptionDataAccess';
import { FEATURE_FLAGS } from '../constants/config';
import { PaymentService } from './payment.service';
import type { RazorpayVerifyPayload } from '../types/razorpay.types';
import type { SubscriptionPlan, UserSubscription } from '../types/subscription.types';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

export class SubscriptionService {
  static async getAgencyPlans(): Promise<SubscriptionPlan[]> {
    return handleAsyncOperationWithRethrow(
      () => subscriptionDataAccess.getAgencyPlans(),
      { context: { operation: 'getAgencyPlans' }, userFacing: false }
    );
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    return subscriptionDataAccess.getPlanById(planId);
  }

  static async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    return subscriptionDataAccess.getUserSubscription(userId);
  }

  static async hasActiveSubscription(userId: string): Promise<boolean> {
    return subscriptionDataAccess.hasActiveSubscription(userId);
  }

  static async prepareSubscriptionCheckout(
    userId: string,
    planId: string
  ): Promise<UserSubscription> {
    const existing = await subscriptionDataAccess.getUserSubscription(userId);
    const now = Date.now();

    if (
      existing?.status === 'active' &&
      !existing.isTrial &&
      existing.endDate &&
      existing.endDate.getTime() > now
    ) {
      throw new Error('You already have an active subscription.');
    }

    if (existing?.status === 'pending') {
      if (existing.planId !== planId) {
        await subscriptionDataAccess.updateSubscription(existing.id, { planId });
        return { ...existing, planId };
      }
      return existing;
    }

    if (existing?.status === 'expired') {
      await subscriptionDataAccess.updateSubscription(existing.id, {
        planId,
        status: 'pending',
      });
      return { ...existing, planId, status: 'pending' };
    }

    return subscriptionDataAccess.createSubscription({
      userId,
      planId,
      status: 'pending',
    });
  }

  static async activateSubscription(
    subscriptionId: string,
    verifyPayload: RazorpayVerifyPayload
  ): Promise<void> {
    if (!FEATURE_FLAGS.enableRazorpaySubscription) {
      throw new Error('Razorpay subscription checkout is disabled.');
    }
    const result = await PaymentService.verifySubscriptionPayment(subscriptionId, verifyPayload);
    if (!result.success) {
      throw new Error(result.error ?? 'Subscription activation failed');
    }
  }

  static async getPaymentHistory(userId: string) {
    return PaymentService.getPaymentHistory(userId, { flow: 'agency_subscription' });
  }

  static isExpiringSoon(endDate: Date | null, withinDays = 7): boolean {
    if (!endDate) return false;
    const diff = endDate.getTime() - Date.now();
    return diff > 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
  }
}
