import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils/validation';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants/config';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography } from '../../components/common';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'driver' | 'admin'>('customer');
  const [errors, setErrors] = useState<{
    phone?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});
  
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    // Validate inputs
    const phoneValidation = ValidationUtils.validatePhone(phone);
    const passwordValidation = ValidationUtils.validatePassword(password);
    const nameValidation = ValidationUtils.validateName(name);
    
    const newErrors: any = {};
    
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error;
    }
    
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await register(phone, password, name, role);
      Alert.alert('Success', SUCCESS_MESSAGES.auth.registerSuccess);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.auth.userExists;
      Alert.alert('Registration Failed', errorMessage);
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
          <Typography variant="h1" style={styles.title}>Create Account</Typography>
          <Typography variant="body" style={styles.subtitle}>Sign up to get started</Typography>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Full Name</Typography>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
            {errors.name && <Typography variant="caption" style={styles.errorText}>{errors.name}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Phone Number</Typography>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone && <Typography variant="caption" style={styles.errorText}>{errors.phone}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Password</Typography>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password && <Typography variant="caption" style={styles.errorText}>{errors.password}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Confirm Password</Typography>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {errors.confirmPassword && <Typography variant="caption" style={styles.errorText}>{errors.confirmPassword}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Account Type</Typography>
            <View style={styles.roleContainer}>
              {(['customer', 'driver', 'admin'] as const).map((roleOption) => (
                <TouchableOpacity
                  key={roleOption}
                  style={[
                    styles.roleButton,
                    role === roleOption && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole(roleOption)}
                >
                  <Typography
                    variant="body"
                    style={[
                      styles.roleButtonText,
                      role === roleOption && styles.roleButtonTextActive,
                    ]}
                  >
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Typography variant="body" style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Typography variant="body" style={styles.footerText}>Already have an account? </Typography>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Typography variant="body" style={styles.linkText}>Sign In</Typography>
          </TouchableOpacity>
        </View>
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
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RegisterScreen;
