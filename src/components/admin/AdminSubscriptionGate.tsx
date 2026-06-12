import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { FEATURE_FLAGS } from '../../constants/config';
import { SubscriptionService } from '../../services/subscription.service';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useTheme } from '../../theme/ThemeProvider';

type Nav = StackNavigationProp<AdminStackParamList>;

interface Props {
  children: React.ReactNode;
}

const AdminSubscriptionGate: React.FC<Props> = ({ children }) => {
  const { user } = useAuthStore();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user?.id || !FEATURE_FLAGS.enableSubscriptionGating) {
      setChecking(false);
      return;
    }

    void (async () => {
      try {
        await SubscriptionService.ensureAgencyTrial(user.id);
        const hasActive = await SubscriptionService.hasActiveSubscription(user.id);
        if (!hasActive) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'SubscriptionPlans' }],
          });
        }
      } finally {
        setChecking(false);
      }
    })();
  }, [user?.id, navigation]);

  if (checking && FEATURE_FLAGS.enableSubscriptionGating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
};

export default AdminSubscriptionGate;
