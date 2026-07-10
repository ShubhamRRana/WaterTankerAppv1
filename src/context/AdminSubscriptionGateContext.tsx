import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { FEATURE_FLAGS } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
import { checkAdminSubscriptionGate } from '../utils/subscriptionGating';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTheme } from '../theme/ThemeProvider';

import type { AdminStackParamList } from '../navigation/AdminNavigator';

interface AdminSubscriptionGateValue {
  hasActive: boolean;
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [unlockNavigateTo, setUnlockNavigateTo] = useState<keyof AdminStackParamList | null>(null);

  const clearUnlockNavigate = useCallback(() => {
    setUnlockNavigateTo(null);
  }, []);

  const refresh = useCallback(async (options?: { navigateTo?: keyof AdminStackParamList }) => {
    if (!user?.id) {
      setHasActive(true);
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
      await useSubscriptionStore.getState().refresh(user.id);
      if (active && options?.navigateTo) {
        setUnlockNavigateTo(options.navigateTo);
      }
    } catch {
      setHasActive(false);
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

  const value = useMemo(
    () => ({
      hasActive,
      loading: initialLoading,
      refresh,
      unlockNavigateTo,
      clearUnlockNavigate,
    }),
    [hasActive, initialLoading, refresh, unlockNavigateTo, clearUnlockNavigate]
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
