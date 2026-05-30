import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import { Typography, LoadingSpinner } from '../../components/common';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { SocietyTrip, SocietyTripService } from '../../services/societyTrip.service';
import { SocietyPaymentPeriodsService } from '../../services/societyPaymentPeriods.service';
import { SocietyTripUsersService } from '../../services/societyTripUsers.service';
import { formatDateTime } from '../../utils/dateUtils';
import {
  buildTankerSizeBreakdown,
  computeBreakdownTotals,
  filterTripsByPeriod,
  isTripPending,
} from '../../utils/societyTripBreakdown';

type ScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'SocietyUserTripBreakdown'>;
type ScreenRouteProp = RouteProp<AdminStackParamList, 'SocietyUserTripBreakdown'>;

interface Props {
  navigation: ScreenNavigationProp;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SocietyUserTripBreakdownScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuthStore();
  const route = useRoute<ScreenRouteProp>();
  const { customerId, year, monthIndex0 } = route.params;

  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [completedAt, setCompletedAt] = useState<Date | undefined>(undefined);
  const [societyUser, setSocietyUser] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [paymentLoad, setPaymentLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);

  const canLoad = user?.role === 'admin' && !!user.id;
  const businessName = user?.role === 'admin' ? (user as { businessName?: string }).businessName : undefined;

