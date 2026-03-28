import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Linking,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Typography, AdminMenuDrawer } from '../../components/common';
import type { AdminRoute } from '../../components/common/AdminMenuDrawer';
import { SocietyTrip } from '../../types';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { BOOKING_CONFIG, UI_CONFIG } from '../../constants/config';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';
import { SocietyTripService } from '../../services/societyTrip.service';

type TripDetailsNav = StackNavigationProp<AdminStackParamList, 'TripDetails'>;

function getScheduledRange(
  periodType: 'month' | 'year',
  year: number,
  month: number,
): { from: Date; to: Date } {
  if (periodType === 'month') {
    const from = new Date(year, month, 1, 0, 0, 0, 0);
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }
  const from = new Date(year, 0, 1, 0, 0, 0, 0);
  const to = new Date(year, 11, 31, 23, 59, 59, 999);
  return { from, to };
}

const TripDetailsScreen: React.FC = () => {
  const navigation = useNavigation<TripDetailsNav>();
  const { logout } = useAuthStore();
  const [rawTrips, setRawTrips] = useState<SocietyTrip[]>([]);
  const [userLabels, setUserLabels] = useState<Map<string, { name: string; phone: string | null }>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [societyFilter, setSocietyFilter] = useState<'all' | string>('all');

  const periodTypeGliderAnim = useRef(new Animated.Value(0)).current;
  const monthGliderAnim = useRef(new Animated.Value(0)).current;
  const yearGliderAnim = useRef(new Animated.Value(0)).current;

  const [periodTypeOptionWidth, setPeriodTypeOptionWidth] = useState(0);
  const [monthOptionWidth, setMonthOptionWidth] = useState(0);
  const [yearOptionWidth, setYearOptionWidth] = useState(0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };
  const availableYears = getAvailableYears();

  const loadTrips = useCallback(async () => {
    const { from, to } = getScheduledRange(periodType, selectedYear, selectedMonth);
    const list = await SocietyTripService.listTripsForAdmin({
      scheduledFrom: from,
      scheduledTo: to,
    });
    setRawTrips(list);
    const ids = [...new Set(list.map((t) => t.customerId))];
    const labels = await SocietyTripService.getUserDisplayByIds(ids);
    setUserLabels(labels);
  }, [periodType, selectedYear, selectedMonth]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadTrips()
      .catch((e) => {
        errorLogger.medium('Failed to load society trips (admin)', e);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTrips]);

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

  useEffect(() => {
    const ids = new Set(rawTrips.map((t) => t.customerId));
    if (societyFilter !== 'all' && !ids.has(societyFilter)) {
      setSocietyFilter('all');
    }
  }, [rawTrips, societyFilter]);

  const displayTrips = useMemo(() => {
    if (societyFilter === 'all') return rawTrips;
    return rawTrips.filter((t) => t.customerId === societyFilter);
  }, [rawTrips, societyFilter]);

  const societyChips = useMemo(() => {
    const ids = [...new Set(rawTrips.map((t) => t.customerId))];
    const items = ids
      .map((id) => ({
        id,
        label: userLabels.get(id)?.name ?? id.slice(0, 8),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return items;
  }, [rawTrips, userLabels]);

  const tripsByTankerSize = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of displayTrips) {
      counts.set(t.tankerSizeLiters, (counts.get(t.tankerSizeLiters) ?? 0) + 1);
    }
    const defaultSizes = BOOKING_CONFIG.defaultTankerSizes.map((d) => d.size);
    const allLiters = [...new Set([...defaultSizes, ...counts.keys()])].sort((a, b) => a - b);
    return allLiters.map((liters) => ({ liters, count: counts.get(liters) ?? 0 }));
  }, [displayTrips]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTrips();
    } catch {
      Alert.alert('Error', 'Could not load trip details. Try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'TripDetails') return;
    navigation.navigate(route);
  };

  const openPhoto = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open photo.');
    });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Typography variant="h2" style={styles.title}>
              Trip details
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              {displayTrips.length} {displayTrips.length === 1 ? 'trip' : 'trips'} in view
            </Typography>
          </View>
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
              variant="body"
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
              variant="body"
              style={[styles.glassRadioLabel, periodType === 'year' && styles.glassRadioLabelActive]}
            >
              Year
            </Typography>
          </TouchableOpacity>
          {periodTypeOptionWidth > 0 && (
            <Animated.View
              style={[
                styles.glassGlider,
                {
                  width: periodTypeOptionWidth,
                  transform: [{ translateX: periodTypeGliderAnim }],
                },
              ]}
            />
          )}
        </View>
      </View>

      {periodType === 'month' && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            <View style={styles.glassRadioGroup}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.glassRadioOption}
                  onPress={() => setSelectedMonth(index)}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    if (monthOptionWidth === 0 && index === 0) {
                      setMonthOptionWidth(e.nativeEvent.layout.width);
                    }
                  }}
                >
                  <Typography
                    variant="body"
                    style={[
                      styles.glassRadioLabel,
                      selectedMonth === index && styles.glassRadioLabelActive,
                    ]}
                  >
                    {month}
                  </Typography>
                </TouchableOpacity>
              ))}
              {monthOptionWidth > 0 && (
                <Animated.View
                  style={[
                    styles.glassGlider,
                    {
                      width: monthOptionWidth,
                      transform: [{ translateX: monthGliderAnim }],
                    },
                  ]}
                />
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {periodType === 'year' && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            <View style={styles.glassRadioGroup}>
              {availableYears.map((year, index) => (
                <TouchableOpacity
                  key={year}
                  style={styles.glassRadioOption}
                  onPress={() => setSelectedYear(year)}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    if (yearOptionWidth === 0 && index === 0) {
                      setYearOptionWidth(e.nativeEvent.layout.width);
                    }
                  }}
                >
                  <Typography
                    variant="body"
                    style={[
                      styles.glassRadioLabel,
                      selectedYear === year && styles.glassRadioLabelActive,
                    ]}
                  >
                    {year}
                  </Typography>
                </TouchableOpacity>
              ))}
              {yearOptionWidth > 0 && (
                <Animated.View
                  style={[
                    styles.glassGlider,
                    {
                      width: yearOptionWidth,
                      transform: [{ translateX: yearGliderAnim }],
                    },
                  ]}
                />
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {societyChips.length > 0 && (
        <View style={styles.societySection}>
          <Typography variant="caption" style={styles.societySectionLabel}>
            Society
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.societyChipsRow}
          >
            <TouchableOpacity
              style={[styles.societyChip, societyFilter === 'all' && styles.societyChipActive]}
              onPress={() => setSocietyFilter('all')}
              activeOpacity={0.85}
            >
              <Typography
                variant="body"
                style={[styles.societyChipText, societyFilter === 'all' && styles.societyChipTextActive]}
              >
                All
              </Typography>
            </TouchableOpacity>
            {societyChips.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.societyChip, societyFilter === c.id && styles.societyChipActive]}
                onPress={() => setSocietyFilter(c.id)}
                activeOpacity={0.85}
              >
                <Typography
                  variant="body"
                  numberOfLines={1}
                  style={[styles.societyChipText, societyFilter === c.id && styles.societyChipTextActive]}
                >
                  {c.label}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Card style={styles.summaryCard}>
        <Typography variant="caption" style={styles.summaryHeading}>
          Trips by tanker size
        </Typography>
        {tripsByTankerSize.map(({ liters, count }) => (
          <View key={liters} style={styles.summaryRow}>
            <Typography variant="body" style={styles.summarySize}>
              {liters.toLocaleString()}L
            </Typography>
            <Typography variant="body" style={styles.summaryCount}>
              {count} {count === 1 ? 'trip' : 'trips'}
            </Typography>
          </View>
        ))}
      </Card>
    </>
  );

  if (isLoading && rawTrips.length === 0) {
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
      <FlatList
        style={styles.listFlex}
        data={displayTrips}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={
          displayTrips.length === 0 ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={UI_CONFIG.colors.accent} />
        }
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="body" style={styles.emptyTitle}>
              No trips in this period
            </Typography>
            <Typography variant="caption" style={styles.emptySubtext}>
              Try another month or year, or clear the society filter.
            </Typography>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.tripCard}>
            <View style={styles.tripRow}>
              <TouchableOpacity
                onPress={() => openPhoto(item.photoUrl)}
                activeOpacity={0.85}
                style={styles.thumbWrap}
              >
                <Image source={{ uri: item.photoUrl }} style={styles.thumb} resizeMode="cover" />
                <View style={styles.thumbHint}>
                  <Ionicons name="expand-outline" size={14} color={UI_CONFIG.colors.textLight} />
                </View>
              </TouchableOpacity>
              <View style={styles.tripInfo}>
                <Typography variant="body" style={styles.agencyName} numberOfLines={2}>
                  {item.agencyName}
                </Typography>
                <Typography variant="caption" style={styles.meta}>
                  {userLabels.get(item.customerId)?.name ?? 'Society'}{' '}
                  {userLabels.get(item.customerId)?.phone
                    ? `· ${userLabels.get(item.customerId)!.phone}`
                    : ''}
                </Typography>
                <Typography variant="caption" style={styles.meta}>
                  {formatDateTime(item.scheduledAt)}
                </Typography>
                <Typography variant="caption" style={styles.meta}>
                  {item.tankerSizeLiters}L tanker
                </Typography>
              </View>
            </View>
          </Card>
        )}
      />

      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="TripDetails"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  listFlex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  periodTypeToggle: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelector: {
    paddingVertical: UI_CONFIG.spacing.md,
  },
  monthSelectorContent: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
  },
  glassRadioGroup: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: UI_CONFIG.colors.shadow,
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
    color: UI_CONFIG.colors.text,
  },
  glassRadioLabelActive: {
    color: UI_CONFIG.colors.text,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    zIndex: 1,
    backgroundColor: UI_CONFIG.colors.accent,
    shadowColor: UI_CONFIG.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
    height: '100%',
  },
  societySection: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingBottom: UI_CONFIG.spacing.sm,
  },
  societySectionLabel: {
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  societyChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  societyChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    marginRight: 8,
    maxWidth: 200,
  },
  societyChipActive: {
    backgroundColor: UI_CONFIG.colors.accent,
    borderColor: UI_CONFIG.colors.accent,
  },
  societyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
  },
  societyChipTextActive: {
    color: UI_CONFIG.colors.background,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryHeading: {
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_CONFIG.colors.border,
  },
  summarySize: {
    color: UI_CONFIG.colors.text,
    fontWeight: '600',
  },
  summaryCount: {
    color: UI_CONFIG.colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    padding: 24,
  },
  tripCard: {
    marginBottom: 12,
    padding: 14,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbWrap: {
    position: 'relative',
    marginRight: 14,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.colors.surfaceLight,
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
  agencyName: {
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 6,
  },
  meta: {
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
  },
  emptyTitle: {
    marginTop: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    paddingHorizontal: 16,
  },
});

export default TripDetailsScreen;
