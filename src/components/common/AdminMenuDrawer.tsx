import React from 'react';
import MenuDrawer, { MenuItem } from './MenuDrawer';

export type AdminRoute =
  | 'Bookings'
  | 'TripDetails'
  | 'Drivers'
  | 'Vehicles'
  | 'Reports'
  | 'Profile'
  | 'BankAccounts'
  | 'Expenses'
  | 'SubscriptionPlans'
  | 'SubscriptionStatus'
  | 'RazorpayAccountSetup'
  | 'AgencyPayouts'
  | 'DeliveryPaymentHistory';

interface AdminMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
  currentRoute?: AdminRoute;
  subscriptionExpiring?: boolean;
}

const AdminMenuDrawer: React.FC<AdminMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
  subscriptionExpiring,
}) => {
  const menuItems: MenuItem<AdminRoute>[] = [
    {
      label: 'Bookings',
      icon: 'receipt-outline',
      route: 'Bookings',
      onPress: () => { onNavigate('Bookings'); onClose(); },
    },
    {
      label: 'Drivers',
      icon: 'people-outline',
      route: 'Drivers',
      onPress: () => { onNavigate('Drivers'); onClose(); },
    },
    {
      label: 'Vehicles',
      icon: 'car-outline',
      route: 'Vehicles',
      onPress: () => { onNavigate('Vehicles'); onClose(); },
    },
    {
      label: 'Trip details',
      icon: 'car-outline',
      route: 'TripDetails',
      onPress: () => { onNavigate('TripDetails'); onClose(); },
    },
    {
      label: 'Reports',
      icon: 'bar-chart-outline',
      route: 'Reports',
      onPress: () => { onNavigate('Reports'); onClose(); },
    },
    {
      label: subscriptionExpiring ? 'Subscription (expiring)' : 'Subscription',
      icon: 'card-outline',
      route: 'SubscriptionPlans',
      onPress: () => { onNavigate('SubscriptionStatus'); onClose(); },
    },
    {
      label: 'Payments & Payouts',
      icon: 'wallet-outline',
      route: 'BankAccounts',
      onPress: () => { onNavigate('BankAccounts'); onClose(); },
    },
    {
      label: 'Payout history',
      icon: 'list-outline',
      route: 'DeliveryPaymentHistory',
      onPress: () => { onNavigate('DeliveryPaymentHistory'); onClose(); },
    },
    {
      label: 'Profile',
      icon: 'person-outline',
      route: 'Profile',
      onPress: () => { onNavigate('Profile'); onClose(); },
    },
    {
      label: 'Expenses',
      icon: 'cash-outline',
      route: 'Expenses',
      onPress: () => { onNavigate('Expenses'); onClose(); },
    },
  ];

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      menuItems={menuItems}
      onLogout={onLogout}
      {...(currentRoute !== undefined ? { currentRoute } : {})}
    />
  );
};

export default AdminMenuDrawer;
