import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner, AdminMenuDrawer } from '../../../components/common';
import type { AdminRoute } from '../../../components/common/AdminMenuDrawer';
import { useAuthStore } from '../../../store/authStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { SubscriptionService } from '../../../services/subscription.service';
import { FEATURE_FLAGS, UI_CONFIG } from '../../../constants/config';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';
import type { SubscriptionPlan } from '../../../types/subscription.types';
import { PricingUtils } from '../../../utils/pricing';
import {
  getEffectiveMonthlyPrice,
  getMonthlyPlanPrice,
  getPlanSavings,
} from '../../../utils/subscriptionPricing';
import type { AppPalette } from '../../../theme/palettes';

type Nav = StackNavigationProp<AdminStackParamList, 'SubscriptionPlans'>;

interface Props {
  navigation: Nav;
}

const SubscriptionPlansScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { plans, loading, loadPlans, currentSubscription, refresh } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [menuVisible, setMenuVisible] = useState(false);
  const monthlyPrice = useMemo(() => getMonthlyPlanPrice(plans), [plans]);

  useEffect(() => {
    void loadPlans();
    if (user?.id) void refresh(user.id);
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'SubscriptionPlans') return;
    navigation.navigate(route);
  };

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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              Agency subscription
            </Typography>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
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
        {plans.map((plan) => {
          const savings = monthlyPrice != null ? getPlanSavings(plan, monthlyPrice) : null;
          const effectiveMonthly = getEffectiveMonthlyPrice(plan);

          return (
            <Card key={plan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Typography variant="h3">{plan.name}</Typography>
                {savings ? (
                  <View style={styles.savingsBadge}>
                    <Typography variant="caption" style={styles.savingsBadgeText}>
                      Save {PricingUtils.formatPrice(savings.savingsAmount)} ({savings.savingsPercent}%)
                    </Typography>
                  </View>
                ) : null}
              </View>
              <Typography variant="body" style={{ opacity: 0.8 }}>{plan.description}</Typography>
              <View style={styles.priceBlock}>
                {savings ? (
                  <Typography variant="body" style={styles.listPrice}>
                    {PricingUtils.formatPrice(savings.listPrice)}
                  </Typography>
                ) : null}
                <Typography variant="h2" style={styles.price}>
                  {PricingUtils.formatPrice(plan.price)}
                </Typography>
                <Typography variant="caption" style={styles.durationCaption}>
                  {plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''}
                  {plan.durationMonths > 1
                    ? ` · ${PricingUtils.formatPrice(effectiveMonthly, 2)}/month`
                    : ''}
                </Typography>
              </View>
              <Button title="Subscribe with Razorpay" onPress={() => void handleSelect(plan)} />
            </Card>
          );
        })}
      </ScrollView>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="SubscriptionPlans"
      />
    </SafeAreaView>
  );
};

function createStyles(colors: Pick<AppPalette, 'background' | 'surface' | 'border' | 'success' | 'textLight'>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: UI_CONFIG.spacing.lg,
      paddingVertical: UI_CONFIG.spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      padding: 8,
      marginRight: 12,
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      marginBottom: 0,
    },
    scroll: { padding: 16, gap: 12 },
    subtitle: { marginBottom: 8 },
    card: { padding: 16, gap: 8 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    savingsBadge: {
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    savingsBadgeText: {
      color: colors.textLight,
      fontWeight: '600',
    },
    priceBlock: { gap: 2, marginVertical: 4 },
    listPrice: {
      textDecorationLine: 'line-through',
      opacity: 0.55,
    },
    price: { marginVertical: 0 },
    durationCaption: { opacity: 0.7 },
    manageBtn: { marginBottom: 8 },
  });
}

export default SubscriptionPlansScreen;
