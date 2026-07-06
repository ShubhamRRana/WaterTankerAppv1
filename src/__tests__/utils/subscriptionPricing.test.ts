import type { SubscriptionPlan } from '../../types/subscription.types';
import {
  getEffectiveMonthlyPrice,
  getMonthlyPlanPrice,
  getPlanSavings,
} from '../../utils/subscriptionPricing';

const monthlyPlan: SubscriptionPlan = {
  id: 'monthly',
  name: 'Agency Monthly',
  description: null,
  durationMonths: 1,
  price: 2799,
  currency: 'INR',
  features: [],
  maxBookingsPerMonth: null,
  isActive: true,
  displayOrder: 10,
  accountKind: 'agency',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const quarterlyPlan: SubscriptionPlan = {
  ...monthlyPlan,
  id: 'quarterly',
  name: 'Agency Quarterly',
  durationMonths: 3,
  price: 7499,
  displayOrder: 11,
};

const yearlyPlan: SubscriptionPlan = {
  ...monthlyPlan,
  id: 'yearly',
  name: 'Agency Yearly',
  durationMonths: 12,
  price: 24999,
  displayOrder: 13,
};

describe('subscriptionPricing', () => {
  describe('getMonthlyPlanPrice', () => {
    it('returns the monthly plan price when present', () => {
      expect(getMonthlyPlanPrice([quarterlyPlan, monthlyPlan])).toBe(2799);
    });

    it('returns null when no monthly plan exists', () => {
      expect(getMonthlyPlanPrice([quarterlyPlan])).toBeNull();
    });
  });

  describe('getPlanSavings', () => {
    it('returns null for the monthly plan', () => {
      expect(getPlanSavings(monthlyPlan, 2799)).toBeNull();
    });

    it('calculates quarterly savings vs monthly', () => {
      const savings = getPlanSavings(quarterlyPlan, 2799);

      expect(savings).toEqual({
        listPrice: 8397,
        savingsAmount: 898,
        savingsPercent: 11,
      });
    });

    it('calculates yearly savings vs monthly', () => {
      const savings = getPlanSavings(yearlyPlan, 2799);

      expect(savings).toEqual({
        listPrice: 33588,
        savingsAmount: 8589,
        savingsPercent: 26,
      });
    });

    it('returns null when there is no savings', () => {
      const expensivePlan = { ...quarterlyPlan, price: 9000 };
      expect(getPlanSavings(expensivePlan, 2799)).toBeNull();
    });
  });

  describe('getEffectiveMonthlyPrice', () => {
    it('returns the per-month effective price', () => {
      expect(getEffectiveMonthlyPrice(quarterlyPlan)).toBeCloseTo(2499.67, 2);
      expect(getEffectiveMonthlyPrice(yearlyPlan)).toBeCloseTo(2083.25, 2);
    });
  });
});
