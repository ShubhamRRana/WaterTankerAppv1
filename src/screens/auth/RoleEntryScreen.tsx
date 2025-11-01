import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../components/common';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

type RoleEntryNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleEntry'>;

interface Props {
  navigation: RoleEntryNavigationProp;
}

const RoleEntryScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | 'admin' | null>(null);

  const roles: Array<{ key: 'customer' | 'driver' | 'admin'; title: string; subtitle: string; icon: string }> = [
    { key: 'customer', title: 'Customer', subtitle: 'Book tankers and manage orders', icon: '👤' },
    { key: 'admin', title: 'Admin', subtitle: 'Manage platform operations', icon: '⚙️' },
    { key: 'driver', title: 'Driver', subtitle: 'Accept jobs and deliver', icon: '🚛' },
  ];

  const continueToLogin = () => {
    if (!selectedRole) return;
    navigation.navigate('Login', { preferredRole: selectedRole });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Typography variant="h1" style={styles.title}>Choose Your Role</Typography>
            <Typography variant="body" style={styles.subtitle}>Select how you want to use the app</Typography>
          </View>

          <View style={styles.roleContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[styles.roleCard, selectedRole === role.key && styles.roleCardSelected]}
                onPress={() => setSelectedRole(role.key)}
              >
                <View style={styles.roleHeader}>
                  <Typography variant="body" style={styles.roleIcon}>{role.icon}</Typography>
                  <View style={styles.roleInfo}>
                    <Typography variant="h3" style={[styles.roleTitle, selectedRole === role.key && styles.roleTitleSelected]}>
                      {role.title}
                    </Typography>
                    <Typography variant="caption" style={[styles.roleDescription, selectedRole === role.key && styles.roleDescriptionSelected]}>
                      {role.subtitle}
                    </Typography>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, !selectedRole && styles.buttonDisabled]}
            onPress={continueToLogin}
            disabled={!selectedRole}
          >
            <Typography variant="body" style={styles.buttonText}>Continue</Typography>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#4B5563',
    textAlign: 'center',
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
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  roleCardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: '#FFF8E6',
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
    color: '#D4AF37',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  roleDescriptionSelected: {
    color: '#1E3A8A',
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RoleEntryScreen;


