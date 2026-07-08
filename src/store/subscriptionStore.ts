import { create } from 'zustand';
import { SubscriptionService } from '../services/subscription.service';
import type { SubscriptionPlan, UserSubscription } from '../types/subscription.types';

export interface PendingSubscriptionPaymentSuccess {
  referenceId?: string;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  currentSubscription: UserSubscription | null;
  hasActive: boolean;
  loading: boolean;
  error: string | null;
  pendingSubscriptionPaymentSuccess: PendingSubscriptionPaymentSuccess | null;
  refresh: (userId: string) => Promise<void>;
  loadPlans: () => Promise<void>;
  setPendingSubscriptionPaymentSuccess: (payload: PendingSubscriptionPaymentSuccess | null) => void;
  clearPendingSubscriptionPaymentSuccess: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plans: [],
  currentSubscription: null,
  hasActive: false,
  loading: false,
  error: null,
  pendingSubscriptionPaymentSuccess: null,

  setPendingSubscriptionPaymentSuccess: (payload) => {
    set({ pendingSubscriptionPaymentSuccess: payload });
  },

  clearPendingSubscriptionPaymentSuccess: () => {
    set({ pendingSubscriptionPaymentSuccess: null });
  },

  loadPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await SubscriptionService.getAgencyPlans();
      set({ plans, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load plans',
      });
    }
  },

  refresh: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [currentSubscription, hasActive] = await Promise.all([
        SubscriptionService.getCurrentSubscription(userId),
        SubscriptionService.hasActiveSubscription(userId),
      ]);
      set({ currentSubscription, hasActive, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh subscription',
      });
    }
  },
}));
