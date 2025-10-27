import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

// Navigation imports
import AuthNavigator from './src/navigation/AuthNavigator';
import CustomerNavigator from './src/navigation/CustomerNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';

// Store imports
import { useAuthStore } from './src/store/authStore';

// Types
import { User } from './src/types';

export type RootStackParamList = {
  Auth: undefined;
  Customer: undefined;
  Driver: undefined;
  Admin: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const { user, initializeAuth, isLoading } = useAuthStore();

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
  });

  useEffect(() => {
    // Initialize the auth system and load any existing user
    initializeAuth();
  }, [initializeAuth]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null; // or a loading screen
  }

  const getNavigatorForUser = (user: User | null) => {
    if (!user) return 'Auth';
    
    switch (user.role) {
      case 'customer':
        return 'Customer';
      case 'driver':
        return 'Driver';
      case 'admin':
        return 'Admin';
      default:
        return 'Auth';
    }
  };

  const renderNavigator = () => {
    if (!user) {
      return <Stack.Screen name="Auth" component={AuthNavigator} />;
    }

    switch (user.role) {
      case 'customer':
        return <Stack.Screen name="Customer" component={CustomerNavigator} />;
      case 'driver':
        return <Stack.Screen name="Driver" component={DriverNavigator} />;
      case 'admin':
        return <Stack.Screen name="Admin" component={AdminNavigator} />;
      default:
        return <Stack.Screen name="Auth" component={AuthNavigator} />;
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {renderNavigator()}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;