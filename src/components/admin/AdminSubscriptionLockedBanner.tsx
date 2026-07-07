import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { FEATURE_FLAGS } from '../../constants/config';
import { useAdminSubscriptionGate } from '../../context/AdminSubscriptionGateContext';
import { useTheme } from '../../theme/ThemeProvider';

const AdminSubscriptionLockedBanner: React.FC = () => {
  const { hasActive } = useAdminSubscriptionGate();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!FEATURE_FLAGS.enableSubscriptionGating || hasActive) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.error + '18', borderColor: colors.error, marginTop: insets.top + 8 },
      ]}
    >
      <Ionicons name="lock-closed-outline" size={20} color={colors.error} />
      <Typography variant="caption" style={[styles.text, { color: colors.text }]}>
        Your agency subscription has expired. Renew to restore bookings, drivers, and reports.
      </Typography>
    </View>
  );
};

function createStyles(_colors: { text: string }) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 4,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    text: { flex: 1 },
  });
}

export default AdminSubscriptionLockedBanner;
