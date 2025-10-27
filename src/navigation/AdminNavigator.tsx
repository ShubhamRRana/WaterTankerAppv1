import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AllBookingsScreen from '../screens/admin/AllBookingsScreen';
import DriverManagementScreen from '../screens/admin/DriverManagementScreen';
import CustomerManagementScreen from '../screens/admin/CustomerManagementScreen';
import PricingManagementScreen from '../screens/admin/PricingManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';

export type AdminTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Drivers: undefined;
  Customers: undefined;
  Pricing: undefined;
  Reports: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createStackNavigator<AdminStackParamList>();

const AdminTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={AllBookingsScreen}
        options={{ tabBarLabel: 'Bookings' }}
      />
      <Tab.Screen 
        name="Drivers" 
        component={DriverManagementScreen}
        options={{ tabBarLabel: 'Drivers' }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomerManagementScreen}
        options={{ tabBarLabel: 'Customers' }}
      />
      <Tab.Screen 
        name="Pricing" 
        component={PricingManagementScreen}
        options={{ tabBarLabel: 'Pricing' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ tabBarLabel: 'Reports' }}
      />
    </Tab.Navigator>
  );
};

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
