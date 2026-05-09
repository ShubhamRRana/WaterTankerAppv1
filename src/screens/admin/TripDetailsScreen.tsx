import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import { Typography, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';
import { SocietyTrip, SocietyTripService } from '../../services/societyTrip.service';
import { SocietyPaymentPeriodsService } from '../../services/societyPaymentPeriods.service';
import { SocietyTripUsersService } from '../../services/societyTripUsers.service';
import { formatDateTime } from '../../utils/dateUtils';

type TripDetailsNavigationProp = StackNavigationProp<AdminStackParamList, 'TripDetails'>;

interface Props {
  navigation: TripDetailsNavigationProp;
}

function filterTripsByPeriod(
  list: SocietyTrip[],
  periodType: 'month' | 'year',
  year: number,
  month: number,
): SocietyTrip[] {
  if (periodType === 'year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return list.filter((t) => {
      const d = new Date(t.scheduledAt);
      return d >= start && d <= end;
    });
  }
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return list.filter((t) => {
    const d = new Date(t.scheduledAt);
    return d >= monthStart && d <= monthEnd;
  });
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

  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSocietyUserId, setSelectedSocietyUserId] = useState<string>('All');
  const [societyUserDropdownVisible, setSocietyUserDropdownVisible] = useState(false);
  const [societyUsersById, setSocietyUsersById] = useState<Map<string, { id: string; name: string; phone: string | null }>>(
    new Map(),
  );

  const [paymentPeriodLoad, setPaymentPeriodLoad] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [completedAtByCustomerId, setCompletedAtByCustomerId] = useState<Map<string, Date>>(() => new Map());

  const periodTypeGliderAnim = useRef(new Animated.Value(0)).current;
  const monthGliderAnim = useRef(new Animated.Value(0)).current;
  const yearGliderAnim = useRef(new Animated.Value(0)).current;

  const [periodTypeOptionWidth, setPeriodTypeOptionWidth] = useState(0);
  const [monthOptionWidth, setMonthOptionWidth] = useState(0);
  const [yearOptionWidth, setYearOptionWidth] = useState(0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  const canLoad = user?.role === 'admin' && !!user.id;

  const loadTrips = useCallback(async () => {
    if (!canLoad) return;
    const list = await SocietyTripService.listTripsForAdmin(
      user.id,
      user.role === 'admin' ? user.businessName : undefined,
    );
    setTrips(list);
  }, [canLoad, user?.id, user?.role, (user as any)?.businessName]);

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

  useEffect(() => {
    if (periodTypeOptionWidth > 0) {
      Animated.spring(periodTypeGliderAnim, {
        toValue: periodType === 'month' ? 0 : periodTypeOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [periodType, periodTypeOptionWidth, periodTypeGliderAnim]);

  useEffect(() => {
    if (monthOptionWidth > 0) {
      Animated.spring(monthGliderAnim, {
        toValue: selectedMonth * monthOptionWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedMonth, monthOptionWidth, monthGliderAnim]);

  useEffect(() => {
    if (yearOptionWidth > 0) {
      const yearIndex = availableYears.indexOf(selectedYear);
      Animated.spring(yearGliderAnim, {
        toValue: yearIndex >= 0 ? yearIndex * yearOptionWidth : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [selectedYear, yearOptionWidth, yearGliderAnim, availableYears]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTrips();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, [loadTrips]);

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

  const filteredTrips = useMemo(
    () => filterTripsByPeriod(trips, periodType, selectedYear, selectedMonth),
    [trips, periodType, selectedYear, selectedMonth],
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

  const monthPeriodKey = useMemo(() => `m:${selectedYear}-${selectedMonth}`, [selectedYear, selectedMonth]);

  const periodLabel = useMemo(() => {
    if (periodType === 'year') return `${selectedYear}`;
    return `${months[selectedMonth]} ${selectedYear}`;
  }, [months, periodType, selectedMonth, selectedYear]);

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentPeriodCompletions() {
      if (!canLoad) {
        setPaymentPeriodLoad('idle');
        setCompletedAtByCustomerId(new Map());
        return;
      }

      if (periodType !== 'month') {
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

      setPaymentPeriodLoad('loading');
      try {
        const map = await SocietyPaymentPeriodsService.listCompletedAtByCustomerForPeriod(monthPeriodKey, customerIds);
        if (cancelled) return;
        setCompletedAtByCustomerId(map);
        setPaymentPeriodLoad('ready');
      } catch {
        if (cancelled) return;
        setCompletedAtByCustomerId(new Map());
        setPaymentPeriodLoad('error');
      }
    }

    loadPaymentPeriodCompletions();

    return () => {
      cancelled = true;
    };
  }, [canLoad, monthPeriodKey, periodType, filteredTrips]);

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
    if (periodType !== 'month') {
      for (const id of availableSocietyUserIds) out.set(id, false);
      return out;
    }
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
  }, [periodType, availableSocietyUserIds, completedAtByCustomerId, maxTripCreatedAtByCustomerId]);

  const paymentModalStats = useMemo(() => {
    if (periodType !== 'month') return { totalSocieties: 0, completedSocieties: 0 };
    const ids =
      selectedSocietyUserId === 'All' ? availableSocietyUserIds : [selectedSocietyUserId];
    let completed = 0;
    for (const id of ids) {
      if (paymentSettledByCustomerId.get(id)) completed += 1;
    }
    return { totalSocieties: ids.length, completedSocieties: completed };
  }, [periodType, selectedSocietyUserId, availableSocietyUserIds, paymentSettledByCustomerId]);

  const tripsByTankerSize = useMemo(() => {
    const bucket = new Map<number, { count: number; amountSum: number; tripsWithAmount: number }>();
    for (const t of userFilteredTrips) {
      const prev = bucket.get(t.tankerSizeLiters) ?? { count: 0, amountSum: 0, tripsWithAmount: 0 };
      prev.count += 1;
      if (t.tankerAmount != null && Number.isFinite(t.tankerAmount)) {
        prev.amountSum += t.tankerAmount;
        prev.tripsWithAmount += 1;
      }
      bucket.set(t.tankerSizeLiters, prev);
    }
    const allLiters = [...new Set(bucket.keys())].sort((a, b) => a - b);
    return allLiters.map((liters) => {
      const b = bucket.get(liters);
      return {
        liters,
        count: b?.count ?? 0,
        amountSum: b?.amountSum ?? 0,
        tripsWithAmount: b?.tripsWithAmount ?? 0,
      };
    });
  }, [userFilteredTrips]);

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

  const subtitle = useMemo(() => {
    if (!canLoad) return 'Sign in as an admin to view trips';
    const userSuffix =
      selectedSocietyUserId === 'All' ? '' : ` • ${societyUserLabelById(selectedSocietyUserId)}`;
    return `${userFilteredTrips.length} ${userFilteredTrips.length === 1 ? 'trip' : 'trips'} in this period${userSuffix}`;
  }, [canLoad, societyUserLabelById, selectedSocietyUserId, userFilteredTrips.length]);

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
              {subtitle}
            </Typography>
          </View>
        </View>

        <View style={styles.periodTypeToggle}>
          <View style={styles.glassRadioGroup}>
            <TouchableOpacity
              style={styles.glassRadioOption}
              onPress={() => setPeriodType('month')}
              activeOpacity={0.8}
              onLayout={(e) => {
                if (periodTypeOptionWidth === 0) {
                  setPeriodTypeOptionWidth(e.nativeEvent.layout.width);
                }
              }}
            >
              <Typography
                variant="caption"
                style={[styles.glassRadioLabel, periodType === 'month' && styles.glassRadioLabelActive]}
              >
                Month
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.glassRadioOption}
              onPress={() => setPeriodType('year')}
              activeOpacity={0.8}
            >
              <Typography
                variant="caption"
                style={[styles.glassRadioLabel, periodType === 'year' && styles.glassRadioLabelActive]}
              >
                Year
              </Typography>
            </TouchableOpacity>
            {periodTypeOptionWidth > 0 ? (
              <Animated.View
                style={[
                  styles.glassGlider,
                  { width: periodTypeOptionWidth, transform: [{ translateX: periodTypeGliderAnim }] },
                ]}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.filterContainer}>
          {periodType === 'year' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthSelectorContent}
              style={styles.monthSelector}
            >
              <View style={styles.glassRadioGroup}>
                {availableYears.map((year, index) => (
                  <TouchableOpacity
                    key={year}
                    style={styles.glassRadioOption}
                    onPress={() => setSelectedYear(year)}
                    activeOpacity={0.8}
                    onLayout={(e) => {
                      if (yearOptionWidth === 0 && index === 0) setYearOptionWidth(e.nativeEvent.layout.width);
                    }}
                  >
                    <Typography variant="caption" style={styles.glassRadioLabel}>
                      {year}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {yearOptionWidth > 0 ? (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      { width: yearOptionWidth, transform: [{ translateX: yearGliderAnim }] },
                    ]}
                  />
                ) : null}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthSelectorContent}
              style={styles.monthSelector}
            >
              <View style={styles.glassRadioGroup}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={styles.glassRadioOption}
                    onPress={() => setSelectedMonth(index)}
                    activeOpacity={0.8}
                    onLayout={(e) => {
                      if (monthOptionWidth === 0 && index === 0) setMonthOptionWidth(e.nativeEvent.layout.width);
                    }}
                  >
                    <Typography variant="caption" style={styles.glassRadioLabel}>
                      {month}
                    </Typography>
                  </TouchableOpacity>
                ))}
                {monthOptionWidth > 0 ? (
                  <Animated.View
                    style={[
                      styles.glassGlider,
                      { width: monthOptionWidth, transform: [{ translateX: monthGliderAnim }] },
                    ]}
                  />
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>

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
              {periodType === 'month' &&
              selectedSocietyUserId !== 'All' &&
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
                    const showPaid =
                      periodType === 'month' && id !== 'All' && paymentSettledByCustomerId.get(id) === true;
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
            onPress={() => setTankerBreakdownVisible(true)}
          >
            <View style={styles.summaryCardHeaderRow}>
              <Typography variant="caption" style={styles.summaryHeading}>
                Trips by tanker size
              </Typography>
              <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
            </View>
            <Typography variant="caption" style={styles.meta}>
              Tap to view breakdown
            </Typography>
          </Card>
        </View>

        <FlatList
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
                  : 'Try another month or year, or switch between Month and Year.'}
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
                  {periodType === 'month' ? `Payment status for ${periodLabel}` : `Period: ${periodLabel}`}
                  {selectedSocietyUserId === 'All' ? '' : ` • Society user: ${societyUserLabelById(selectedSocietyUserId)}`}
                  {periodType === 'month' ? (
                    paymentPeriodLoad === 'ready' ? (
                      paymentModalStats.totalSocieties === 0 ? (
                        ' • No societies in this month'
                      ) : paymentModalStats.completedSocieties === paymentModalStats.totalSocieties ? (
                        ' • Payment completed'
                      ) : (
                        ` • Pending (${paymentModalStats.completedSocieties}/${paymentModalStats.totalSocieties} societies paid • ${userFilteredTrips.length} trips)`
                      )
                    ) : paymentPeriodLoad === 'loading' ? (
                      ' • Checking…'
                    ) : paymentPeriodLoad === 'error' ? (
                      ' • Status unavailable'
                    ) : (
                      ''
                    )
                  ) : (
                    ''
                  )}
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

              {userFilteredTrips.length > 0 ? (
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
  periodTypeToggle: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingTop: UI_CONFIG.spacing.sm,
    paddingBottom: UI_CONFIG.spacing.sm,
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.sm,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: colors.overlaySubtle,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  glassRadioOption: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 12.8,
    paddingHorizontal: 25.6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glassRadioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text,
  },
  glassRadioLabelActive: {
    color: colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
  },
  summaryCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  },
  breakdownModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    maxHeight: '85%',
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
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
    marginTop: 4,
    paddingTop: 10,
  },
  summaryTotalStrong: {
    fontWeight: '700',
  },
});
}


export default TripDetailsScreen;

