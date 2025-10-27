import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import AvailableOrdersScreen from '../screens/driver/AvailableOrdersScreen';
import ActiveOrderScreen from '../screens/driver/ActiveOrderScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

export type DriverTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  Earnings: undefined;
  Profile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  ActiveOrder: { orderId: string };
};

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createStackNavigator<DriverStackParamList>();

const DriverTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DriverDashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={AvailableOrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={DriverEarningsScreen}
        options={{ tabBarLabel: 'Earnings' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={DriverProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const DriverNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
      <Stack.Screen name="ActiveOrder" component={ActiveOrderScreen} />
    </Stack.Navigator>
  );
};

export default DriverNavigator;