  const load = useCallback(async () => {
    if (!canLoad) return;

    const list = await SocietyTripService.listTripsForAdmin(user.id, businessName);
    const monthTrips = filterTripsByPeriod(list, 'month', year, monthIndex0).filter(
      (t) => t.customerId === customerId,
    );
    setTrips(monthTrips);

    setPaymentLoad('loading');
    try {
      const monthPeriodKey = SocietyPaymentPeriodsService.buildMonthPeriodKey(year, monthIndex0, businessName);
      const fallbackPeriodKey = SocietyPaymentPeriodsService.buildMonthPeriodKey(year, monthIndex0);
      const map = await SocietyPaymentPeriodsService.listCompletedAtByCustomerForPeriod(
        monthPeriodKey,
        [customerId],
        monthPeriodKey !== fallbackPeriodKey ? { fallbackPeriodKey } : undefined,
      );
      setCompletedAt(map.get(customerId));
      setPaymentLoad('ready');
    } catch {
      setCompletedAt(undefined);
      setPaymentLoad('error');
    }

    try {
      const users = await SocietyTripUsersService.getUsersLiteByIds([customerId]);
      setSocietyUser(users.get(customerId) ?? null);
    } catch {
      setSocietyUser(null);
    }
  }, [canLoad, user?.id, businessName, year, monthIndex0, customerId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      load()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const breakdown = useMemo(() => buildTankerSizeBreakdown(trips, completedAt), [trips, completedAt]);
  const totals = useMemo(() => computeBreakdownTotals(trips, completedAt), [trips, completedAt]);

  const periodLabel = `${MONTHS[monthIndex0]} ${year}`;
  const societyUserLabel = useMemo(() => {
    if (societyUser) return societyUser.phone ? `${societyUser.name} • ${societyUser.phone}` : societyUser.name;
    return customerId.length > 8 ? `${customerId.slice(0, 8)}…` : customerId;
  }, [societyUser, customerId]);

  const paymentStatusText = useMemo(() => {
    if (paymentLoad === 'loading') return 'Checking payment status…';
    if (paymentLoad === 'error') return 'Payment status unavailable';
    if (trips.length === 0) return 'No trips in this month';
    if (!completedAt) return `Not settled • ₹${totals.pendingAmountSum.toLocaleString()} pending`;
    if (totals.pendingCount === 0) return 'Payment completed';
    return `Settled, but ₹${totals.pendingAmountSum.toLocaleString()} pending from ${totals.pendingCount} new ${
      totals.pendingCount === 1 ? 'trip' : 'trips'
    }`;
  }, [paymentLoad, trips.length, completedAt, totals.pendingAmountSum, totals.pendingCount]);

  const paymentStatusTone = useMemo(() => {
    if (paymentLoad === 'loading' || paymentLoad === 'error') return 'neutral';
    if (trips.length === 0) return 'neutral';
    if (completedAt && totals.pendingCount === 0) return 'success';
    return 'pending';
  }, [paymentLoad, trips.length, completedAt, totals.pendingCount]);

  if (isLoading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading breakdown…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title} numberOfLines={1}>
              {societyUserLabel}
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {periodLabel} • {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </Typography>
          </View>
        </View>

        <FlatList
          style={styles.tripList}
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={trips.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            <View>
              <Card padding="medium" style={styles.summaryCard}>
                <View
                  style={[
                    styles.paymentBanner,
                    paymentStatusTone === 'success' && styles.paymentBannerSuccess,
                    paymentStatusTone === 'pending' && styles.paymentBannerPending,
                  ]}
                >
                  <Ionicons
                    name={
                      paymentStatusTone === 'success'
                        ? 'checkmark-circle'
                        : paymentStatusTone === 'pending'
                        ? 'alert-circle'
                        : 'time-outline'
                    }
                    size={18}
                    color={
                      paymentStatusTone === 'success'
                        ? colors.success
                        : paymentStatusTone === 'pending'
                        ? colors.warning
                        : colors.textSecondary
                    }
                    style={styles.paymentBannerIcon}
                  />
                  <Typography variant="caption" style={styles.paymentBannerText}>
                    {paymentStatusText}
                  </Typography>
                </View>

                <View style={styles.summaryTableHeader}>
                  <View style={styles.summaryColSize}>
                    <Typography variant="caption" style={styles.summaryTableHeaderText}>
                      Size
                    </Typography>
                  </View>
                  <View style={styles.summaryColNum}>
                    <Typography variant="caption" style={styles.summaryTableHeaderText}>
                      Amount
                    </Typography>
                  </View>
                  <View style={styles.summaryColNum}>
                    <Typography variant="caption" style={styles.summaryTableHeaderText}>
                      Trips
                    </Typography>
                  </View>
                  <View style={styles.summaryColNum}>
                    <Typography variant="caption" style={styles.summaryTableHeaderText}>
                      Pending
                    </Typography>
                  </View>
                </View>

                {trips.length === 0 ? (
                  <Typography variant="caption" style={styles.summaryEmptyText}>
                    No trips in this period
                  </Typography>
                ) : (
                  <>
                    {breakdown.map((row) => (
                      <View key={row.liters} style={styles.summaryRow}>
                        <View style={styles.summaryColSize}>
                          <Typography variant="body" style={styles.summaryCellLeft}>
                            {row.liters.toLocaleString()}L
                          </Typography>
                        </View>
                        <View style={styles.summaryColNum}>
                          <Typography variant="body" style={styles.summaryCellAmount}>
                            {row.count > 0 && row.tripsWithAmount > 0 ? `₹${row.amountSum.toLocaleString()}` : '—'}
                          </Typography>
                        </View>
                        <View style={styles.summaryColNum}>
                          <Typography variant="caption" style={styles.summaryCellRight}>
                            {row.count}
                          </Typography>
                        </View>
                        <View style={styles.summaryColNum}>
                          <Typography variant="body" style={styles.summaryCellPending}>
                            {row.pendingTripsWithAmount > 0 ? `₹${row.pendingAmountSum.toLocaleString()}` : '—'}
                          </Typography>
                        </View>
                      </View>
                    ))}

                    <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                      <View style={styles.summaryColSize}>
                        <Typography variant="body" style={[styles.summaryCellLeft, styles.summaryTotalStrong]}>
                          Total
                        </Typography>
                      </View>
                      <View style={styles.summaryColNum}>
                        <Typography variant="body" style={[styles.summaryCellAmount, styles.summaryTotalStrong]}>
                          {totals.tripsWithAmount > 0 ? `₹${totals.amountSum.toLocaleString()}` : '—'}
                        </Typography>
                      </View>
                      <View style={styles.summaryColNum}>
                        <Typography variant="caption" style={[styles.summaryCellRight, styles.summaryTotalStrong]}>
                          {totals.tripCount}
                        </Typography>
                      </View>
                      <View style={styles.summaryColNum}>
                        <Typography variant="body" style={[styles.summaryCellPending, styles.summaryTotalStrong]}>
                          {totals.pendingTripsWithAmount > 0 ? `₹${totals.pendingAmountSum.toLocaleString()}` : '—'}
                        </Typography>
                      </View>
                    </View>
                  </>
                )}
              </Card>

              {trips.length > 0 ? (
                <Typography variant="caption" style={styles.listSectionHeading}>
                  Trips
                </Typography>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
              <Typography variant="body" style={styles.emptyTitle}>
                No trips for this society user in {periodLabel}
              </Typography>
            </View>
          }
          renderItem={({ item }) => {
            const pending = isTripPending(item, completedAt);
            const multiPhoto = item.photoUrls.length > 1;
            return (
              <Card padding="medium" style={styles.tripCard}>
                {multiPhoto ? (
                  <View style={styles.tripColumn}>
                    <View style={styles.tripRow}>
                      <View style={styles.thumbWrapMulti}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.thumbStrip}
                        >
                          {item.photoUrls.map((url) => (
                            <TouchableOpacity
                              key={url}
                              onPress={() => setPhotoPreviewUri(url)}
                              activeOpacity={0.85}
                              style={styles.thumbCell}
                            >
                              <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                              <View style={styles.thumbHint}>
                                <Ionicons name="expand-outline" size={14} color={colors.textLight} />
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <View style={[styles.tripInfo, styles.tripInfoBelowPhotos]}>
                      {renderTripInfo(item, pending)}
                    </View>
                  </View>
                ) : (
                  <View style={styles.tripRow}>
                    <View style={styles.thumbWrapSingle}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={item.photoUrls.length === 0}
                        onPress={() => item.photoUrls[0] && setPhotoPreviewUri(item.photoUrls[0])}
                      >
                        {item.photoUrls[0] ? (
                          <Image source={{ uri: item.photoUrls[0] }} style={styles.thumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.thumb, styles.thumbEmpty]} />
                        )}
                        {item.photoUrls[0] ? (
                          <View style={styles.thumbHint}>
                            <Ionicons name="expand-outline" size={14} color={colors.textLight} />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tripInfo}>{renderTripInfo(item, pending)}</View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      </View>

      <Modal
        visible={photoPreviewUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPreviewUri(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.photoModalRoot} onPress={() => setPhotoPreviewUri(null)}>
          {photoPreviewUri ? (
            <View pointerEvents="none" style={styles.photoModalImage}>
              <Image source={{ uri: photoPreviewUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.photoModalClose, { top: insets.top + 8 }]}
            onPress={() => setPhotoPreviewUri(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={28} color={colors.textLight} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );

  function renderTripInfo(item: SocietyTrip, pending: boolean) {
    return (
      <>
        <View style={styles.tripInfoHeaderRow}>
          <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
            {item.agencyName}
          </Typography>
          {pending ? (
            <View style={styles.pendingBadge}>
              <Typography variant="caption" style={styles.pendingBadgeText}>
                Pending
              </Typography>
            </View>
          ) : null}
        </View>
        <Typography variant="caption" style={styles.meta}>
          {formatDateTime(item.scheduledAt)}
        </Typography>
        <Typography variant="caption" style={styles.meta}>
          {item.tankerSizeLiters}L tanker
        </Typography>
        {item.tankerAmount != null ? (
          <Typography variant="caption" style={styles.meta}>
            Amount: ₹{item.tankerAmount.toLocaleString()}
          </Typography>
        ) : null}
      </>
    );
  }
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTextContainer: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.text,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: 4,
    },
    tripList: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    emptyList: {
      flexGrow: 1,
      padding: 16,
    },
    summaryCard: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    paymentBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 12,
      backgroundColor: colors.overlaySubtle,
    },
    paymentBannerSuccess: {
      backgroundColor: colors.overlaySubtle,
    },
    paymentBannerPending: {
      backgroundColor: colors.overlaySubtle,
    },
    paymentBannerIcon: {
      marginRight: 8,
    },
    paymentBannerText: {
      flex: 1,
      color: colors.text,
      fontWeight: '600',
    },
    summaryTableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    summaryTableHeaderText: {
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    summaryEmptyText: {
      color: colors.textSecondary,
      marginTop: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    summaryColSize: {
      flex: 1.2,
      minWidth: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    summaryColNum: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    summaryCellLeft: {
      color: colors.text,
      fontWeight: '600',
    },
    summaryCellAmount: {
      color: colors.accent,
      fontWeight: '600',
    },
    summaryCellRight: {
      color: colors.textSecondary,
    },
    summaryCellPending: {
      color: colors.error,
      fontWeight: '600',
    },
    summaryTotalRow: {
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    summaryTotalStrong: {
      fontWeight: '700',
    },
    listSectionHeading: {
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginLeft: 4,
    },
    tripCard: {
      marginBottom: 12,
    },
    tripRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tripColumn: {
      width: '100%',
    },
    thumbWrapSingle: {
      maxWidth: 220,
      marginRight: 14,
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: 'flex-start',
    },
    thumbWrapMulti: {
      flex: 1,
      minWidth: 0,
    },
    thumbStrip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingRight: 4,
    },
    thumbCell: {
      position: 'relative',
      marginRight: 8,
    },
    thumb: {
      width: 88,
      height: 88,
      borderRadius: 10,
      backgroundColor: colors.surfaceLight,
    },
    thumbEmpty: {
      opacity: 0.35,
    },
    thumbHint: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 4,
      padding: 2,
    },
    tripInfo: {
      flex: 1,
      minWidth: 0,
    },
    tripInfoBelowPhotos: {
      flex: 0,
      width: '100%',
      marginTop: 10,
    },
    tripInfoHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    agencyName: {
      flex: 1,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginRight: 8,
    },
    pendingBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.overlaySubtle,
    },
    pendingBadgeText: {
      color: colors.error,
      fontWeight: '700',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    meta: {
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      marginTop: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    photoModalRoot: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.94)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoModalClose: {
      position: 'absolute',
      right: 20,
      zIndex: 2,
      padding: 4,
    },
    photoModalImage: {
      width: '100%',
      height: '100%',
    },
  });
}

export default SocietyUserTripBreakdownScreen;
