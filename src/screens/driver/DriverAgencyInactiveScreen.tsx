import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

const DriverAgencyInactiveScreen: React.FC = () => {
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="alert-circle-outline" size={72} color={colors.error} />
        <Typography variant="h2" style={styles.title}>
          Agency account inactive
        </Typography>
        <Typography variant="body" style={styles.message}>
          Contact your admin to renew the agency subscription. All order and payment features are
          disabled until then.
        </Typography>
        <Button title="Log out" variant="outline" onPress={() => void logout()} style={styles.button} />
      </View>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string; text: string; textSecondary: string }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 16,
    },
    title: {
      textAlign: 'center',
      color: colors.text,
    },
    message: {
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 22,
    },
    button: {
      marginTop: 8,
      minWidth: 160,
    },
  });
}

export default DriverAgencyInactiveScreen;
