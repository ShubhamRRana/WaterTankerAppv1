import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { AgencyPayoutService } from '../../../services/agencyPayout.service';
import type { PaymentHistoryItem } from '../../../services/payment.service';
import { useTheme } from '../../../theme/ThemeProvider';

const DeliveryPaymentHistoryScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      setLoading(true);
      try {
        const rows = await AgencyPayoutService.getDeliveryPayments(user.id);
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <LoadingSpinner size="large" text="Loading delivery payments..." />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Typography variant="body" style={{ opacity: 0.8 }}>No delivery payments yet.</Typography>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Typography variant="body">₹{item.amount} — {item.status}</Typography>
            <Typography variant="caption" style={{ opacity: 0.7 }}>{item.flowLabel}</Typography>
            {item.bookingId ? (
              <Typography variant="caption">Booking: {item.bookingId.slice(0, 8)}…</Typography>
            ) : null}
            {item.gatewayTransactionId ? (
              <Typography variant="caption">Razorpay: {item.gatewayTransactionId}</Typography>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 16 },
    card: { padding: 12, marginBottom: 8 },
  });
}

export default DeliveryPaymentHistoryScreen;
