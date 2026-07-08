import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button } from '../../components/common';
import { useOptionalAdminSubscriptionGate } from '../../context/AdminSubscriptionGateContext';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useTheme } from '../../theme/ThemeProvider';
import type { PaymentResultScreenParams } from '../../types/razorpay.types';

type Params = PaymentResultScreenParams;

interface Props {
  navigation: StackNavigationProp<Record<string, object | undefined>>;
}

const PaymentResultScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const params = route.params as Params;
  const gateContext = useOptionalAdminSubscriptionGate();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isSuccess = params.status === 'success';
  const title = isSuccess ? 'Payment successful' : params.status === 'pending' ? 'Payment processing' : 'Payment failed';

  const onPrimary = () => {
    if (params.type === 'subscription' && params.status === 'success') {
      void (async () => {
        useSubscriptionStore.getState().clearPendingSubscriptionPaymentSuccess();
        if (gateContext) {
          await gateContext.refresh({ navigateTo: 'SubscriptionStatus' });
        }
        navigation.navigate('SubscriptionStatus' as never);
      })();
      return;
    }
    if (params.type === 'subscription') {
      navigation.navigate('SubscriptionStatus' as never);
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name={isSuccess ? 'checkmark-circle' : params.status === 'pending' ? 'time' : 'close-circle'}
          size={72}
          color={isSuccess ? colors.success : params.status === 'pending' ? colors.warning : colors.error}
        />
        <Typography variant="h2" style={styles.title}>{title}</Typography>
        {params.message ? (
          <Typography variant="body" style={[styles.message, { opacity: 0.8 }]}>
            {params.message}
          </Typography>
        ) : null}
        {params.referenceId ? (
          <Typography variant="caption" style={{ opacity: 0.7 }}>
            Reference: {params.referenceId}
          </Typography>
        ) : null}
        <Button title={isSuccess ? 'Continue' : 'Go back'} onPress={onPrimary} style={styles.button} />
      </View>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    title: { marginTop: 16, textAlign: 'center' },
    message: { marginTop: 8, textAlign: 'center' },
    button: { marginTop: 24, minWidth: 200 },
  });
}

export default PaymentResultScreen;
