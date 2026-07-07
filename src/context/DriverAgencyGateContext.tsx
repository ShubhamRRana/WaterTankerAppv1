import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { FEATURE_FLAGS } from '../constants/config';
import { SubscriptionService } from '../services/subscription.service';
import { isDriverUser } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface DriverAgencyGateValue {
  agencyActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DriverAgencyGateContext = createContext<DriverAgencyGateValue | null>(null);

export function useDriverAgencyGate(): DriverAgencyGateValue {
  const ctx = useContext(DriverAgencyGateContext);
  if (!ctx) {
    throw new Error('useDriverAgencyGate must be used within DriverAgencyGate');
  }
  return ctx;
}

interface Props {
  children: React.ReactNode;
}

export const DriverAgencyGate: React.FC<Props> = ({ children }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [agencyActive, setAgencyActive] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !isDriverUser(user) || !user.createdByAdminId || !FEATURE_FLAGS.enableSubscriptionGating) {
      setAgencyActive(true);
      setInitialLoading(false);
      return;
    }

    try {
      const active = await SubscriptionService.hasActiveSubscription(user.createdByAdminId);
      setAgencyActive(active);
    } catch {
      setAgencyActive(false);
    } finally {
      setInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !isDriverUser(user) || !FEATURE_FLAGS.enableSubscriptionGating) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => sub.remove();
  }, [refresh, user]);

  const value = useMemo(
    () => ({ agencyActive, loading: initialLoading, refresh }),
    [agencyActive, initialLoading, refresh]
  );

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <DriverAgencyGateContext.Provider value={value}>
      {children}
    </DriverAgencyGateContext.Provider>
  );
};

export default DriverAgencyGate;
