import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, DriverIcon, AdminIcon, CustomerIcon } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

type RoleEntryNavigationProp = StackNavigationProp<AuthStackParamList, 'RoleEntry'>;

interface Props {
  navigation: RoleEntryNavigationProp;
}

const RoleEntryScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | 'admin' | null>(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const roles: Array<{ key: 'customer' | 'driver' | 'admin'; title: string; subtitle: string }> = [
    { key: 'customer', title: 'Customer', subtitle: 'Book tankers and manage orders' },
    { key: 'admin', title: 'Admin', subtitle: 'Manage platform operations' },
    { key: 'driver', title: 'Driver', subtitle: 'Accept jobs and deliver' },
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
                  <View style={styles.roleInfo}>
                    <Typography variant="h3" style={[styles.roleTitle, selectedRole === role.key && styles.roleTitleSelected]}>
                      {role.title}
                    </Typography>
                    <Typography variant="caption" style={[styles.roleDescription, selectedRole === role.key && styles.roleDescriptionSelected]}>
                      {role.subtitle}
                    </Typography>
                  </View>
                  {role.key === 'driver' && (
                    <View style={styles.iconContainer}>
                      <DriverIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                  {role.key === 'admin' && (
                    <View style={styles.iconContainer}>
                      <AdminIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                  {role.key === 'customer' && (
                    <View style={styles.iconContainer}>
                      <CustomerIcon size={32} color={selectedRole === role.key ? UI_CONFIG.colors.accent : UI_CONFIG.colors.text} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, !selectedRole && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
            onPress={continueToLogin}
            disabled={!selectedRole}
            onPressIn={() => setIsButtonPressed(true)}
            onPressOut={() => setIsButtonPressed(false)}
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
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  roleContainer: {
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  roleCardSelected: {
    borderColor: UI_CONFIG.colors.accent,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginLeft: 16,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: UI_CONFIG.colors.accent,
  },
  roleDescription: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  roleDescriptionSelected: {
    color: UI_CONFIG.colors.primary,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: UI_CONFIG.colors.disabled,
    borderColor: UI_CONFIG.colors.disabled,
    shadowOpacity: 0.3,
  },
  buttonPressed: {
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  buttonText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RoleEntryScreen;


