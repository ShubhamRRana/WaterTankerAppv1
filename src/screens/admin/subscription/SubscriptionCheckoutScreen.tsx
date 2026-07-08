import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { PaymentService } from '../../../services/payment.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { openCheckout } from '../../../services/razorpayCheckout.service';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../../constants/config';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';
import type { RazorpayOrderResponse } from '../../../types/razorpay.types';
import { PricingUtils } from '../../../utils/pricing';
import { getMonthlyPlanPrice, getPlanSavings } from '../../../utils/subscriptionPricing';

type Nav = StackNavigationProp<AdminStackParamList, 'SubscriptionCheckout'>;
type Route = RouteProp<AdminStackParamList, 'SubscriptionCheckout'>;

interface Props {
  navigation: Nav;
}

const SubscriptionCheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<Route>();
  const { subscriptionId, planId, planName } = route.params;
  const { user } = useAuthStore();
  const { plans } = useSubscriptionStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [order, setOrder] = useState<RazorpayOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const orderLoadedRef = useRef(false);
  const paymentCompletedRef = useRef(false);
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const savingsMessage = useMemo(() => {
    const plan = plans.find((item) => item.id === planId);
    const monthlyPrice = getMonthlyPlanPrice(plans);
    if (!plan || monthlyPrice == null) return null;

    const savings = getPlanSavings(plan, monthlyPrice);
    if (!savings) return null;

    return `You save ${PricingUtils.formatPrice(savings.savingsAmount)} (${savings.savingsPercent}%) vs paying monthly`;
  }, [plans, planId]);

  const navigateToPaymentSuccess = useCallback((referenceId?: string) => {
    paymentCompletedRef.current = true;
    useSubscriptionStore.getState().setPendingSubscriptionPaymentSuccess(
      referenceId ? { referenceId } : {}
    );
    navigationRef.current.replace('PaymentResult', {
      type: 'subscription',
      status: 'success',
      ...(referenceId ? { referenceId } : {}),
    });
  }, []);

  const loadOrder = useCallback(async () => {
    if (orderLoadedRef.current || paymentCompletedRef.current) return;
    orderLoadedRef.current = true;
    setLoading(true);
    try {
      const created = await PaymentService.createSubscriptionPayment(subscriptionId, planId);
      setOrder(created);
    } catch (e) {
      const message = e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed;
      if (message === ERROR_MESSAGES.payment.subscriptionNotEligible && user?.id) {
        const sub = await SubscriptionService.getCurrentSubscription(user.id);
        if (sub?.status === 'active') {
          navigateToPaymentSuccess();
          return;
        }
      }
      orderLoadedRef.current = false;
      Alert.alert('Error', message);
      navigationRef.current.goBack();
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, planId, user?.id, navigateToPaymentSuccess]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (plans.length === 0) {
      void useSubscriptionStore.getState().loadPlans();
    }
  }, [plans.length]);

  const handlePay = async () => {
    if (!order || !user) return;
    setPaying(true);
    paymentCompletedRef.current = true;
    const result = await openCheckout({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      description: `${planName} — platform subscription`,
      prefill: {
        email: user.email,
        name: user.name,
        ...(user.phone ? { contact: user.phone } : {}),
      },
    });

    if (result.status === 'cancelled') {
      paymentCompletedRef.current = false;
      setPaying(false);
      Alert.alert('Cancelled', ERROR_MESSAGES.payment.cancelled);
      return;
    }
    if (result.status === 'error') {
      paymentCompletedRef.current = false;
      setPaying(false);
      navigation.navigate('PaymentResult', {
        type: 'subscription',
        status: 'failed',
        message: result.message,
      });
      return;
    }

    try {
      await SubscriptionService.activateSubscription(subscriptionId, result.data);
      const referenceId = result.data.razorpay_payment_id;
      navigateToPaymentSuccess(referenceId);
      if (user.id) {
        await useSubscriptionStore.getState().refresh(user.id);
      }
    } catch (e) {
      paymentCompletedRef.current = false;
      navigation.navigate('PaymentResult', {
        type: 'subscription',
        status: 'failed',
        message: e instanceof Error ? e.message : ERROR_MESSAGES.payment.failed,
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" text={LOADING_MESSAGES.payment.processing} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <Typography variant="h2">Checkout</Typography>
        <Typography variant="body">{planName}</Typography>
        <Typography variant="h1">₹{(order?.amount ?? 0) / 100}</Typography>
        {savingsMessage ? (
          <Typography variant="caption" style={styles.savingsCaption}>
            {savingsMessage}
          </Typography>
        ) : null}
        <Typography variant="caption" style={{ opacity: 0.8 }}>
          Payment goes to the platform operator for agency app access.
        </Typography>
        <Button
          title={paying ? LOADING_MESSAGES.payment.processing : 'Pay with Razorpay'}
          onPress={() => void handlePay()}
          disabled={paying}
        />
      </Card>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string; success: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    card: { padding: 16, gap: 12 },
    savingsCaption: {
      color: colors.success,
      fontWeight: '600',
    },
  });
}

export default SubscriptionCheckoutScreen;
