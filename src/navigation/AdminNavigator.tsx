import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AllBookingsScreen from '../screens/admin/AllBookingsScreen';
import DriverManagementScreen from '../screens/admin/DriverManagementScreen';
import VehicleManagementScreen from '../screens/admin/VehicleManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AddBankAccountScreen from '../screens/admin/AddBankAccountScreen';
import ExpenseScreen from '../screens/admin/ExpenseScreen';
import TripDetailsScreen from '../screens/admin/TripDetailsScreen';
import SocietyUserTripBreakdownScreen from '../screens/admin/SocietyUserTripBreakdownScreen';
import ChangePasswordScreen from '../screens/admin/ChangePasswordScreen';
import SubscriptionPlansScreen from '../screens/admin/subscription/SubscriptionPlansScreen';
import SubscriptionCheckoutScreen from '../screens/admin/subscription/SubscriptionCheckoutScreen';
import SubscriptionStatusScreen from '../screens/admin/subscription/SubscriptionStatusScreen';
import SubscriptionPaymentHistoryScreen from '../screens/admin/subscription/SubscriptionPaymentHistoryScreen';
import RazorpayAccountSetupScreen from '../screens/admin/payments/RazorpayAccountSetupScreen';
import AgencyPayoutsScreen from '../screens/admin/payments/AgencyPayoutsScreen';
import DeliveryPaymentHistoryScreen from '../screens/admin/payments/DeliveryPaymentHistoryScreen';
import PaymentResultScreen from '../screens/shared/PaymentResultScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import AdminSubscriptionGate from '../components/admin/AdminSubscriptionGate';
import AdminPayoutBanner from '../components/admin/AdminPayoutBanner';
import type { PaymentResultScreenParams } from '../types/razorpay.types';

export type AdminStackParamList = {
  Bookings: undefined;
  TripDetails: undefined;
  SocietyUserTripBreakdown: {
    customerId: string;
    year: number;
    monthIndex0: number;
  };
  Drivers: undefined;
  Vehicles: undefined;
  Reports: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  BankAccounts: undefined;
  Expenses: undefined;
  SubscriptionPlans: undefined;
  SubscriptionCheckout: { subscriptionId: string; planId: string; planName: string };
  SubscriptionStatus: undefined;
  SubscriptionPaymentHistory: undefined;
  RazorpayAccountSetup: undefined;
  AgencyPayouts: undefined;
  DeliveryPaymentHistory: undefined;
  PaymentResult: PaymentResultScreenParams;
};

const Stack = createStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Admin']}>
      <AdminSubscriptionGate>
      <AdminPayoutBanner />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Bookings"
      >
        <Stack.Screen name="Bookings" component={AllBookingsScreen} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="SocietyUserTripBreakdown" component={SocietyUserTripBreakdownScreen} />
        <Stack.Screen name="Drivers" component={DriverManagementScreen} />
        <Stack.Screen name="Vehicles" component={VehicleManagementScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Profile" component={AdminProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="BankAccounts" component={AddBankAccountScreen} />
        <Stack.Screen name="Expenses" component={ExpenseScreen} />
        <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
        <Stack.Screen name="SubscriptionCheckout" component={SubscriptionCheckoutScreen} />
        <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
        <Stack.Screen name="SubscriptionPaymentHistory" component={SubscriptionPaymentHistoryScreen} />
        <Stack.Screen name="RazorpayAccountSetup" component={RazorpayAccountSetupScreen} />
        <Stack.Screen name="AgencyPayouts" component={AgencyPayoutsScreen} />
        <Stack.Screen name="DeliveryPaymentHistory" component={DeliveryPaymentHistoryScreen} />
        <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      </Stack.Navigator>
      </AdminSubscriptionGate>
    </ErrorBoundary>
  );
};

export default AdminNavigator;
