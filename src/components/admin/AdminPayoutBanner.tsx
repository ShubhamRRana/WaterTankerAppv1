import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { useAuthStore } from '../../store/authStore';
import { checkAdminSubscriptionGate } from '../../utils/subscriptionGating';
import { FEATURE_FLAGS } from '../../constants/config';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useTheme } from '../../theme/ThemeProvider';

type Nav = StackNavigationProp<AdminStackParamList>;

const AdminPayoutBanner: React.FC = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id || !FEATURE_FLAGS.enableOnlinePayment) {
      setShow(false);
      return;
    }
    void (async () => {
      try {
        const gate = await checkAdminSubscriptionGate(user.id);
        setShow(gate.hasActive && !gate.payoutActive);
      } catch {
        setShow(false);
      }
    })();
  }, [user?.id]);

  if (!show) return null;

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        { backgroundColor: colors.warning + '22', borderColor: colors.warning, marginTop: insets.top + 8 },
      ]}
      onPress={() => navigation.navigate('RazorpayAccountSetup')}
      activeOpacity={0.85}
    >
      <Ionicons name="warning-outline" size={20} color={colors.warning} />
      <Typography variant="caption" style={[styles.text, { color: colors.text }]}>
        Complete Razorpay payout setup to enable online delivery payments.
      </Typography>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  text: { flex: 1 },
});

export default AdminPayoutBanner;
