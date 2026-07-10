import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, FlatList, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Card, LoadingSpinner, DriverIcon } from '../../../components/common';
import { useAuthStore } from '../../../store/authStore';
import { PaymentService } from '../../../services/payment.service';
import type { PaymentHistoryItem } from '../../../services/payment.service';
import { useTheme } from '../../../theme/ThemeProvider';
import { AppPalette } from '../../../theme/palettes';
import { CURRENCY_CONFIG, UI_CONFIG } from '../../../constants/config';
import { getRelativeTime } from '../../../utils/dateUtils';

type StageState = 'done' | 'active' | 'failed' | 'pending';

interface Stage {
  label: string;
  state: StageState;
}

interface Stages {
  charge: Stage;
  settle: Stage;
  payout: Stage;
}

function stageColor(state: StageState, colors: AppPalette): string {
  switch (state) {
    case 'done':
      return colors.success;
    case 'active':
      return colors.warning;
    case 'failed':
      return colors.error;
    default:
      return colors.border;
  }
}

function getStages(item: PaymentHistoryItem): Stages {
  const status = item.status;
  const transferId = typeof item.metadata?.transfer_id === 'string' ? item.metadata.transfer_id : null;
  const transferStatus =
    typeof item.metadata?.transfer_status === 'string' ? item.metadata.transfer_status.toLowerCase() : null;

  const charge: Stage =
    status === 'success' || status === 'refunded'
      ? { label: 'Charged', state: 'done' }
      : status === 'pending' || status === 'processing'
      ? { label: 'Charging', state: 'active' }
      : { label: 'Not charged', state: 'failed' };

  const settle: Stage =
    status === 'refunded'
      ? { label: 'Refunded', state: 'failed' }
      : status === 'success'
      ? { label: 'Settled', state: 'done' }
      : { label: 'Settling', state: 'pending' };

  const payout: Stage = !transferId
    ? { label: 'Not paid out', state: 'pending' }
    : transferStatus && ['completed', 'success', 'processed', 'paid'].includes(transferStatus)
    ? { label: 'Paid to driver', state: 'done' }
    : transferStatus && ['failed', 'reversed', 'cancelled'].includes(transferStatus)
    ? { label: 'Payout failed', state: 'failed' }
    : { label: 'Sending to driver', state: 'active' };

  return { charge, settle, payout };
}

