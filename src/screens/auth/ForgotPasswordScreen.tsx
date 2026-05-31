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
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { Typography, Button } from '../../components/common';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { SUCCESS_MESSAGES } from '../../constants/config';
import { getErrorMessage } from '../../utils/errors';

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordRouteProp = RouteProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordNavigationProp;
  route: ForgotPasswordRouteProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { requestPasswordReset, isLoading } = useAuthStore();
  const [email, setEmail] = useState(route.params?.initialEmail?.trim() ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const handleEmailChange = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeEmail(text);
    setEmail(sanitized);
    if (sanitized) {
      const validation = ValidationUtils.validateEmail(sanitized);
      setEmailError(validation.isValid ? undefined : validation.error);
    } else {
      setEmailError(undefined);
    }
  };

  const handleSubmit = async () => {
    const validation = ValidationUtils.validateEmail(email, true);
    if (!validation.isValid) {
      setEmailError(validation.error);
      return;
    }

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to send reset email. Please try again.'));
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login', { preferredRole: 'admin', initialEmail: email });
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Typography variant="h1" style={styles.title}>
            {SUCCESS_MESSAGES.auth.forgotPasswordTitle}
          </Typography>
          <Typography variant="body" style={styles.message}>
            {SUCCESS_MESSAGES.auth.forgotPasswordSentMessage}
          </Typography>
          <Button title="Back to Sign In" onPress={goToLogin} style={styles.buttonSpacing} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={goToLogin} style={styles.backRow} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Typography variant="body" style={styles.backText}>Back</Typography>
          </TouchableOpacity>

          <Typography variant="h1" style={styles.title}>
            {SUCCESS_MESSAGES.auth.forgotPasswordTitle}
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Enter your admin account email and we will send reset instructions.
          </Typography>

          <View style={styles.inputContainer}>
            <Typography variant="body" style={styles.label}>Email</Typography>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? (
              <Typography variant="caption" style={styles.errorText}>{emailError}</Typography>
            ) : null}
          </View>

          <Button
            title={isLoading ? 'Sending...' : 'Send reset link'}
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
    scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { marginLeft: 8, color: colors.text },
    title: { marginBottom: 12, color: colors.text },
    subtitle: { marginBottom: 24, color: colors.textSecondary },
    message: { marginBottom: 32, color: colors.textSecondary, lineHeight: 22 },
    inputContainer: { marginBottom: 24 },
    label: { marginBottom: 8, fontWeight: '600', color: colors.text },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    inputError: { borderColor: colors.error },
    errorText: { color: colors.error, marginTop: 6 },
    buttonSpacing: { marginTop: 16 },
  });
}

export default ForgotPasswordScreen;
