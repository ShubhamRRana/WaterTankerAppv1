import type { SubscriptionPlan } from '../types/subscription.types';

export interface PlanSavings {
  listPrice: number;
  savingsAmount: number;
  savingsPercent: number;
}

export function getMonthlyPlanPrice(plans: SubscriptionPlan[]): number | null {
  const monthly = plans.find((plan) => plan.durationMonths === 1);
  return monthly != null ? monthly.price : null;
}

export function getPlanSavings(
  plan: SubscriptionPlan,
  monthlyPrice: number
): PlanSavings | null {
  if (plan.durationMonths <= 1 || monthlyPrice <= 0) {
    return null;
  }

  const listPrice = monthlyPrice * plan.durationMonths;
  const savingsAmount = listPrice - plan.price;

  if (savingsAmount <= 0) {
    return null;
  }

  return {
    listPrice,
    savingsAmount,
    savingsPercent: Math.round((savingsAmount / listPrice) * 100),
  };
}

export function getEffectiveMonthlyPrice(plan: SubscriptionPlan): number {
  return plan.price / plan.durationMonths;
}
