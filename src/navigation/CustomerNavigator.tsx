import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedAddressesScreen from '../screens/customer/SavedAddressesScreen';

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
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createStackNavigator<CustomerStackParamList>();

const CustomerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
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
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
