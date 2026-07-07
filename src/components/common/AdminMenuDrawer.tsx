import React, { useMemo } from 'react';
import MenuDrawer, { MenuItem } from './MenuDrawer';
import { FEATURE_FLAGS } from '../../constants/config';
import { useAdminSubscriptionGate } from '../../context/AdminSubscriptionGateContext';

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
}

const ALL_MENU_ITEMS: Array<Omit<MenuItem<AdminRoute>, 'onPress'>> = [
  {
    label: 'Bookings',
    icon: 'receipt-outline',
    route: 'Bookings',
  },
  {
    label: 'Drivers',
    icon: 'people-outline',
    route: 'Drivers',
  },
  {
    label: 'Vehicles',
    icon: 'car-outline',
    route: 'Vehicles',
  },
  {
    label: 'Trip details',
    icon: 'car-outline',
    route: 'TripDetails',
  },
  {
    label: 'Reports',
    icon: 'bar-chart-outline',
    route: 'Reports',
  },
  {
    label: 'Payments & Payouts',
    icon: 'wallet-outline',
    route: 'BankAccounts',
  },
  {
    label: 'Payout history',
    icon: 'list-outline',
    route: 'DeliveryPaymentHistory',
  },
  {
    label: 'Profile',
    icon: 'person-outline',
    route: 'Profile',
  },
  {
    label: 'Expenses',
    icon: 'cash-outline',
    route: 'Expenses',
  },
];

const LOCKED_MENU_ITEMS: Array<Omit<MenuItem<AdminRoute>, 'onPress'>> = [
  {
    label: 'Subscription',
    icon: 'card-outline',
    route: 'SubscriptionPlans',
  },
  {
    label: 'Profile',
    icon: 'person-outline',
    route: 'Profile',
  },
];

const AdminMenuDrawer: React.FC<AdminMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
}) => {
  const { hasActive } = useAdminSubscriptionGate();
  const locked = FEATURE_FLAGS.enableSubscriptionGating && !hasActive;

  const menuItems = useMemo(() => {
    const source = locked ? LOCKED_MENU_ITEMS : ALL_MENU_ITEMS;
    return source.map((item) => ({
      ...item,
      onPress: () => {
        onNavigate(item.route);
        onClose();
      },
    }));
  }, [locked, onClose, onNavigate]);

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
