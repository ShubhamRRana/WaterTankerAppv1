import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography } from '../common';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { SubscriptionService } from '../../services/subscription.service';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  userId: string;
  navigation: StackNavigationProp<AdminStackParamList>;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const AdminSubscriptionCard: React.FC<Props> = ({ userId, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const { currentSubscription, hasActive, refresh } = useSubscriptionStore();

  useEffect(() => {
    void refresh(userId);
  }, [userId, refresh]);

  const trialDays = SubscriptionService.getTrialDaysRemaining(currentSubscription);
  const onTrial = SubscriptionService.isOnTrial(currentSubscription);
  const expiring = SubscriptionService.isExpiringSoon(
    currentSubscription?.endDate ?? null,
    undefined,
    currentSubscription,
  );

  const statusColor = onTrial
    ? colors.accent
    : expiring
      ? colors.warning
      : hasActive
        ? colors.success
        : colors.error;

  const statusLabel = (() => {
    if (onTrial) {
      const days = trialDays ?? 0;
      const trialEnd = currentSubscription?.trialEndDate
        ? ` — ends ${formatShortDate(currentSubscription.trialEndDate)}`
        : '';
      return `Trial — ${days} day${days === 1 ? '' : 's'} left${trialEnd}`;
    }
    if (hasActive) {
      const dateText = currentSubscription?.endDate
        ? formatShortDate(currentSubscription.endDate)
        : '';
      if (expiring) return dateText ? `Expiring soon — ${dateText}` : 'Expiring soon';
      return dateText ? `Active — valid until ${dateText}` : 'Active';
    }
    return 'Inactive or expired';
  })();

  const destination = onTrial || !hasActive ? 'SubscriptionPlans' : 'SubscriptionStatus';

  return (
    <TouchableOpacity
      style={[styles.pill, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}12` }]}
      onPress={() => navigation.navigate(destination)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Subscription status: ${statusLabel}. Tap to manage.`}
    >
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Typography variant="body" style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {statusLabel}
      </Typography>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

function createStyles() {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    label: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
    },
  });
}

export default AdminSubscriptionCard;
