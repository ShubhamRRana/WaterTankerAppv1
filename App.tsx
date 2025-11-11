import React, { useEffect, Suspense, lazy } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { testSupabaseConfig } from './src/utils/testSupabaseConfig';
import { UI_CONFIG } from './src/constants/config';

// Lazy load navigators for code splitting
const AuthNavigator = lazy(() => import('./src/navigation/AuthNavigator'));
const CustomerNavigator = lazy(() => import('./src/navigation/CustomerNavigator'));
const DriverNavigator = lazy(() => import('./src/navigation/DriverNavigator'));
const AdminNavigator = lazy(() => import('./src/navigation/AdminNavigator'));

// Store imports
import { useAuthStore } from './src/store/authStore';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';

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

  useEffect(() => {
    testSupabaseConfig();
  }, []);

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

  // Loading component for lazy-loaded navigators
  const NavigatorLoadingFallback = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: UI_CONFIG.colors.background }}>
      <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
    </View>
  );

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Suspense fallback={<NavigatorLoadingFallback />}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
              }}
            >
              {renderNavigator()}
            </Stack.Navigator>
          </Suspense>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;