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
import { Typography } from '../../components/common';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';
import { useAuthStore } from '../../store/authStore';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { SUCCESS_MESSAGES } from '../../constants/config';
import { getErrorMessage } from '../../utils/errors';
import {
  createAuthFormCardStyles,
  generateGridWatermarkPositions,
} from './authScreenShared';

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordRouteProp = RouteProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordNavigationProp;
  route: ForgotPasswordRouteProp;
}

const KEY_WATERMARK_COUNT = 28;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardStyles = useMemo(() => createAuthFormCardStyles(colors), [colors]);
  const { requestPasswordReset, isLoading } = useAuthStore();
  const [email, setEmail] = useState(route.params?.initialEmail?.trim() ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const keyWatermarkPositions = useMemo(
    () => generateGridWatermarkPositions(KEY_WATERMARK_COUNT),
    []
  );

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

  const renderKeyWatermarks = () =>
    keyWatermarkPositions.map((position, index) => (
      <View
        key={index}
        style={[
          cardStyles.watermarkContainer,
          { top: position.top, left: position.left, transform: [{ rotate: '-35deg' }] },
        ]}
      >
        <Ionicons name="key-outline" size={36} color={colors.textSecondary} />
      </View>
    ));

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {renderKeyWatermarks()}
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={goToLogin} style={cardStyles.backRow} accessibilityRole="button">
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
              <Typography variant="body" style={cardStyles.backText}>
                Sign in
              </Typography>
            </TouchableOpacity>

            <View style={styles.centeredContent}>
              <Typography variant="h1" style={cardStyles.screenTitle}>
                Check your email
              </Typography>
              <Typography variant="body" style={styles.sentMessage}>
                {SUCCESS_MESSAGES.auth.forgotPasswordSentMessage}
              </Typography>

              <TouchableOpacity
                style={cardStyles.primaryButton}
                onPress={goToLogin}
                accessibilityRole="button"
              >
                <Typography variant="body" style={cardStyles.primaryButtonText}>
                  Back to sign in
                </Typography>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderKeyWatermarks()}
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={goToLogin} style={cardStyles.backRow} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
            <Typography variant="body" style={cardStyles.backText}>
              Sign in
            </Typography>
          </TouchableOpacity>

          <View style={styles.centeredContent}>
            <Typography variant="h1" style={cardStyles.screenTitle}>
              {SUCCESS_MESSAGES.auth.resetPasswordRequestTitle}
            </Typography>
            <Typography variant="body" style={cardStyles.screenSubtitle}>
              {SUCCESS_MESSAGES.auth.resetPasswordRequestSubtitle}
            </Typography>

            <View style={cardStyles.formCard}>
              <View style={styles.inputContainer}>
                <Typography variant="body" style={styles.label}>
                  Email address
                </Typography>
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailError ? (
                  <Typography variant="caption" style={styles.errorText}>
                    {emailError}
                  </Typography>
                ) : null}
              </View>

              <TouchableOpacity
                style={[cardStyles.primaryButton, isLoading && cardStyles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Typography variant="body" style={cardStyles.primaryButtonText}>
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, position: 'relative' },
    scroll: {
      flexGrow: 1,
      padding: 24,
      zIndex: 1,
    },
    centeredContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    inputContainer: { marginBottom: 20 },
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
    sentMessage: {
      marginBottom: 32,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
}

export default ForgotPasswordScreen;
