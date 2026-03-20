import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabaseClient';
import { AuthStackParamList } from '../../types';
import { SanitizationUtils, ValidationUtils } from '../../utils';
import { UI_CONFIG } from '../../constants/config';
import { Typography } from '../../components/common';

type ResetPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
  navigation: ResetPasswordNavigationProp;
  route: ResetPasswordRouteProp;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeEmail(text);
    setEmail(sanitized);

    if (!sanitized) {
      setErrors({});
      return;
    }

    const validation = ValidationUtils.validateEmail(sanitized, true);
    setErrors(
      validation.isValid
        ? {}
        : { email: validation.error ?? 'Please enter a valid email address' }
    );
  };

  const handleResetPassword = async () => {
    const sanitizedEmail = SanitizationUtils.sanitizeEmail(email);
    const validation = ValidationUtils.validateEmail(sanitizedEmail, true);

    if (!validation.isValid) {
      setErrors({
        email: validation.error ?? 'Please enter a valid email address',
      });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      // After the user clicks the recovery email link, Supabase will redirect them here.
      // Keep this in sync with Supabase Auth "Site URL" / redirect configuration.
      const fallbackRedirectTo = 'https://tankerhub.in/auth/reset-password';

      const redirectTo =
        (Constants.expoConfig?.extra as { resetPasswordRedirectTo?: string } | undefined)
          ?.resetPasswordRedirectTo || fallbackRedirectTo;

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo,
      });

      // Avoid leaking whether the email exists; Supabase may return "User not found".
      // We still show a generic success message for better UX/security.
      if (error) {
        const message = error.message || 'Unable to send reset email. Please try again.';
        const lower = message.toLowerCase();
        const likelyEmailConfigIssue =
          lower.includes('recovery mail') || lower.includes('recovery') || lower.includes('send');

        // Helpful for troubleshooting: keep the full Supabase error in logs.
        console.error('resetPasswordForEmail error:', error);

        Alert.alert(
          'Error',
          `${message}${
            likelyEmailConfigIssue
              ? '\n\nHint: In Supabase Auth settings, verify your Resend configuration (API key, From address/domain verified) and "Site URL", then try again.'
              : ''
          }`
        );
        return;
      }

      Alert.alert('Success', 'Password reset email sent. Check your inbox.');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Error', 'Unable to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
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
            <Typography variant="h1" style={styles.title}>
              Reset Password
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Enter your email to receive a reset link
            </Typography>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.label}>
                Email Address
              </Typography>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
              />
              {errors.email ? (
                <Typography variant="caption" style={styles.errorText}>
                  {errors.email}
                </Typography>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <Typography variant="body" style={styles.buttonText}>
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </Typography>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Typography variant="body" style={styles.linkText}>
                Back to Login
              </Typography>
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
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'PlayfairDisplay-Regular',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
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
  inputError: {
    borderColor: UI_CONFIG.colors.error,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    backgroundColor: UI_CONFIG.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 27,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.accent,
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
  buttonText: {
    color: UI_CONFIG.colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    color: UI_CONFIG.colors.accent,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;

