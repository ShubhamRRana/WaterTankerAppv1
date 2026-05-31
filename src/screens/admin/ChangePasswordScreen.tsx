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
import { Typography, Button } from '../../components/common';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils } from '../../utils';
import { SUCCESS_MESSAGES } from '../../constants/config';
import { getErrorMessage } from '../../utils/errors';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type ChangePasswordNavigationProp = StackNavigationProp<AdminStackParamList, 'ChangePassword'>;

interface Props {
  navigation: ChangePasswordNavigationProp;
}

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { changePassword, isLoading } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    if (!currentPassword.trim()) {
      nextErrors.currentPassword = 'Current password is required';
    }
    const newValidation = ValidationUtils.validatePassword(newPassword);
    if (!newValidation.isValid) {
      nextErrors.newPassword = newValidation.error;
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'New password must be different from current password';
    }
    const confirmValidation = ValidationUtils.validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      nextErrors.confirmPassword = confirmValidation.error;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', SUCCESS_MESSAGES.profile.passwordChanged, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to change password. Please try again.'));
    }
  };

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    visible: boolean,
    onToggle: () => void,
    error?: string,
    placeholder?: string
  ) => (
    <View style={styles.inputContainer}>
      <Typography variant="body" style={styles.label}>{label}</Typography>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput, error && styles.inputError]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeButton} accessibilityRole="button">
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {error ? <Typography variant="caption" style={styles.errorText}>{error}</Typography> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backRow}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Typography variant="body" style={styles.backText}>Back</Typography>
          </TouchableOpacity>

          <Typography variant="h1" style={styles.title}>
            {SUCCESS_MESSAGES.auth.changePasswordTitle}
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Enter your current password and choose a new one.
          </Typography>

          {renderPasswordField(
            'Current password',
            currentPassword,
            setCurrentPassword,
            showCurrent,
            () => setShowCurrent(!showCurrent),
            errors.currentPassword,
            'Enter current password'
          )}
          {renderPasswordField(
            'New password',
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew(!showNew),
            errors.newPassword,
            'Enter new password'
          )}
          {renderPasswordField(
            'Confirm new password',
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            () => setShowConfirm(!showConfirm),
            errors.confirmPassword,
            'Confirm new password'
          )}

          <Button
            title={isLoading ? 'Updating...' : 'Update password'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { marginLeft: 8, color: colors.text },
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
  });
}

export default ChangePasswordScreen;
