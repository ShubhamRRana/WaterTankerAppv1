import React, { useMemo } from 'react';
import MenuDrawer, { MenuItem } from './MenuDrawer';
import { FEATURE_FLAGS } from '../../constants/config';
import { useAdminSubscriptionGate } from '../../context/AdminSubscriptionGateContext';
import { useAuthStore } from '../../store/authStore';
import { isAdminUser } from '../../types';

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
  | 'SubscriptionStatus';

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
    group: 'Operations',
  },
  {
    label: 'Drivers',
    icon: 'people-outline',
    route: 'Drivers',
    group: 'Operations',
  },
  {
    label: 'Vehicles',
    icon: 'car-outline',
    route: 'Vehicles',
    group: 'Operations',
  },
  {
    label: 'Trip details',
    icon: 'navigate-outline',
    route: 'TripDetails',
    group: 'Operations',
  },
  {
    label: 'Reports',
    icon: 'bar-chart-outline',
    route: 'Reports',
    group: 'Business',
  },
  {
    label: 'Payments & QR',
    icon: 'wallet-outline',
    route: 'BankAccounts',
    group: 'Business',
  },
  {
    label: 'Expenses',
    icon: 'cash-outline',
    route: 'Expenses',
    group: 'Business',
  },
  {
    label: 'Profile',
    icon: 'person-outline',
    route: 'Profile',
  },
];

const LOCKED_MENU_ITEMS: Array<Omit<MenuItem<AdminRoute>, 'onPress'>> = [
  {
    label: 'Subscription',
    icon: 'card-outline',
    route: 'SubscriptionPlans',
    group: 'Business',
  },
  {
    label: 'Profile',
    icon: 'person-outline',
    route: 'Profile',
  },
];

function getInitials(source: string): string {
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`;
}

const AdminMenuDrawer: React.FC<AdminMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
}) => {
  const { hasActive } = useAdminSubscriptionGate();
  const user = useAuthStore((state) => state.user);
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

  const admin = user && isAdminUser(user) ? user : null;
  const headerTitle = admin?.businessName || user?.name || 'Menu';
  const headerSubtitle =
    admin?.businessName && user?.name ? user.name : user?.name ? 'Administrator' : undefined;
  const headerBadgeText = getInitials(headerTitle) || 'WT';

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      menuItems={menuItems}
      onLogout={onLogout}
      headerTitle={headerTitle}
      headerBadgeText={headerBadgeText}
      {...(headerSubtitle !== undefined ? { headerSubtitle } : {})}
      {...(currentRoute !== undefined ? { currentRoute } : {})}
    />
  );
};

export default AdminMenuDrawer;
