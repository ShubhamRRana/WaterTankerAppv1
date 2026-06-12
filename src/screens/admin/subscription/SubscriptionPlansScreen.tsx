import React, { useEffect, useMemo } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { SubscriptionService } from '../../../services/subscription.service';
import { FEATURE_FLAGS } from '../../../constants/config';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';
import type { SubscriptionPlan } from '../../../types/subscription.types';

type Nav = StackNavigationProp<AdminStackParamList, 'SubscriptionPlans'>;

interface Props {
  navigation: Nav;
}

const SubscriptionPlansScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { plans, loading, loadPlans, currentSubscription, refresh } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    void loadPlans();
    if (user?.id) void refresh(user.id);
  }, [user?.id]);

  const handleSelect = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;
    if (!FEATURE_FLAGS.enableRazorpaySubscription) {
      Alert.alert('Unavailable', 'Online subscription checkout is not enabled yet.');
      return;
    }
    try {
      const sub = await SubscriptionService.prepareSubscriptionCheckout(user.id, plan.id);
      navigation.navigate('SubscriptionCheckout', {
        subscriptionId: sub.id,
        planId: plan.id,
        planName: plan.name,
      });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not start checkout');
    }
  };

  if (loading && plans.length === 0) {
    return <LoadingSpinner size="large" text="Loading plans..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="h1">Agency subscription</Typography>
        <Typography variant="body" style={[styles.subtitle, { opacity: 0.8 }]}>
          Choose a plan to activate your agency account on the platform.
        </Typography>
        {currentSubscription?.status === 'active' ? (
          <Button
            title="View subscription status"
            variant="outline"
            onPress={() => navigation.navigate('SubscriptionStatus')}
            style={styles.manageBtn}
          />
        ) : null}
        {plans.map((plan) => (
          <Card key={plan.id} style={styles.card}>
            <Typography variant="h3">{plan.name}</Typography>
            <Typography variant="body" style={{ opacity: 0.8 }}>{plan.description}</Typography>
            <Typography variant="h2" style={styles.price}>₹{plan.price}</Typography>
            <Typography variant="caption" style={{ opacity: 0.7 }}>
              {plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''}
            </Typography>
            <Button title="Subscribe with Razorpay" onPress={() => void handleSelect(plan)} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, gap: 12 },
    subtitle: { marginBottom: 8 },
    card: { padding: 16, gap: 8 },
    price: { marginVertical: 4 },
    manageBtn: { marginBottom: 8 },
  });
}

export default SubscriptionPlansScreen;
