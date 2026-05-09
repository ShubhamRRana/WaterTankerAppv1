import React, { useEffect, useRef, Suspense, lazy } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  Theme as NavTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';

// Lazy load navigators for code splitting
const AuthNavigator = lazy(() => import('./src/navigation/AuthNavigator'));
const DriverNavigator = lazy(() => import('./src/navigation/DriverNavigator'));
const AdminNavigator = lazy(() => import('./src/navigation/AdminNavigator'));

// Store imports
import { useAuthStore } from './src/store/authStore';

// Components
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

// Types
import { User } from './src/types';

export type RootStackParamList = {
  Auth: undefined;
  Driver: undefined;
  Admin: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function getRootRouteName(u: User | null): keyof RootStackParamList {
  if (!u) return 'Auth';
  if (u.role === 'driver') return 'Driver';
  if (u.role === 'admin') return 'Admin';
  return 'Auth';
}

function NavigatorLoadingFallback() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

function NavigationContent() {
  const { user } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { colors, resolvedScheme } = useTheme();

  const navTheme: NavTheme = React.useMemo(() => {
    const base = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [resolvedScheme, colors]);

  useEffect(() => {
    if (navigationRef.current?.isReady()) {
      const targetRoute = getRootRouteName(user);
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;

      if (currentRoute !== targetRoute) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      }
    }
  }, [user]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Suspense fallback={<NavigatorLoadingFallback />}>
        <Stack.Navigator
          initialRouteName={getRootRouteName(user)}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="Driver" component={DriverNavigator} />
          <Stack.Screen name="Admin" component={AdminNavigator} />
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>
  );
}

const App: React.FC = () => {
  const { initializeAuth } = useAuthStore();

  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': require('./assets/fonts/PlayfairDisplay-Regular.ttf'),
  });

  useEffect(() => {
    initializeAuth().catch((_error) => {
      // Error handled by error boundary
    });
  }, [initializeAuth]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
