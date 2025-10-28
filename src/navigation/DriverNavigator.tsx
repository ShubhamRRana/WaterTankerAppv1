import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import OrdersScreen from '../screens/driver/OrdersScreen';
import ActiveOrderScreen from '../screens/driver/ActiveOrderScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';

export type DriverTabParamList = {
  Orders: undefined;
  Earnings: undefined;
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
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
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
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
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
