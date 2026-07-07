import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAdminSubscriptionGate } from '../context/AdminSubscriptionGateContext';
import type { AdminStackParamList } from './AdminNavigator';

type Nav = StackNavigationProp<AdminStackParamList>;

export function useAdminPostUnlockNavigation(): void {
  const navigation = useNavigation<Nav>();
  const { unlockNavigateTo, clearUnlockNavigate } = useAdminSubscriptionGate();

  useEffect(() => {
    if (!unlockNavigateTo) return;
    navigation.navigate(unlockNavigateTo as 'SubscriptionStatus');
    clearUnlockNavigate();
  }, [clearUnlockNavigate, navigation, unlockNavigateTo]);
}
