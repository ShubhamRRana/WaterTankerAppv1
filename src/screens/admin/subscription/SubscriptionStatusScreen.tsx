import React, { useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
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
  const expiringSoon = SubscriptionService.isExpiringSoon(sub?.endDate ?? null, undefined, sub);
  const activePaid = sub?.status === 'active' && !onTrial;
  const statusLabel = onTrial
    ? 'Free trial'
    : sub?.status
      ? { pending: 'Pending activation', active: 'Active', expired: 'Expired', cancelled: 'Cancelled', paused: 'Paused' }[sub.status]
      : 'No subscription';
  const primaryCtaTitle = onTrial
    ? 'Subscribe now'
    : activePaid && !expiringSoon
      ? 'View plans'
      : 'Renew / change plan';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.backRow}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Typography variant="body" style={styles.backText}>Back to profile</Typography>
        </TouchableOpacity>
        <Card style={styles.card}>
          <Typography variant="h2">Subscription</Typography>
          <Typography variant="body">
            Status: {statusLabel}
          </Typography>
          {onTrial ? (
            <Typography variant="body">
              Trial: {trialDays ?? 0} day{trialDays === 1 ? '' : 's'} remaining
            </Typography>
          ) : null}
          <Typography variant="body">Valid until: {endLabel}</Typography>
          <Button
            title={primaryCtaTitle}
            variant={activePaid && !expiringSoon ? 'outline' : 'primary'}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          />
          <Button
            title="Payment history"
            variant="outline"
            onPress={() => navigation.navigate('SubscriptionPaymentHistory')}
          />
        </Card>
        {expiringSoon ? (
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

function createStyles(colors: { background: string; text: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, gap: 12 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    backText: { marginLeft: 8, color: colors.text },
    card: { padding: 16, gap: 12 },
  });
}

export default SubscriptionStatusScreen;
