import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSubscriptionStore } from '../store/subscriptionStore';
import type { AdminStackParamList } from './AdminNavigator';

type Nav = StackNavigationProp<AdminStackParamList>;

export function useAdminPendingSubscriptionSuccessNavigation(): void {
  const navigation = useNavigation<Nav>();
  const pending = useSubscriptionStore((state) => state.pendingSubscriptionPaymentSuccess);

  useEffect(() => {
    if (!pending) return;

    const state = navigation.getState();
    const currentRoute = state.routes[state.index]?.name;
    if (currentRoute === 'PaymentResult') return;

    navigation.navigate('PaymentResult', {
      type: 'subscription',
      status: 'success',
      ...(pending.referenceId ? { referenceId: pending.referenceId } : {}),
    });
  }, [navigation, pending]);
}
