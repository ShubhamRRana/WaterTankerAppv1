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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils/validation';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants/config';
import { AuthStackParamList } from '../../types/index';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthService } from '../../services/auth.service';
import { Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
  const { login, loginWithRole, isLoading } = useAuthStore();

  const handleLogin = async () => {
    // Validate inputs
    const phoneValidation = ValidationUtils.validatePhone(phone);
    const passwordValidation = ValidationUtils.validatePassword(password);

    if (!phoneValidation.isValid || !passwordValidation.isValid) {
      setErrors({
        phone: phoneValidation.error,
        password: passwordValidation.error,
      });
      return;
    }

    setErrors({});

    try {
      // If preferredRole is provided, we need to validate role match
      const preferredRole = route?.params?.preferredRole;
      
      if (preferredRole) {
        // For role-specific login, use loginWithRole directly to ensure role match
        await loginWithRole(phone, preferredRole);
        // Navigation will be handled by the auth store
      } else {
        // No preferred role - proceed with normal login
        await login(phone, password);
        // Navigation will be handled by the auth store
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ROLE_SELECTION_REQUIRED') {
        // Get available roles and act on preferred role if provided
        const result = await AuthService.login(phone, password);
        if (result.success && result.availableRoles) {
          const preferredRole = route?.params?.preferredRole;
          if (preferredRole && result.availableRoles.includes(preferredRole)) {
            try {
              await loginWithRole(phone, preferredRole);
              return;
            } catch (_) {
              // fallback to role selection
            }
          }
          navigation.navigate('RoleSelection', {
            phone,
            availableRoles: result.availableRoles,
          });
        }
      } else {
        // Check if error is due to role mismatch
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        if (errorMessage.includes('not found with selected role') || errorMessage.includes('User not found with selected role')) {
          Alert.alert('Login Failed', ERROR_MESSAGES.auth.roleMismatch);
        } else {
          Alert.alert('Login Failed', ERROR_MESSAGES.auth.invalidCredentials);
        }
      }
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
          <Typography variant="h1" style={styles.title}>Welcome Back</Typography>
          <Typography variant="body" style={styles.subtitle}>Sign in to your account</Typography>
        </View>

        <View style={styles.form}>
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
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={UI_CONFIG.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Typography variant="caption" style={styles.errorText}>{errors.password}</Typography>}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={isLoading}
            onPressIn={() => setIsButtonPressed(true)}
            onPressOut={() => setIsButtonPressed(false)}
          >
            <Typography variant="body" style={styles.buttonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Typography>
          </TouchableOpacity>
        </View>

        {route?.params?.preferredRole !== 'driver' && (
          <View style={styles.footer}>
            <Typography variant="body" style={styles.footerText}>Don't have an account? </Typography>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { preferredRole: route?.params?.preferredRole })}>
              <Typography variant="body" style={styles.linkText}>Sign Up</Typography>
            </TouchableOpacity>
          </View>
        )}
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
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
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
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    color: UI_CONFIG.colors.text,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  inputError: {
    borderColor: UI_CONFIG.colors.error,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  linkText: {
    fontSize: 16,
    color: UI_CONFIG.colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
