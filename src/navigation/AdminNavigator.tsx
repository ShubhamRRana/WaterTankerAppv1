import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AllBookingsScreen from '../screens/admin/AllBookingsScreen';
import DriverManagementScreen from '../screens/admin/DriverManagementScreen';
import PricingManagementScreen from '../screens/admin/PricingManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';

export type AdminTabParamList = {
  Bookings: undefined;
  Drivers: undefined;
  Pricing: undefined;
  Reports: undefined;
  Profile: undefined;
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
        tabBarActiveTintColor: '#D4AF37', // Champagne Gold
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
        name="Bookings" 
        component={AllBookingsScreen}
        options={{ 
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Drivers" 
        component={DriverManagementScreen}
        options={{ 
          tabBarLabel: 'Drivers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Pricing" 
        component={PricingManagementScreen}
        options={{ 
          tabBarLabel: 'Pricing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ 
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
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
