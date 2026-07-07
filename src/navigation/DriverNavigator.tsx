import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import OrdersScreen from '../screens/driver/OrdersScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import CollectPaymentScreen from '../screens/driver/CollectPaymentScreen';
import DriverAgencyInactiveScreen from '../screens/driver/DriverAgencyInactiveScreen';
import PaymentResultScreen from '../screens/shared/PaymentResultScreen';
import type { PaymentResultScreenParams } from '../types/razorpay.types';
import ErrorBoundary from '../components/common/ErrorBoundary';
import DriverAgencyGate, { useDriverAgencyGate } from '../context/DriverAgencyGateContext';
import { FEATURE_FLAGS } from '../constants/config';
import { useTheme } from '../theme/ThemeProvider';

export type DriverTabParamList = {
  Orders: undefined;
  Earnings: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  CollectPayment: { orderId: string; autoOpenDeliveryModal?: boolean };
  PaymentResult: PaymentResultScreenParams;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createStackNavigator<DriverStackParamList>();

const DriverTabsScreen: React.FC = () => {
  const { colors } = useTheme();
  const tabOptions = useMemo(
    () => ({
      headerShown: false as const,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: 8,
        paddingTop: 8,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500' as const,
      },
    }),
    [colors]
  );

  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={DriverEarningsScreen}
        options={{
          tabBarLabel: 'Total Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const DriverFullStack: React.FC = () => {
  const { colors } = useTheme();
  const stackScreenOptions = useMemo(
    () => ({
      headerShown: false,
      cardStyle: { backgroundColor: colors.background },
    }),
    [colors.background]
  );

  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="DriverTabs" component={DriverTabsScreen} />
      <Stack.Screen name="CollectPayment" component={CollectPaymentScreen} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
    </Stack.Navigator>
  );
};

const DriverNavigatorContent: React.FC = () => {
  const { agencyActive } = useDriverAgencyGate();
  const locked = FEATURE_FLAGS.enableSubscriptionGating && !agencyActive;

  if (locked) {
    return <DriverAgencyInactiveScreen />;
  }

  return <DriverFullStack />;
};

const DriverNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Driver']}>
      <DriverAgencyGate>
        <DriverNavigatorContent />
      </DriverAgencyGate>
    </ErrorBoundary>
  );
};

export default DriverNavigator;
