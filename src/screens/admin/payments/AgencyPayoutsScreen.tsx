import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { AgencyPayoutService, type PayoutSummary } from '../../../services/agencyPayout.service';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';

type AgencyPayoutsNavigationProp = StackNavigationProp<AdminStackParamList, 'AgencyPayouts'>;

const AgencyPayoutsScreen: React.FC = () => {
  const navigation = useNavigation<AgencyPayoutsNavigationProp>();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      setLoading(true);
      try {
        const s = await AgencyPayoutService.getPayoutSummary(user.id);
        setSummary(s);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <LoadingSpinner size="large" text="Loading payouts..." />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backRow}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Typography variant="body" style={styles.backText}>Back</Typography>
        </TouchableOpacity>
        <Typography variant="h2">Payout summary</Typography>
        <View style={styles.row}>
          <Card style={styles.stat}><Typography variant="caption">Today</Typography><Typography variant="h3">₹{summary?.today ?? 0}</Typography></Card>
          <Card style={styles.stat}><Typography variant="caption">This week</Typography><Typography variant="h3">₹{summary?.week ?? 0}</Typography></Card>
        </View>
        <View style={styles.row}>
          <Card style={styles.stat}><Typography variant="caption">This month</Typography><Typography variant="h3">₹{summary?.month ?? 0}</Typography></Card>
          <Card style={styles.stat}><Typography variant="caption">Pending payment</Typography><Typography variant="h3">₹{summary?.pending ?? 0}</Typography></Card>
        </View>
        <Card style={styles.statFull}>
          <Typography variant="caption">Awaiting Razorpay settlement</Typography>
          <Typography variant="h3">₹{summary?.pendingSettlement ?? 0}</Typography>
        </Card>
        <Typography variant="caption" style={{ opacity: 0.8 }}>
          Online delivery payments may settle in 2–3 business days per Razorpay.
        </Typography>
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string; text: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, gap: 12 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    backText: { marginLeft: 8, color: colors.text },
    row: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, padding: 12 },
    statFull: { padding: 12 },
  });
}

export default AgencyPayoutsScreen;
