import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../constants/config';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AllBookingsScreen from '../screens/admin/AllBookingsScreen';
import DriverManagementScreen from '../screens/admin/DriverManagementScreen';
import VehicleManagementScreen from '../screens/admin/VehicleManagementScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';

export type AdminTabParamList = {
  Bookings: undefined;
  Drivers: undefined;
  Vehicles: undefined;
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
        tabBarActiveTintColor: UI_CONFIG.colors.accent,
        tabBarInactiveTintColor: UI_CONFIG.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: UI_CONFIG.colors.surface,
          borderTopWidth: 1,
          borderTopColor: UI_CONFIG.colors.border,
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
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Vehicles" 
        component={VehicleManagementScreen}
        options={{ 
          tabBarLabel: 'Vehicles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
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
