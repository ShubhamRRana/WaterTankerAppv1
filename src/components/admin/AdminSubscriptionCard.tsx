import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card, Typography, Button } from '../common';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { SubscriptionService } from '../../services/subscription.service';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';

interface Props {
  userId: string;
  navigation: StackNavigationProp<AdminStackParamList>;
}

const AdminSubscriptionCard: React.FC<Props> = ({ userId, navigation }) => {
  const { currentSubscription, hasActive, refresh } = useSubscriptionStore();

  useEffect(() => {
    void refresh(userId);
  }, [userId, refresh]);

  const trialDays = SubscriptionService.getTrialDaysRemaining(currentSubscription);
  const onTrial = SubscriptionService.isOnTrial(currentSubscription);
  const expiring = SubscriptionService.isExpiringSoon(
    currentSubscription?.endDate ?? null,
    undefined,
    currentSubscription
  );

  return (
    <Card style={styles.card}>
      <Typography variant="h3">Agency subscription</Typography>
      <Typography variant="body">
        {onTrial
          ? `Free trial — ${trialDays ?? 0} day${trialDays === 1 ? '' : 's'} left`
          : hasActive
            ? 'Active'
            : 'Inactive or expired'}
        {!onTrial && currentSubscription?.endDate
          ? ` — until ${currentSubscription.endDate.toLocaleDateString()}`
          : onTrial && currentSubscription?.trialEndDate
            ? ` (ends ${currentSubscription.trialEndDate.toLocaleDateString()})`
            : ''}
      </Typography>
      {onTrial ? (
        <Typography variant="caption" style={{ opacity: 0.7 }}>
          Subscribe before trial ends to keep full access after your first month.
        </Typography>
      ) : null}
      {expiring ? (
        <Typography variant="caption" style={{ opacity: 0.7 }}>
          {onTrial
            ? 'Trial ending soon — choose a plan to continue.'
            : 'Expires soon — renew to keep drivers and bookings active.'}
        </Typography>
      ) : null}
      <View style={styles.row}>
        <Button
          title={onTrial || !hasActive ? 'Subscribe' : 'Manage'}
          onPress={() =>
            navigation.navigate(onTrial || !hasActive ? 'SubscriptionPlans' : 'SubscriptionStatus')
          }
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
});

export default AdminSubscriptionCard;
