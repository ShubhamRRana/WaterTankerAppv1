import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../types';
import { Typography, Button } from '../../components/common';
import { useTheme } from '../../theme/ThemeProvider';
import { AppPalette } from '../../theme/palettes';
import { supabase } from '../../lib/supabaseClient';
import { VERIFY_EMAIL_MESSAGES } from '../../constants/config';
import { handleError } from '../../utils/errorHandler';

const RESEND_COOLDOWN_SEC = 60;

type PendingEmailVerificationNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'PendingEmailVerification'
>;
type PendingEmailVerificationRouteProp = RouteProp<AuthStackParamList, 'PendingEmailVerification'>;

interface Props {
  navigation: PendingEmailVerificationNavigationProp;
  route: PendingEmailVerificationRouteProp;
}

const PendingEmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, preferredRole } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        handleError(error, {
          context: { operation: 'resendSignupEmail', email },
          userFacing: true,
        });
      } else {
        Alert.alert('Email sent', VERIFY_EMAIL_MESSAGES.resendSuccess);
        setCooldown(RESEND_COOLDOWN_SEC);
      }
    } finally {
      setResendLoading(false);
    }
  }, [email, cooldown, resendLoading]);

  const goToLogin = () => {
    navigation.navigate('Login', {
      preferredRole,
      initialEmail: email,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Typography variant="h1" style={styles.title}>
            {VERIFY_EMAIL_MESSAGES.title}
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            {VERIFY_EMAIL_MESSAGES.subtitle}
          </Typography>
          <Typography variant="body" style={styles.email}>
            {email}
          </Typography>

          <Typography variant="h3" style={styles.stepsTitle}>
            {VERIFY_EMAIL_MESSAGES.stepsIntro}
          </Typography>
          <Typography variant="body" style={styles.step}>
            • {VERIFY_EMAIL_MESSAGES.stepCheckInbox}
          </Typography>
          <Typography variant="body" style={styles.step}>
            • {VERIFY_EMAIL_MESSAGES.stepTapLink}
          </Typography>
          <Typography variant="body" style={styles.step}>
            • {VERIFY_EMAIL_MESSAGES.stepSignIn}
          </Typography>

          <View style={styles.actions}>
            <Button
              title={
                cooldown > 0
                  ? VERIFY_EMAIL_MESSAGES.resendCooldown(cooldown)
                  : VERIFY_EMAIL_MESSAGES.resend
              }
              onPress={handleResend}
              loading={resendLoading}
              disabled={cooldown > 0}
              variant="outline"
              style={styles.buttonSpacing}
            />
            <Button
              title={VERIFY_EMAIL_MESSAGES.continueToSignIn}
              onPress={goToLogin}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 32,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 28,
    },
    stepsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    step: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    actions: {
      marginTop: 28,
    },
    buttonSpacing: {
      marginBottom: 12,
    },
  });
}

export default PendingEmailVerificationScreen;
