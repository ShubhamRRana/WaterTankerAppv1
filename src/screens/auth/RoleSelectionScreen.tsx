import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Typography } from '../../components/common';

type RoleSelectionScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleSelection'>;
type RoleSelectionScreenRouteProp = RouteProp<AuthStackParamList, 'RoleSelection'>;

interface Props {
  navigation: RoleSelectionScreenNavigationProp;
  route: RoleSelectionScreenRouteProp;
}

const RoleSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone, availableRoles } = route.params;
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { loginWithRole } = useAuthStore();

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role to continue');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithRole(phone, selectedRole);
      // Navigation will be handled by the auth store
    } catch (error) {
      Alert.alert('Login Failed', 'Failed to login with selected role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role: 'customer' | 'driver' | 'admin') => {
    switch (role) {
      case 'customer':
        return 'Customer';
      case 'driver':
        return 'Driver';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: 'customer' | 'driver' | 'admin') => {
    switch (role) {
      case 'customer':
        return 'Book water tankers and manage orders';
      case 'driver':
        return 'Accept orders and manage deliveries';
      case 'admin':
        return 'Manage users, orders, and system settings';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: 'customer' | 'driver' | 'admin') => {
    switch (role) {
      case 'customer':
        return '👤';
      case 'driver':
        return '🚛';
      case 'admin':
        return '⚙️';
      default:
        return '👤';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Typography variant="h1" style={styles.title}>Select Account Type</Typography>
          <Typography variant="body" style={styles.subtitle}>
            You have multiple accounts with this phone number. Choose which account you want to access.
          </Typography>
        </View>

        <View style={styles.roleContainer}>
          {availableRoles.map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleCard,
                selectedRole === role && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <View style={styles.roleHeader}>
                <Typography variant="body" style={styles.roleIcon}>{getRoleIcon(role)}</Typography>
                <View style={styles.roleInfo}>
                  <Typography variant="h3" style={[
                    styles.roleTitle,
                    selectedRole === role && styles.roleTitleSelected,
                  ]}>
                    {getRoleDisplayName(role)}
                  </Typography>
                  <Typography variant="caption" style={[
                    styles.roleDescription,
                    selectedRole === role && styles.roleDescriptionSelected,
                  ]}>
                    {getRoleDescription(role)}
                  </Typography>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!selectedRole || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleRoleSelection}
          disabled={!selectedRole || isLoading}
        >
          <Typography variant="body" style={styles.buttonText}>
            {isLoading ? 'Signing In...' : 'Continue'}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Typography variant="body" style={styles.backButtonText}>Back to Login</Typography>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  roleContainer: {
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#007AFF',
  },
  roleDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  roleDescriptionSelected: {
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RoleSelectionScreen;
