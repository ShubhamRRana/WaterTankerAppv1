import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import { Typography, LoadingSpinner, AdminMenuDrawer, MonthYearFilterRow } from '../../components/common';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { SocietyTrip, SocietyTripService } from '../../services/societyTrip.service';
import { SocietyPaymentPeriodsService } from '../../services/societyPaymentPeriods.service';
import { SocietyTripUsersService } from '../../services/societyTripUsers.service';
import { formatDateTime } from '../../utils/dateUtils';
import { buildTankerSizeBreakdown, filterTripsByPeriod } from '../../utils/societyTripBreakdown';

type TripDetailsNavigationProp = StackNavigationProp<AdminStackParamList, 'TripDetails'>;

interface Props {
  navigation: TripDetailsNavigationProp;
}

const TripDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, logout } = useAuthStore();

  const [trips, setTrips] = useState<SocietyTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [tankerBreakdownVisible, setTankerBreakdownVisible] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSocietyUserId, setSelectedSocietyUserId] = useState<string>('All');
  const [societyUserDropdownVisible, setSocietyUserDropdownVisible] = useState(false);
  const [societyUsersById, setSocietyUsersById] = useState<Map<string, { id: string; name: string; phone: string | null }>>(
    new Map(),
  );

  const [paymentPeriodLoad, setPaymentPeriodLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [completedAtByCustomerId, setCompletedAtByCustomerId] = useState<Map<string, Date>>(() => new Map());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const canLoad = user?.role === 'admin' && !!user.id;

  const loadTrips = useCallback(async () => {
    if (!canLoad) return;
    const list = await SocietyTripService.listTripsForAdmin(
      user.id,
      user.role === 'admin' ? user.businessName : undefined,
    );
    setTrips(list);
  }, [canLoad, user?.id, user?.role, (user as any)?.businessName]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }, [logout]);

  const handleMenuNavigate = useCallback(
    (route: AdminRoute) => {
      if (route === 'TripDetails') return;
      navigation.navigate(route as any);
    },
    [navigation],
  );

  const openSocietyUserBreakdown = useCallback(
    (customerId: string) => {
      navigation.navigate('SocietyUserTripBreakdown', {
        customerId,
        year: selectedYear,
        monthIndex0: selectedMonth,
      });
    },
    [navigation, selectedYear, selectedMonth],
  );

  const filteredTrips = useMemo(
    () => filterTripsByPeriod(trips, 'month', selectedYear, selectedMonth),
    [trips, selectedYear, selectedMonth],
  );

  const availableSocietyUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of filteredTrips) {
      if (t.customerId) ids.add(t.customerId);
    }
    return [...ids].sort((a, b) => a.localeCompare(b));
  }, [filteredTrips]);

  useEffect(() => {
    if (selectedSocietyUserId === 'All') return;
    if (!availableSocietyUserIds.includes(selectedSocietyUserId)) setSelectedSocietyUserId('All');
  }, [availableSocietyUserIds, selectedSocietyUserId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSocietyUsers() {
      const ids = [...new Set(filteredTrips.map((t) => t.customerId))];
      if (ids.length === 0) {
        setSocietyUsersById(new Map());
        return;
      }
      try {
        const map = await SocietyTripUsersService.getUsersLiteByIds(ids);
        if (cancelled) return;
        setSocietyUsersById(map);
      } catch {
        if (cancelled) return;
        setSocietyUsersById(new Map());
      }
    }
    loadSocietyUsers();
    return () => {
      cancelled = true;
    };
  }, [filteredTrips]);

  const userFilteredTrips = useMemo(() => {
    if (selectedSocietyUserId === 'All') return filteredTrips;
    return filteredTrips.filter((t) => t.customerId === selectedSocietyUserId);
  }, [filteredTrips, selectedSocietyUserId]);

  const societyUserLabelById = useCallback(
    (id: string) => {
      const u = societyUsersById.get(id);
      if (u) return u.phone ? `${u.name} • ${u.phone}` : u.name;
      return id.length > 8 ? `${id.slice(0, 8)}…` : id;
    },
    [societyUsersById],
  );

  const monthPeriodKey = useMemo(
    () =>
      SocietyPaymentPeriodsService.buildMonthPeriodKey(
        selectedYear,
        selectedMonth,
        user?.role === 'admin' ? (user as { businessName?: string }).businessName : undefined,
      ),
    [selectedYear, selectedMonth, user?.role, user],
  );

  const loadPaymentPeriodCompletions = useCallback(async () => {
    if (!canLoad) {
      setPaymentPeriodLoad('idle');
      setCompletedAtByCustomerId(new Map());
      return;
    }

    const customerIds = [...new Set(filteredTrips.map((t) => t.customerId))];
    if (customerIds.length === 0) {
      setPaymentPeriodLoad('ready');
      setCompletedAtByCustomerId(new Map());
      return;
    }

    setPaymentPeriodLoad((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const fallbackPeriodKey = SocietyPaymentPeriodsService.buildMonthPeriodKey(selectedYear, selectedMonth);
      const map = await SocietyPaymentPeriodsService.listCompletedAtByCustomerForPeriod(
        monthPeriodKey,
        customerIds,
        monthPeriodKey !== fallbackPeriodKey ? { fallbackPeriodKey } : undefined,
      );
      setCompletedAtByCustomerId(map);
      setPaymentPeriodLoad('ready');
    } catch {
      setCompletedAtByCustomerId(new Map());
      setPaymentPeriodLoad('error');
    }
  }, [canLoad, filteredTrips, monthPeriodKey, selectedMonth, selectedYear]);

  const periodLabel = useMemo(
    () => `${months[selectedMonth]} ${selectedYear}`,
    [months, selectedMonth, selectedYear],
  );

  useEffect(() => {
    setPaymentPeriodLoad('idle');
    setCompletedAtByCustomerId(new Map());
  }, [monthPeriodKey]);

  useEffect(() => {
    loadPaymentPeriodCompletions();
  }, [loadPaymentPeriodCompletions]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      loadTrips()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [loadTrips]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTrips(), loadPaymentPeriodCompletions()]);
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, [loadTrips, loadPaymentPeriodCompletions]);

  const maxTripCreatedAtByCustomerId = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filteredTrips) {
      const ts = t.createdAt.getTime();
      const prev = m.get(t.customerId);
      if (prev === undefined || ts > prev) m.set(t.customerId, ts);
    }
    return m;
  }, [filteredTrips]);

  const paymentSettledByCustomerId = useMemo(() => {
    const out = new Map<string, boolean>();
    for (const id of availableSocietyUserIds) {
      const completedAt = completedAtByCustomerId.get(id);
      const maxTs = maxTripCreatedAtByCustomerId.get(id);
      if (!completedAt || maxTs === undefined) {
        out.set(id, false);
      } else {
        out.set(id, maxTs <= completedAt.getTime());
      }
    }
    return out;
  }, [availableSocietyUserIds, completedAtByCustomerId, maxTripCreatedAtByCustomerId]);

  const paymentStatusSuffix = useMemo(() => {
    const targetIds =
      selectedSocietyUserId === 'All' ? availableSocietyUserIds : [selectedSocietyUserId];
    if (targetIds.length === 0) return ' • No societies in this month';

    const allSettled = targetIds.every((id) => paymentSettledByCustomerId.get(id) === true);
    if (allSettled) return ' • Payment completed';

    if (paymentPeriodLoad === 'loading' && completedAtByCustomerId.size === 0) {
      return ' • Checking…';
    }
    if (paymentPeriodLoad === 'error') return ' • Status unavailable';

    if (selectedSocietyUserId === 'All') {
      const completed = targetIds.filter((id) => paymentSettledByCustomerId.get(id)).length;
      return ` • Pending (${completed}/${targetIds.length} societies paid • ${userFilteredTrips.length} trips)`;
    }
    return ' • Payment pending';
  }, [
    selectedSocietyUserId,
    availableSocietyUserIds,
    paymentSettledByCustomerId,
    paymentPeriodLoad,
    completedAtByCustomerId,
    userFilteredTrips.length,
  ]);

  const tripsByTankerSize = useMemo(
    () => buildTankerSizeBreakdown(userFilteredTrips, undefined),
    [userFilteredTrips],
  );

  const anyTripHasAmount = useMemo(
    () => userFilteredTrips.some((t) => t.tankerAmount != null && Number.isFinite(t.tankerAmount)),
    [userFilteredTrips],
  );

  const grandTotalAmount = useMemo(
    () =>
      userFilteredTrips.reduce((sum, t) => {
        if (t.tankerAmount != null && Number.isFinite(t.tankerAmount)) return sum + t.tankerAmount;
        return sum;
      }, 0),
    [userFilteredTrips],
  );

  const renderTankerSizeBreakdown = (showTotal: boolean) => {
    if (userFilteredTrips.length === 0) {
      return (
        <Typography variant="caption" style={styles.summaryEmptyText}>
          No trips in this period
        </Typography>
      );
    }

    return (
      <>
        <View style={styles.summaryTableHeader}>
          <View style={styles.summaryColLeft}>
            <Typography variant="caption" style={styles.summaryTableHeaderText}>
              Size
            </Typography>
          </View>
          <View style={styles.summaryColCenter}>
            <Typography variant="caption" style={styles.summaryTableHeaderText}>
              Amount
            </Typography>
          </View>
          <View style={styles.summaryColRight}>
            <Typography variant="caption" style={styles.summaryTableHeaderText}>
              Trips
            </Typography>
          </View>
        </View>
        {tripsByTankerSize.map(({ liters, count, amountSum, tripsWithAmount }) => (
          <View key={liters} style={styles.summaryRow}>
            <View style={styles.summaryColLeft}>
              <Typography variant="body" style={styles.summaryCellLeft}>
                {liters.toLocaleString()}L
              </Typography>
            </View>
            <View style={styles.summaryColCenter}>
              <Typography variant="body" style={styles.summaryCellCenter}>
                {count > 0 && tripsWithAmount > 0 ? `₹${amountSum.toLocaleString()}` : '—'}
              </Typography>
            </View>
            <View style={styles.summaryColRight}>
              <Typography variant="caption" style={styles.summaryCellRight}>
                {count} {count === 1 ? 'trip' : 'trips'}
              </Typography>
            </View>
          </View>
        ))}
        {showTotal ? (
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <View style={styles.summaryColLeft}>
              <Typography variant="body" style={[styles.summaryCellLeft, styles.summaryTotalStrong]}>
                Total
              </Typography>
            </View>
            <View style={styles.summaryColCenter}>
              <Typography variant="body" style={[styles.summaryCellCenter, styles.summaryTotalStrong]}>
                {anyTripHasAmount ? `₹${grandTotalAmount.toLocaleString()}` : '—'}
              </Typography>
            </View>
            <View style={styles.summaryColRight}>
              <Typography variant="caption" style={styles.summaryCellRight}>
                {userFilteredTrips.length} {userFilteredTrips.length === 1 ? 'trip' : 'trips'}
              </Typography>
            </View>
          </View>
        ) : null}
      </>
    );
  };

  if (isLoading && trips.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Typography variant="body" style={styles.loadingText}>
            Loading trip details…
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
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              Trip details
            </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Society billing periods — bulk settlement tracking (not per-delivery Razorpay)
          </Typography>
          <Typography variant="caption" style={[styles.subtitle, { opacity: 0.75, marginTop: 4 }]}>
            Per-delivery Razorpay payments are collected by drivers and appear under Bookings / Reports.
          </Typography>
          </View>
        </View>

        <MonthYearFilterRow
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />

        <View style={styles.summaryCardWrap}>
          <View style={styles.societyUserFilterContainer}>
            <TouchableOpacity
              style={styles.societyUserFilterButton}
              onPress={() => setSocietyUserDropdownVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select society user"
            >
              <Typography variant="body" style={styles.societyUserFilterButtonText} numberOfLines={1}>
                {selectedSocietyUserId === 'All'
                  ? 'All society users'
                  : societyUserLabelById(selectedSocietyUserId)}
              </Typography>
              {selectedSocietyUserId !== 'All' &&
              paymentSettledByCustomerId.get(selectedSocietyUserId) ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.societyUserPaidIcon} />
              ) : null}
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Modal
            visible={societyUserDropdownVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSocietyUserDropdownVisible(false)}
            statusBarTranslucent
          >
            <TouchableOpacity
              style={styles.dropdownOverlay}
              activeOpacity={1}
              onPress={() => setSocietyUserDropdownVisible(false)}
            >
              <View style={styles.dropdownContent}>
                <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                  {['All', ...availableSocietyUserIds].map((id) => {
                    const active = selectedSocietyUserId === id;
                    const showPaid = id !== 'All' && paymentSettledByCustomerId.get(id) === true;
                    const showBreakdownAction = id !== 'All';
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                        onPress={() => {
                          setSelectedSocietyUserId(id);
                          setSocietyUserDropdownVisible(false);
                        }}
                        activeOpacity={0.7}
                        accessibilityState={{ selected: active }}
                      >
                        <View style={styles.dropdownOptionLabelRow}>
                          {showPaid ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={colors.success}
                              style={styles.dropdownPaidIcon}
                            />
                          ) : null}
                          <Typography
                            variant="body"
                            style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}
                            numberOfLines={1}
                          >
                            {id === 'All' ? 'All society users' : societyUserLabelById(id)}
                          </Typography>
                        </View>
                        {active ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
                        {showBreakdownAction ? (
                          <TouchableOpacity
                            style={styles.dropdownBreakdownButton}
                            onPress={() => {
                              setSelectedSocietyUserId(id);
                              setSocietyUserDropdownVisible(false);
                              openSocietyUserBreakdown(id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="View breakdown"
                          >
                            <Typography variant="caption" style={styles.dropdownBreakdownButtonText}>
                              View
                            </Typography>
                            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                          </TouchableOpacity>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
          <Card
            padding="medium"
            style={styles.summaryCard}
            onPress={() =>
              selectedSocietyUserId !== 'All'
                ? openSocietyUserBreakdown(selectedSocietyUserId)
                : setTankerBreakdownVisible(true)
            }
          >
            <View style={styles.summaryCardHeaderRow}>
              <Typography variant="caption" style={styles.summaryHeading}>
                Trips by tanker size
              </Typography>
              <Ionicons
                name={selectedSocietyUserId !== 'All' ? 'chevron-forward' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <Typography variant="caption" style={styles.meta}>
              {selectedSocietyUserId !== 'All'
                ? 'Tap to view trips and pending amount'
                : 'Tap to view breakdown'}
            </Typography>
          </Card>
        </View>

        <FlatList
          style={styles.tripList}
          data={userFilteredTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={userFilteredTrips.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
              <Typography variant="body" style={styles.emptyTitle}>
                {trips.length === 0 ? 'No trips yet' : 'No trips for this society user in this period'}
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                {trips.length === 0
                  ? 'Trips will appear here once society users log trips for your agency.'
                  : 'Try another month or year.'}
              </Typography>
            </View>
          }
          renderItem={({ item }) => {
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
                      <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                        {item.agencyName}
                      </Typography>
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

                    <View style={styles.tripInfo}>
                      <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                        {item.agencyName}
                      </Typography>
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
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      </View>

      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
      />

      <Modal
        visible={tankerBreakdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTankerBreakdownVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.breakdownModalRoot}>
          <Pressable
            style={styles.breakdownModalBackdropFill}
            onPress={() => setTankerBreakdownVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss breakdown"
          />
          <View style={styles.breakdownModalSheet}>
            <View style={styles.breakdownModalHeader}>
              <View style={styles.breakdownModalTitleWrap}>
                <Typography variant="h2" style={styles.breakdownModalTitle}>
                  Trips by tanker size
                </Typography>
                <Typography variant="caption" style={styles.breakdownModalSubtitle}>
                  {`Payment status for ${periodLabel}`}
                  {selectedSocietyUserId === 'All' ? '' : ` • Society user: ${societyUserLabelById(selectedSocietyUserId)}`}
                  {paymentStatusSuffix}
                </Typography>
              </View>
              <TouchableOpacity
                onPress={() => setTankerBreakdownVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close breakdown"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.breakdownModalScroll}
              contentContainerStyle={styles.breakdownModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderTankerSizeBreakdown(true)}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Image
                source={{ uri: photoPreviewUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
              />
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
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    zIndex: 2,
  },
  societyUserFilterContainer: {
    marginBottom: 10,
  },
  societyUserFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  societyUserFilterButtonText: {
    flex: 1,
    marginRight: 10,
    color: colors.text,
    fontWeight: '600',
  },
  societyUserPaidIcon: {
    marginRight: 6,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dropdownContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    width: '100%',
    maxWidth: 420,
    maxHeight: 420,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: {
    width: '100%',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: colors.background,
  },
  dropdownOptionLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minWidth: 0,
  },
  dropdownPaidIcon: {
    marginRight: 8,
  },
  dropdownBreakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  dropdownBreakdownButtonText: {
    color: colors.accent,
    fontWeight: '600',
    marginRight: 2,
  },
  dropdownOptionText: {
    flex: 1,
    marginRight: 0,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  summaryCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryEmptyText: {
    color: colors.textSecondary,
    marginTop: 4,
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
  tripList: {
    flex: 1,
  },
  summaryCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeading: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.textSecondary,
    paddingHorizontal: 16,
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
  agencyName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 2,
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
  breakdownModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  breakdownModalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  breakdownModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    maxHeight: '85%',
    zIndex: 1,
    elevation: 8,
  },
  breakdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingRight: 4,
  },
  breakdownModalTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  breakdownModalTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  breakdownModalSubtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  breakdownModalScroll: {
    maxHeight: 480,
  },
  breakdownModalScrollContent: {
    paddingBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryColLeft: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  summaryColCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryColRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  summaryCellLeft: {
    color: colors.text,
    fontWeight: '600',
  },
  summaryCellCenter: {
    color: colors.accent,
    fontWeight: '600',
  },
  summaryCellRight: {
    color: colors.textSecondary,
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
});
}


export default TripDetailsScreen;

