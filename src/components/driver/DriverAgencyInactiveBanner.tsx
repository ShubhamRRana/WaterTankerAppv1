import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { useAuthStore } from '../../store/authStore';
import { isDriverUser } from '../../types';
import { SubscriptionService } from '../../services/subscription.service';
import { useTheme } from '../../theme/ThemeProvider';

const DriverAgencyInactiveBanner: React.FC = () => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [inactive, setInactive] = useState(false);

  useEffect(() => {
    if (!user || !isDriverUser(user) || !user.createdByAdminId) {
      setInactive(false);
      return;
    }
    void (async () => {
      try {
        const active = await SubscriptionService.hasActiveSubscription(user.createdByAdminId!);
        setInactive(!active);
      } catch {
        setInactive(false);
      }
    })();
  }, [user]);

  if (!inactive) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
      <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
      <Typography variant="body" style={{ color: colors.text, flex: 1 }}>
        Agency account inactive — contact your admin. You cannot accept new orders until the subscription is renewed.
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default DriverAgencyInactiveBanner;
