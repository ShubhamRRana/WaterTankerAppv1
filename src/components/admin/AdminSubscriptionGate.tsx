import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { FEATURE_FLAGS } from '../../constants/config';
import { SubscriptionService } from '../../services/subscription.service';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useTheme } from '../../theme/ThemeProvider';

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; initialRoute: keyof AdminStackParamList };

interface Props {
  children: (initialRoute: keyof AdminStackParamList) => React.ReactNode;
}

const AdminSubscriptionGate: React.FC<Props> = ({ children }) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [gate, setGate] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    if (!user?.id || !FEATURE_FLAGS.enableSubscriptionGating) {
      setGate({ status: 'ready', initialRoute: 'Bookings' });
      return;
    }

    void (async () => {
      try {
        await SubscriptionService.ensureAgencyTrial(user.id);
        const hasActive = await SubscriptionService.hasActiveSubscription(user.id);
        setGate({
          status: 'ready',
          initialRoute: hasActive ? 'Bookings' : 'SubscriptionPlans',
        });
      } catch {
        setGate({ status: 'ready', initialRoute: 'SubscriptionPlans' });
      }
    })();
  }, [user?.id]);

  if (gate.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children(gate.initialRoute)}</>;
};

export default AdminSubscriptionGate;
