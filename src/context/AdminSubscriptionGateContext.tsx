import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { FEATURE_FLAGS } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
import { checkAdminSubscriptionGate } from '../utils/subscriptionGating';
import type { LinkedAccountStatus } from '../services/agencyPayout.service';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTheme } from '../theme/ThemeProvider';

import type { AdminStackParamList } from '../navigation/AdminNavigator';

interface AdminSubscriptionGateValue {
  hasActive: boolean;
  payoutActive: boolean;
  payoutStatus: LinkedAccountStatus['status'];
  loading: boolean;
  refresh: (options?: { navigateTo?: keyof AdminStackParamList }) => Promise<void>;
  unlockNavigateTo: keyof AdminStackParamList | null;
  clearUnlockNavigate: () => void;
}

const AdminSubscriptionGateContext = createContext<AdminSubscriptionGateValue | null>(null);

export function useAdminSubscriptionGate(): AdminSubscriptionGateValue {
  const ctx = useContext(AdminSubscriptionGateContext);
  if (!ctx) {
    throw new Error('useAdminSubscriptionGate must be used within AdminSubscriptionGate');
  }
  return ctx;
}

export function useOptionalAdminSubscriptionGate(): AdminSubscriptionGateValue | null {
  return useContext(AdminSubscriptionGateContext);
}

interface Props {
  children: React.ReactNode;
}

export const AdminSubscriptionGate: React.FC<Props> = ({ children }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [hasActive, setHasActive] = useState(true);
  const [payoutActive, setPayoutActive] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState<LinkedAccountStatus['status']>('not_started');
  const [initialLoading, setInitialLoading] = useState(true);
  const [unlockNavigateTo, setUnlockNavigateTo] = useState<keyof AdminStackParamList | null>(null);

  const clearUnlockNavigate = useCallback(() => {
    setUnlockNavigateTo(null);
  }, []);

  const refresh = useCallback(async (options?: { navigateTo?: keyof AdminStackParamList }) => {
    if (!user?.id) {
      setHasActive(true);
      setPayoutActive(false);
      setPayoutStatus('not_started');
      setInitialLoading(false);
      return;
    }

    try {
      if (FEATURE_FLAGS.enableSubscriptionGating) {
        await SubscriptionService.ensureAgencyTrial(user.id);
      }

      const gate = await checkAdminSubscriptionGate(user.id);
      const active = FEATURE_FLAGS.enableSubscriptionGating ? gate.hasActive : true;
      setHasActive(active);
      setPayoutActive(gate.payoutActive);
      setPayoutStatus(gate.payoutStatus);
      await useSubscriptionStore.getState().refresh(user.id);
      if (active && options?.navigateTo) {
        setUnlockNavigateTo(options.navigateTo);
      }
    } catch {
      setHasActive(false);
      setPayoutActive(false);
      setPayoutStatus('not_started');
    } finally {
      setInitialLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => sub.remove();
  }, [refresh, user?.id]);

  useEffect(() => {
    if (!user?.id || payoutActive) return;

    const interval = setInterval(() => {
      void refresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [user?.id, payoutActive, refresh]);

  const value = useMemo(
    () => ({
      hasActive,
      payoutActive,
      payoutStatus,
      loading: initialLoading,
      refresh,
      unlockNavigateTo,
      clearUnlockNavigate,
    }),
    [hasActive, payoutActive, payoutStatus, initialLoading, refresh, unlockNavigateTo, clearUnlockNavigate]
  );

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <AdminSubscriptionGateContext.Provider value={value}>
      {children}
    </AdminSubscriptionGateContext.Provider>
  );
};

export default AdminSubscriptionGate;
