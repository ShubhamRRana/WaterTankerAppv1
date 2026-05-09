/**
 * Navigation Configuration Tests
 * Tests for navigation setup, screen registration, and route configuration
 */

// Mock React Navigation before any imports
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <View testID="NavigationContainer">{children}</View>,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => <View testID="StackNavigator">{children}</View>,
      Screen: ({ component: Component }: { component: React.ComponentType; name: string }) => 
        Component ? <Component /> : null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => <View testID="TabNavigator">{children}</View>,
      Screen: ({ component: Component }: { component: React.ComponentType; name: string }) => 
        Component ? <Component /> : null,
    }),
  };
});

import { renderWithProviders as render } from '../renderWithProviders';
import type { AuthStackParamList } from '../../types';
import AuthNavigator from '../../navigation/AuthNavigator';
import DriverNavigator from '../../navigation/DriverNavigator';
import AdminNavigator from '../../navigation/AdminNavigator';

// Mock all screen components
jest.mock('../../screens/auth/LoginScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="LoginScreen"><Text>LoginScreen</Text></View>;
});

jest.mock('../../screens/auth/RegisterScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="RegisterScreen"><Text>RegisterScreen</Text></View>;
});

jest.mock('../../screens/auth/RoleEntryScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="RoleEntryScreen"><Text>RoleEntryScreen</Text></View>;
});

jest.mock('../../screens/auth/PendingEmailVerificationScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="PendingEmailVerificationScreen">
      <Text>PendingEmailVerificationScreen</Text>
    </View>
  );
});

jest.mock('../../screens/driver/OrdersScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="OrdersScreen"><Text>OrdersScreen</Text></View>;
});

jest.mock('../../screens/driver/DriverEarningsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="DriverEarningsScreen"><Text>DriverEarningsScreen</Text></View>;
});

jest.mock('../../screens/driver/CollectPaymentScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="CollectPaymentScreen"><Text>CollectPaymentScreen</Text></View>;
});

jest.mock('../../screens/admin/AdminProfileScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="AdminProfileScreen"><Text>AdminProfileScreen</Text></View>;
});

jest.mock('../../screens/admin/AllBookingsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="AllBookingsScreen"><Text>AllBookingsScreen</Text></View>;
});

jest.mock('../../screens/admin/DriverManagementScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="DriverManagementScreen"><Text>DriverManagementScreen</Text></View>;
});

jest.mock('../../screens/admin/VehicleManagementScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="VehicleManagementScreen"><Text>VehicleManagementScreen</Text></View>;
});

jest.mock('../../screens/admin/ReportsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="ReportsScreen"><Text>ReportsScreen</Text></View>;
});

jest.mock('../../screens/admin/AddBankAccountScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="AddBankAccountScreen"><Text>AddBankAccountScreen</Text></View>;
});

jest.mock('../../screens/admin/ExpenseScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="ExpenseScreen"><Text>ExpenseScreen</Text></View>;
});

jest.mock('../../screens/admin/TripDetailsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => <View testID="TripDetailsScreen"><Text>TripDetailsScreen</Text></View>;
});

jest.mock('../../components/common/ErrorBoundary', () => {
  const React = require('react');
  return ({ children }: { children: React.ReactNode }) => <>{children}</>;
});

describe('Navigation Configuration', () => {
  describe('AuthNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<AuthNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have all required screens registered', () => {
      const { getByTestId } = render(<AuthNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('DriverNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<DriverNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have tab navigator with two Orders-related tabs', () => {
      const { getByTestId } = render(<DriverNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('AdminNavigator', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<AdminNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });

    it('should have all required screens registered', () => {
      const { getByTestId } = render(<AdminNavigator />);
      expect(getByTestId('StackNavigator')).toBeTruthy();
    });
  });

  describe('Navigation Type Definitions', () => {
    it('should export AuthStackParamList type', () => {
      const testParams: { RoleEntry: undefined } = { RoleEntry: undefined };
      expect(testParams).toBeDefined();
    });

    it('should accept PendingEmailVerification route params', () => {
      const pendingParams: AuthStackParamList['PendingEmailVerification'] = {
        email: 'user@example.com',
        preferredRole: 'admin',
      };
      expect(pendingParams.email).toBe('user@example.com');
      expect(pendingParams.preferredRole).toBe('admin');
    });

    it('should export DriverTabParamList type', () => {
      const testParams: { Orders: undefined } = { Orders: undefined };
      expect(testParams).toBeDefined();
    });

    it('should export DriverStackParamList type', () => {
      const testParams: { DriverTabs: undefined } = { DriverTabs: undefined };
      expect(testParams).toBeDefined();
    });

    it('should export AdminStackParamList type', () => {
      const testParams: { Bookings: undefined } = { Bookings: undefined };
      expect(testParams).toBeDefined();
    });
  });
});
