import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import MenuDrawer, { MenuItem } from './MenuDrawer';

export type AdminRoute = 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile' | 'Migration';

interface AdminMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
  currentRoute?: AdminRoute;
}

const AdminMenuDrawer: React.FC<AdminMenuDrawerProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  currentRoute,
}) => {
  const menuItems: MenuItem<AdminRoute>[] = [
    {
      label: 'Bookings',
      icon: 'receipt-outline',
      route: 'Bookings',
      onPress: () => {
        onNavigate('Bookings');
        onClose();
      },
    },
    {
      label: 'Drivers',
      icon: 'people-outline',
      route: 'Drivers',
      onPress: () => {
        onNavigate('Drivers');
        onClose();
      },
    },
    {
      label: 'Vehicles',
      icon: 'car-outline',
      route: 'Vehicles',
      onPress: () => {
        onNavigate('Vehicles');
        onClose();
      },
    },
    {
      label: 'Reports',
      icon: 'bar-chart-outline',
      route: 'Reports',
      onPress: () => {
        onNavigate('Reports');
        onClose();
      },
    },
    {
      label: 'Profile',
      icon: 'person-circle-outline',
      route: 'Profile',
      onPress: () => {
        onNavigate('Profile');
        onClose();
      },
    },
    {
      label: 'Data Migration',
      icon: 'cloud-upload-outline',
      route: 'Migration',
      onPress: () => {
        onNavigate('Migration');
        onClose();
      },
    },
  ];

  return (
    <MenuDrawer
      visible={visible}
      onClose={onClose}
      onNavigate={onNavigate}
      onLogout={onLogout}
      currentRoute={currentRoute}
      menuItems={menuItems}
    />
  );
};

export default AdminMenuDrawer;

