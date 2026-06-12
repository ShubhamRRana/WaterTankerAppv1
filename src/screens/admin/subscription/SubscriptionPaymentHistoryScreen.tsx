import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Card, LoadingSpinner } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { SubscriptionService } from '../../../services/subscription.service';
import type { PaymentHistoryItem } from '../../../services/payment.service';
import { useTheme } from '../../../theme/ThemeProvider';

const SubscriptionPaymentHistoryScreen: React.FC = () => {
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
        const rows = await SubscriptionService.getPaymentHistory(user.id);
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) return <LoadingSpinner size="large" text="Loading history..." />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Typography variant="body" style={{ opacity: 0.8 }}>No subscription payments yet.</Typography>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Typography variant="body">₹{item.amount} — {item.status}</Typography>
            <Typography variant="caption" style={{ opacity: 0.7 }}>
              {item.completedAt?.toLocaleString() ?? item.createdAt.toLocaleString()}
            </Typography>
            {item.gatewayTransactionId ? (
              <Typography variant="caption">Payment ID: {item.gatewayTransactionId}</Typography>
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
    list: { padding: 16, gap: 8 },
    card: { padding: 12, marginBottom: 8 },
  });
}

export default SubscriptionPaymentHistoryScreen;
