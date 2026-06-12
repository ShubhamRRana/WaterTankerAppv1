import React, { useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { SubscriptionService } from '../../../services/subscription.service';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';

type Nav = StackNavigationProp<AdminStackParamList, 'SubscriptionStatus'>;

interface Props {
  navigation: Nav;
}

const SubscriptionStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { currentSubscription, loading, refresh } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (user?.id) void refresh(user.id);
  }, [user?.id]);

  if (loading && !currentSubscription) {
    return <LoadingSpinner size="large" text="Loading subscription..." />;
  }

  const sub = currentSubscription;
  const onTrial = SubscriptionService.isOnTrial(sub);
  const trialDays = SubscriptionService.getTrialDaysRemaining(sub);
  const endLabel = sub?.endDate ? sub.endDate.toLocaleDateString() : '—';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Typography variant="h2">Subscription</Typography>
          <Typography variant="body">
            Status: {onTrial ? 'Free trial' : (sub?.status ?? 'none')}
          </Typography>
          {onTrial ? (
            <Typography variant="body">
              Trial: {trialDays ?? 0} day{trialDays === 1 ? '' : 's'} remaining
            </Typography>
          ) : null}
          <Typography variant="body">Valid until: {endLabel}</Typography>
          <Button
            title={onTrial ? 'Subscribe now' : 'Renew / change plan'}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          />
          <Button
            title="Payment history"
            variant="outline"
            onPress={() => navigation.navigate('SubscriptionPaymentHistory')}
          />
        </Card>
        {SubscriptionService.isExpiringSoon(sub?.endDate ?? null, undefined, sub) ? (
          <Typography variant="caption" style={{ opacity: 0.8 }}>
            {onTrial
              ? 'Your trial ends soon. Subscribe to avoid losing access.'
              : 'Your subscription expires soon. Renew to avoid service interruption.'}
          </Typography>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16 },
    card: { padding: 16, gap: 12 },
  });
}

export default SubscriptionStatusScreen;
