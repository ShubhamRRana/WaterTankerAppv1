import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AllBookingsScreen from '../screens/admin/AllBookingsScreen';
import DriverManagementScreen from '../screens/admin/DriverManagementScreen';
import VehicleManagementScreen from '../screens/admin/VehicleManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';

export type AdminStackParamList = {
  Bookings: undefined;
  Drivers: undefined;
  Vehicles: undefined;
  Reports: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <ErrorBoundary resetKeys={['Admin']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Bookings"
      >
        <Stack.Screen name="Bookings" component={AllBookingsScreen} />
        <Stack.Screen name="Drivers" component={DriverManagementScreen} />
        <Stack.Screen name="Vehicles" component={VehicleManagementScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Profile" component={AdminProfileScreen} />
      </Stack.Navigator>
    </ErrorBoundary>
  );
};

export default AdminNavigator;
