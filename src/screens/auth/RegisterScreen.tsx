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
import { Typography } from '../../components/common';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
  route: RegisterScreenRouteProp;
}

const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const role: 'customer' | 'driver' | 'admin' = route?.params?.preferredRole ?? 'customer';
  const [errors, setErrors] = useState<{
    phone?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  
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
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Typography variant="caption" style={styles.errorText}>{errors.password}</Typography>}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Confirm Password</Typography>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Typography variant="caption" style={styles.errorText}>{errors.confirmPassword}</Typography>}
          </View>

          {/* Account Type selection removed; role is determined before registration */}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled, isButtonPressed && styles.buttonPressed]}
            onPress={handleRegister}
            disabled={isLoading}
            onPressIn={() => setIsButtonPressed(true)}
            onPressOut={() => setIsButtonPressed(false)}
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
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  
  button: {
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#000000',
    shadowColor: '#c5c5c5',
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#c5c5c5',
    borderColor: '#000000',
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
    color: '#090909',
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
    color: '#8E8E93',
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default RegisterScreen;
