import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../constants/config';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedAddressesScreen from '../screens/customer/SavedAddressesScreen';
import PastOrdersScreen from '../screens/customer/PastOrdersScreen';

export type CustomerTabParamList = {
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: undefined;
  Booking: undefined;
  OrderTracking: { orderId: string };
  SavedAddresses: undefined;
  PastOrders: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createStackNavigator<CustomerStackParamList>();

const CustomerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: UI_CONFIG.colors.primary,
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
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={CustomerHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrderHistoryScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const CustomerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <Stack.Screen name="PastOrders" component={PastOrdersScreen} />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
