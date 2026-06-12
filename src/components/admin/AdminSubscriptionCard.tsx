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

  const expiring = SubscriptionService.isExpiringSoon(currentSubscription?.endDate ?? null);

  return (
    <Card style={styles.card}>
      <Typography variant="h3">Agency subscription</Typography>
      <Typography variant="body">
        {hasActive ? 'Active' : 'Inactive or expired'}
        {currentSubscription?.endDate
          ? ` — until ${currentSubscription.endDate.toLocaleDateString()}`
          : ''}
      </Typography>
      {expiring ? (
        <Typography variant="caption" style={{ opacity: 0.7 }}>
          Expires soon — renew to keep drivers and bookings active.
        </Typography>
      ) : null}
      <View style={styles.row}>
        <Button
          title={hasActive ? 'Manage' : 'Subscribe'}
          onPress={() =>
            navigation.navigate(hasActive ? 'SubscriptionStatus' : 'SubscriptionPlans')
          }
        />
        <Button
          title="Payout setup"
          variant="outline"
          onPress={() => navigation.navigate('RazorpayAccountSetup')}
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
