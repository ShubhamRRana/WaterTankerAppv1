import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { Typography, Button } from '../../components/common';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils';
import { SUCCESS_MESSAGES } from '../../constants/config';
import { getErrorMessage } from '../../utils/errors';

type ResetPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
  navigation: ResetPasswordNavigationProp;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { completePasswordReset, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};
    const passwordValidation = ValidationUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      nextErrors.password = passwordValidation.error;
    }
    const confirmValidation = ValidationUtils.validateConfirmPassword(password, confirmPassword);
    if (!confirmValidation.isValid) {
      nextErrors.confirmPassword = confirmValidation.error;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await completePasswordReset(password);
      Alert.alert('Success', SUCCESS_MESSAGES.auth.resetPasswordSuccess, [
        {
          text: 'Sign In',
          onPress: () => navigation.navigate('Login', { preferredRole: 'admin' }),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to reset password. Please try again.'));
    }
  };

  const goToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Typography variant="h1" style={styles.title}>
            {SUCCESS_MESSAGES.auth.resetPasswordTitle}
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Choose a new password for your admin account.
          </Typography>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>New password</Typography>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Typography variant="caption" style={styles.errorText}>{errors.password}</Typography>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Confirm password</Typography>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeButton}
                accessibilityRole="button"
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Typography variant="caption" style={styles.errorText}>{errors.confirmPassword}</Typography>
            ) : null}
          </View>

          <Button
            title={isLoading ? 'Updating...' : 'Set new password'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          />

          <TouchableOpacity onPress={goToForgotPassword} style={styles.linkRow}>
            <Typography variant="body" style={styles.linkText}>Request a new reset link</Typography>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    title: { marginBottom: 12, color: colors.text },
    subtitle: { marginBottom: 24, color: colors.textSecondary },
    inputContainer: { marginBottom: 20 },
    label: { marginBottom: 8, fontWeight: '600', color: colors.text },
    passwordRow: { flexDirection: 'row', alignItems: 'center' },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    passwordInput: { flex: 1 },
    inputError: { borderColor: colors.error },
    eyeButton: { position: 'absolute', right: 12, padding: 4 },
    errorText: { color: colors.error, marginTop: 6 },
    linkRow: { marginTop: 24, alignItems: 'center' },
    linkText: { color: colors.accent, fontWeight: '600' },
  });
}

export default ResetPasswordScreen;
