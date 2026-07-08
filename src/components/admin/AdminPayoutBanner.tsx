import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { useAdminSubscriptionGate } from '../../context/AdminSubscriptionGateContext';
import { FEATURE_FLAGS } from '../../constants/config';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useTheme } from '../../theme/ThemeProvider';

import type { LinkedAccountStatus } from '../../services/agencyPayout.service';

type Nav = StackNavigationProp<AdminStackParamList>;

function getBannerMessage(payoutStatus: LinkedAccountStatus['status']): string {
  if (payoutStatus === 'created' || payoutStatus === 'under_review') {
    return 'Razorpay is reviewing your payout account. Online payments will unlock once approved.';
  }
  return 'Complete Razorpay payout setup to enable online delivery payments.';
}

const AdminPayoutBanner: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { hasActive, payoutActive, payoutStatus } = useAdminSubscriptionGate();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useMemo(() => getBannerMessage(payoutStatus), [payoutStatus]);
  const isUnderReview = payoutStatus === 'created' || payoutStatus === 'under_review';

  if (!FEATURE_FLAGS.enableOnlinePayment || !hasActive || payoutActive) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        { backgroundColor: colors.warning + '22', borderColor: colors.warning, marginTop: insets.top + 8 },
      ]}
      onPress={() => navigation.navigate('RazorpayAccountSetup')}
      activeOpacity={0.85}
    >
      <Ionicons
        name={isUnderReview ? 'time-outline' : 'warning-outline'}
        size={20}
        color={colors.warning}
      />
      <Typography variant="caption" style={[styles.text, { color: colors.text }]}>
        {message}
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