function formatAmount(amount: number): string {
  return `${CURRENCY_CONFIG.currencySymbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const FlowRail: React.FC<{ stages: Stages; colors: AppPalette }> = ({ stages, colors }) => {
  const items: Stage[] = [stages.charge, stages.settle, stages.payout];
  return (
    <View style={styles.rail}>
      {items.map((stage, index) => {
        const color = stageColor(stage.state, colors);
        const isFilled = stage.state === 'done' || stage.state === 'failed';
        return (
          <React.Fragment key={stage.label}>
            <View
              style={[
                styles.railDot,
                { borderColor: color },
                isFilled && { backgroundColor: color },
              ]}
            />
            {index < items.length - 1 && (
              <View
                style={[
                  styles.railLine,
                  { backgroundColor: stage.state === 'done' ? color : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const DeliveryPaymentHistoryScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const rows = await PaymentService.getAgencyDeliveryPayments(user.id);
    setItems(rows);
  }, [user?.id]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const { totalReceived, awaitingPayout } = useMemo(() => {
    let received = 0;
    let awaiting = 0;
    for (const item of items) {
      if (item.status !== 'success') continue;
      received += item.amount;
      if (getStages(item).payout.state !== 'done') awaiting += item.amount;
    }
    return { totalReceived: received, awaitingPayout: awaiting };
  }, [items]);

  if (loading) return <LoadingSpinner size="large" text="Loading delivery payments..." />;

  return (
    <SafeAreaView style={themedStyles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={themedStyles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={themedStyles.summaryRow}>
              <View style={[themedStyles.statCard, themedStyles.statCardFirst]}>
                <Typography variant="caption" style={themedStyles.statLabel}>
                  TOTAL RECEIVED
                </Typography>
                <Typography variant="h2" style={[themedStyles.statValue, { color: colors.accentMuted }]}>
                  {formatAmount(totalReceived)}
                </Typography>
              </View>
              <View style={themedStyles.statCard}>
                <Typography variant="caption" style={themedStyles.statLabel}>
                  AWAITING PAYOUT
                </Typography>
                <Typography
                  variant="h2"
                  style={[
                    themedStyles.statValue,
                    { color: awaitingPayout > 0 ? colors.warning : colors.success },
                  ]}
                >
                  {formatAmount(awaitingPayout)}
                </Typography>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={themedStyles.emptyContainer}>
            <View style={themedStyles.emptyIconWrap}>
              <DriverIcon size={56} color={colors.textSecondary} />
            </View>
            <Typography variant="h3" style={themedStyles.emptyTitle}>
              No delivery payments yet
            </Typography>
            <Typography variant="body" style={themedStyles.emptyBody}>
              Payments will show up here once a delivery is completed and a customer pays for it.
            </Typography>
          </View>
        }
        renderItem={({ item }) => {
          const stages = getStages(item);
          const metaRows: { label: string; value: string }[] = [];
          if (item.bookingId) metaRows.push({ label: 'Booking', value: `${item.bookingId.slice(0, 8)}…` });
          if (item.gatewayTransactionId) metaRows.push({ label: 'Razorpay', value: item.gatewayTransactionId });
          if (typeof item.metadata?.transfer_id === 'string') {
            const transferStatus = item.metadata.transfer_status;
            metaRows.push({
              label: 'Transfer',
              value:
                item.metadata.transfer_id + (typeof transferStatus === 'string' ? ` (${transferStatus})` : ''),
            });
          }

          return (
            <Card style={themedStyles.card}>
              <View style={themedStyles.cardRow}>
                <FlowRail stages={stages} colors={colors} />
                <View style={themedStyles.contentColumn}>
                  <View style={themedStyles.eyebrowRow}>
                    <Typography variant="caption" style={themedStyles.eyebrowText}>
                      {item.flowLabel.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" style={themedStyles.timeText}>
                      {getRelativeTime(item.createdAt)}
                    </Typography>
                  </View>

                  <Typography variant="h2" style={themedStyles.amount}>
                    {formatAmount(item.amount)}
                  </Typography>

                  <View style={themedStyles.stagesRow}>
                    {[stages.charge, stages.settle, stages.payout].map((stage, idx) => (
                      <React.Fragment key={stage.label}>
                        {idx > 0 && (
                          <Typography variant="caption" style={themedStyles.stageDivider}>
                            {'  ›  '}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          style={[themedStyles.stageText, { color: stageColor(stage.state, colors) }]}
                        >
                          {stage.label}
                        </Typography>
                      </React.Fragment>
                    ))}
                  </View>

                  {metaRows.length > 0 && (
                    <View style={themedStyles.metaBlock}>
                      {metaRows.map((row) => (
                        <View key={row.label} style={themedStyles.metaRow}>
                          <Typography variant="caption" style={themedStyles.metaLabel}>
                            {row.label}
                          </Typography>
                          <Typography variant="caption" style={themedStyles.metaValue} numberOfLines={1}>
                            {row.value}
                          </Typography>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  rail: {
    alignItems: 'center',
    width: 18,
    marginRight: UI_CONFIG.spacing.md,
    paddingTop: 4,
  },
  railDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  railLine: {
    width: 2,
    flexGrow: 1,
    minHeight: 16,
    marginVertical: 2,
  },
});

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: UI_CONFIG.spacing.md, paddingBottom: UI_CONFIG.spacing.xl },

    summaryRow: {
      flexDirection: 'row',
      marginBottom: UI_CONFIG.spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: UI_CONFIG.borderRadius.lg,
      padding: UI_CONFIG.spacing.md,
    },
    statCardFirst: {
      marginRight: UI_CONFIG.spacing.sm,
    },
    statLabel: {
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    statValue: {
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    card: {
      marginBottom: UI_CONFIG.spacing.sm,
    },
    cardRow: {
      flexDirection: 'row',
    },
    contentColumn: {
      flex: 1,
    },
    eyebrowRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    eyebrowText: {
      color: colors.accentMuted,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    timeText: {
      color: colors.textSecondary,
    },
    amount: {
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      marginBottom: 6,
    },
    stagesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    stageText: {
      fontWeight: '600',
    },
    stageDivider: {
      color: colors.border,
    },
    metaBlock: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    metaLabel: {
      color: colors.textSecondary,
      marginRight: 8,
    },
    metaValue: {
      color: colors.textSecondary,
      flexShrink: 1,
      textAlign: 'right',
    },

    emptyContainer: {
      alignItems: 'center',
      paddingTop: UI_CONFIG.spacing.xxl,
      paddingHorizontal: UI_CONFIG.spacing.lg,
    },
    emptyIconWrap: {
      opacity: 0.35,
      marginBottom: UI_CONFIG.spacing.md,
    },
    emptyTitle: {
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyBody: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}

export default DeliveryPaymentHistoryScreen;
